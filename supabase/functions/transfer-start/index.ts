import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { maskEmail, sha256Hex } from "../_shared/mask.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Giriş yapmalısınız" }, 401);

  const anon = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData, error: userError } = await anon.auth.getUser();
  if (userError || !userData.user) return json({ error: "Geçersiz oturum" }, 401);
  const user = userData.user;

  let body: { certificate_id?: unknown; to_email?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Geçersiz istek" }, 400);
  }

  const certificateId = typeof body.certificate_id === "string" ? body.certificate_id : "";
  const toEmail =
    typeof body.to_email === "string" ? body.to_email.trim().toLowerCase() : "";

  if (!/^[0-9a-f-]{36}$/i.test(certificateId)) return json({ error: "Geçersiz ürün" }, 400);
  if (!EMAIL_RE.test(toEmail) || toEmail.length > 255)
    return json({ error: "Geçerli bir e-posta adresi girin" }, 400);
  if (toEmail === (user.email ?? "").toLowerCase())
    return json({ error: "Ürünü kendinize transfer edemezsiniz" }, 400);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: cert } = await admin
    .from("certificates")
    .select("id, auth_code, product_name, owner_user_id")
    .eq("id", certificateId)
    .maybeSingle();

  if (!cert || cert.owner_user_id !== user.id)
    return json({ error: "Bu ürünün sahibi değilsiniz" }, 403);

  // Invalidate previous pending requests for this certificate.
  await admin
    .from("transfer_requests")
    .update({ status: "cancelled" })
    .eq("certificate_id", cert.id)
    .eq("status", "pending");

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const codeHash = await sha256Hex(code);

  const { data: request, error: insertError } = await admin
    .from("transfer_requests")
    .insert({
      certificate_id: cert.id,
      from_user_id: user.id,
      to_email: toEmail,
      code_hash: codeHash,
    })
    .select("id, expires_at")
    .single();

  if (insertError) {
    console.error("transfer request insert failed:", insertError.message);
    return json({ error: "Transfer başlatılamadı" }, 500);
  }

  // Best-effort delivery through Lovable Emails (available once a sender domain is set up).
  let emailSent = false;
  try {
    const { error: mailError } = await admin.functions.invoke("send-transactional-email", {
      body: {
        to: toEmail,
        subject: `${cert.product_name} — sahiplik transfer kodu`,
        html: `<p>Merhaba,</p><p><strong>${cert.product_name}</strong> (${cert.auth_code}) ürününün sahipliği size devredilmek isteniyor.</p><p>Doğrulama kodunuz: <strong style="font-size:20px;letter-spacing:4px">${code}</strong></p><p>Kod 24 saat geçerlidir. Hesabınıza giriş yapıp profil sayfanızdaki "Gelen Transfer" alanına girin.</p>`,
      },
    });
    emailSent = !mailError;
    if (mailError) console.error("transfer email failed:", mailError.message);
  } catch (e) {
    console.error("transfer email unavailable:", (e as Error).message);
  }

  return json({
    ok: true,
    request_id: request.id,
    expires_at: request.expires_at,
    to_masked: maskEmail(toEmail),
    email_sent: emailSent,
    // Returned to the sender only when e-mail delivery is not configured yet,
    // so the transfer flow stays usable.
    code: emailSent ? undefined : code,
  });
});

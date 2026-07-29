import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { maskEmail, sha256Hex } from "../_shared/mask.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

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
  const email = (user.email ?? "").toLowerCase();
  if (!email) return json({ error: "Hesabınızda e-posta yok" }, 400);

  let body: { code?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Geçersiz istek" }, 400);
  }
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!/^\d{6}$/.test(code)) return json({ error: "6 haneli kodu girin" }, 400);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const codeHash = await sha256Hex(code);

  const { data: request } = await admin
    .from("transfer_requests")
    .select("id, certificate_id, from_user_id, expires_at, attempts, status")
    .eq("to_email", email)
    .eq("code_hash", codeHash)
    .eq("status", "pending")
    .maybeSingle();

  if (!request) {
    return json({ error: "Kod geçersiz veya size ait değil" }, 404);
  }
  if (new Date(request.expires_at).getTime() < Date.now()) {
    await admin.from("transfer_requests").update({ status: "expired" }).eq("id", request.id);
    return json({ error: "Kodun süresi dolmuş" }, 410);
  }

  const masked = maskEmail(email);
  const nowIso = new Date().toISOString();

  const { error: updateError } = await admin
    .from("certificates")
    .update({
      owner_user_id: user.id,
      owner_masked: masked,
      current_owner: masked,
      claimed_at: nowIso,
    })
    .eq("id", request.certificate_id);

  if (updateError) {
    console.error("transfer update failed:", updateError.message);
    return json({ error: "Transfer tamamlanamadı" }, 500);
  }

  await admin.from("ownership_history").insert({
    certificate_id: request.certificate_id,
    owner_handle: masked ?? "—",
    owner_user_id: user.id,
    kind: "transfer",
    transferred_at: nowIso.slice(0, 10),
    note: "E-posta kodu ile sahiplik devri",
  });

  await admin
    .from("transfer_requests")
    .update({ status: "accepted", accepted_by: user.id, accepted_at: nowIso })
    .eq("id", request.id);

  const { data: cert } = await admin
    .from("certificates")
    .select("auth_code, product_name")
    .eq("id", request.certificate_id)
    .maybeSingle();

  return json({ ok: true, auth_code: cert?.auth_code, product_name: cert?.product_name });
});

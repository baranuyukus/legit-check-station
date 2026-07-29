import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { maskEmail } from "../_shared/mask.ts";

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

  let body: { token?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Geçersiz istek" }, 400);
  }
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token || token.length > 128) return json({ error: "Geçersiz QR kodu" }, 400);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: cert, error } = await admin
    .from("certificates")
    .select("id, auth_code, product_name, owner_user_id, claim_locked, assigned_email")
    .eq("claim_token", token)
    .maybeSingle();

  if (error) {
    console.error("claim lookup failed:", error.message);
    return json({ error: "Sunucu hatası" }, 500);
  }
  if (!cert) return json({ error: "Bu QR koda ait bir ürün bulunamadı" }, 404);

  if (cert.owner_user_id) {
    const mine = cert.owner_user_id === user.id;
    return json(
      {
        error: mine
          ? "Bu ürün zaten sizin hesabınıza tanımlı"
          : "Bu ürün başka bir kullanıcı tarafından sahiplenilmiş",
        already_owned: true,
        mine,
        auth_code: cert.auth_code,
      },
      409,
    );
  }

  const masked = maskEmail(user.email);
  const nowIso = new Date().toISOString();

  const { error: updateError } = await admin
    .from("certificates")
    .update({
      owner_user_id: user.id,
      owner_masked: masked,
      current_owner: masked,
      claimed_at: nowIso,
    })
    .eq("id", cert.id)
    .is("owner_user_id", null);

  if (updateError) {
    console.error("claim update failed:", updateError.message);
    return json({ error: "Sahiplik alınamadı" }, 500);
  }

  await admin.from("ownership_history").insert({
    certificate_id: cert.id,
    owner_handle: masked ?? "—",
    owner_user_id: user.id,
    kind: "claim",
    transferred_at: nowIso.slice(0, 10),
    note: "QR kod ile sahiplik alındı",
  });

  return json({ ok: true, auth_code: cert.auth_code, product_name: cert.product_name });
});

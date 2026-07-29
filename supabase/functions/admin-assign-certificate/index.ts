import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { maskEmail } from "../_shared/mask.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: isAdmin } = await admin.rpc("has_role", {
    _user_id: userData.user.id,
    _role: "admin",
  });
  if (!isAdmin) return json({ error: "Yetkiniz yok" }, 403);

  let body: { certificate_id?: unknown; email?: unknown; claim_locked?: unknown; action?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Geçersiz istek" }, 400);
  }

  const certificateId = typeof body.certificate_id === "string" ? body.certificate_id : "";
  if (!certificateId) return json({ error: "Sertifika seçilmedi" }, 400);
  const action = body.action === "unassign" ? "unassign" : "assign";
  const claimLocked = body.claim_locked === true;

  const { data: cert } = await admin
    .from("certificates")
    .select("id, auth_code, product_name, owner_user_id")
    .eq("id", certificateId)
    .maybeSingle();
  if (!cert) return json({ error: "Sertifika bulunamadı" }, 404);

  if (action === "unassign") {
    await admin
      .from("certificates")
      .update({
        owner_user_id: null,
        owner_masked: null,
        current_owner: null,
        assigned_email: null,
        assigned_at: null,
        claimed_at: null,
      })
      .eq("id", cert.id);
    await admin.from("ownership_history").insert({
      certificate_id: cert.id,
      owner_handle: "—",
      kind: "unassign",
      note: "Yönetici sahipliği kaldırdı",
    });
    return json({ ok: true, status: "unassigned" });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email) || email.length > 255) return json({ error: "Geçerli bir e-posta girin" }, 400);

  // e-postaya bağlı hesap var mı?
  let matchedUserId: string | null = null;
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .maybeSingle();
  if (profile) matchedUserId = profile.id;

  const masked = maskEmail(email);
  const nowIso = new Date().toISOString();

  const update: Record<string, unknown> = {
    assigned_email: email,
    assigned_at: nowIso,
    claim_locked: claimLocked,
  };

  if (matchedUserId) {
    update.owner_user_id = matchedUserId;
    update.owner_masked = masked;
    update.current_owner = masked;
    update.claimed_at = nowIso;
  }

  const { error: updateError } = await admin.from("certificates").update(update).eq("id", cert.id);
  if (updateError) {
    console.error("assign failed:", updateError.message);
    return json({ error: "Atama yapılamadı" }, 500);
  }

  if (matchedUserId) {
    await admin.from("ownership_history").insert({
      certificate_id: cert.id,
      owner_handle: masked ?? email,
      owner_user_id: matchedUserId,
      kind: "assignment",
      transferred_at: nowIso.slice(0, 10),
      note: "Yönetici tarafından hesaba atandı",
    });
  }

  return json({
    ok: true,
    status: matchedUserId ? "assigned" : "pending",
    masked,
    auth_code: cert.auth_code,
  });
});

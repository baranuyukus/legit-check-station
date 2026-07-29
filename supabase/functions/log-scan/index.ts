import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const sha256 = async (value: string) => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const parseUa = (ua: string) => {
  const s = ua.toLowerCase();
  const device = /ipad|tablet/.test(s) ? "tablet" : /mobi|iphone|android/.test(s) ? "mobile" : "desktop";
  const browser = /edg\//.test(s)
    ? "Edge"
    : /opr\/|opera/.test(s)
      ? "Opera"
      : /chrome|crios/.test(s)
        ? "Chrome"
        : /firefox|fxios/.test(s)
          ? "Firefox"
          : /safari/.test(s)
            ? "Safari"
            : "Other";
  const os = /iphone|ipad|ios/.test(s)
    ? "iOS"
    : /android/.test(s)
      ? "Android"
      : /windows/.test(s)
        ? "Windows"
        : /mac os/.test(s)
          ? "macOS"
          : /linux/.test(s)
            ? "Linux"
            : "Other";
  return { device, browser, os };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: { auth_code?: unknown; certificate_id?: unknown; kind?: unknown; referrer?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Geçersiz istek" }, 400);
  }

  const authCode = typeof body.auth_code === "string" ? body.auth_code.trim().slice(0, 64) : null;
  const certificateId = typeof body.certificate_id === "string" ? body.certificate_id.slice(0, 64) : null;
  const kindRaw = typeof body.kind === "string" ? body.kind : "verify";
  const kind = ["verify", "claim", "qr"].includes(kindRaw) ? kindRaw : "verify";
  const referrer = typeof body.referrer === "string" ? body.referrer.slice(0, 300) : null;

  if (!authCode && !certificateId) return json({ error: "Kayıt bilgisi eksik" }, 400);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let certId = certificateId;
  let code = authCode;
  const query = admin.from("certificates").select("id, auth_code").limit(1);
  const { data: cert } = certId
    ? await query.eq("id", certId).maybeSingle()
    : await query.eq("auth_code", (code ?? "").toUpperCase()).maybeSingle();

  if (!cert) return json({ ok: false, reason: "not_found" });
  certId = cert.id;
  code = cert.auth_code;

  const ua = req.headers.get("user-agent") ?? "";
  const { device, browser, os } = parseUa(ua);
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  const ipHash = ip ? (await sha256(`${ip}:meezy-scan-salt`)).slice(0, 32) : null;

  const { error } = await admin.from("scan_events").insert({
    certificate_id: certId,
    auth_code: code,
    kind,
    country: req.headers.get("cf-ipcountry") ?? req.headers.get("x-vercel-ip-country"),
    city: req.headers.get("cf-ipcity") ?? null,
    device_type: device,
    browser,
    os,
    referrer,
    ip_hash: ipHash,
    user_agent: ua.slice(0, 400),
  });

  if (error) {
    console.error("scan log failed:", error.message);
    return json({ ok: false }, 500);
  }
  return json({ ok: true });
});

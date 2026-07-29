import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { maskEmail } from "../_shared/mask.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** Shopify sends base64 HMAC-SHA256 of the raw body in X-Shopify-Hmac-Sha256. */
async function verifyHmac(secret: string, raw: string, header: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw));
  const expected = btoa(String.fromCharCode(...new Uint8Array(sig)));
  if (expected.length !== header.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ header.charCodeAt(i);
  return diff === 0;
}

function authCodeFor(orderName: string | null, index: number) {
  const base = (orderName ?? "MA").replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 10);
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `MA-${year}-${base || "ORDER"}-${index + 1}${rand}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const secret = Deno.env.get("SHOPIFY_WEBHOOK_SECRET");
  if (!secret) {
    console.error("SHOPIFY_WEBHOOK_SECRET is not configured");
    return json({ error: "Webhook secret not configured" }, 500);
  }

  const raw = await req.text();
  const hmac = req.headers.get("x-shopify-hmac-sha256") ?? "";
  if (!hmac || !(await verifyHmac(secret, raw, hmac))) {
    console.error("Invalid Shopify HMAC signature");
    return json({ error: "Invalid signature" }, 401);
  }

  let order: Record<string, any>;
  try {
    order = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const shopifyOrderId = String(order.id ?? "");
  if (!shopifyOrderId) return json({ error: "Missing order id" }, 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const email: string | null =
    order.email ?? order.contact_email ?? order.customer?.email ?? null;
  const orderName: string | null = order.name ?? null;

  const { error: orderError } = await supabase.from("shopify_orders").upsert(
    {
      shopify_order_id: shopifyOrderId,
      order_name: orderName,
      customer_email: email,
      payload: order,
      processed_at: new Date().toISOString(),
    },
    { onConflict: "shopify_order_id" },
  );
  if (orderError) console.error("shopify_orders upsert failed:", orderError.message);

  const lineItems: any[] = Array.isArray(order.line_items) ? order.line_items : [];
  const rows = lineItems.flatMap((item, index) => {
    const quantity = Math.max(1, Number(item.quantity) || 1);
    return Array.from({ length: quantity }, (_, copy) => ({
      auth_code: authCodeFor(orderName, index * 100 + copy),
      product_name: String(item.title ?? item.name ?? "Shopify Ürünü").slice(0, 200),
      brand: item.vendor ? String(item.vendor).slice(0, 100) : null,
      size: item.variant_title ? String(item.variant_title).slice(0, 30) : null,
      condition: "New / Deadstock",
      purchase_date: (order.created_at ?? new Date().toISOString()).slice(0, 10),
      owner_masked: maskEmail(email),
      shopify_order_id: shopifyOrderId,
      shopify_order_name: orderName,
      shopify_line_item_id: `${shopifyOrderId}-${item.id ?? index}-${copy}`,
      is_published: true,
      notes: `Shopify siparişi ${orderName ?? shopifyOrderId} ile oluşturuldu.`,
    }));
  });

  if (rows.length === 0) return json({ ok: true, created: 0 });

  const { data, error } = await supabase
    .from("certificates")
    .upsert(rows, { onConflict: "shopify_line_item_id", ignoreDuplicates: true })
    .select("id, auth_code, claim_token");

  if (error) {
    console.error("certificate creation failed:", error.message);
    return json({ error: "Could not create certificates", details: error.message }, 500);
  }

  console.log(`Created ${data?.length ?? 0} certificates for order ${shopifyOrderId}`);
  return json({ ok: true, created: data?.length ?? 0 });
});

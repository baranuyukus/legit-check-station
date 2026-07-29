import { supabase } from "@/integrations/supabase/client";

type ScanKind = "verify" | "claim" | "qr";

/** Fire-and-forget QR/doğrulama trafiği kaydı. */
export const logScan = async (
  params: { authCode?: string | null; certificateId?: string | null; kind?: ScanKind },
) => {
  try {
    await supabase.functions.invoke("log-scan", {
      body: {
        auth_code: params.authCode ?? null,
        certificate_id: params.certificateId ?? null,
        kind: params.kind ?? "verify",
        referrer: typeof document !== "undefined" ? document.referrer || null : null,
      },
    });
  } catch {
    /* takip hatası kullanıcıyı etkilemesin */
  }
};

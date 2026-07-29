import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { QrCode } from "@/components/QrCode";

/** Shows the printable claim QR for a certificate. Token is fetched via a secure lookup. */
export const AdminQrPanel = ({ certificateId }: { certificateId: string }) => {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    supabase
      .rpc("get_claim_token", { _certificate_id: certificateId })
      .then(({ data }) => active && setToken(data ?? null));
    return () => {
      active = false;
    };
  }, [certificateId]);

  if (!token) return null;
  const url = `${window.location.origin}/claim/${token}`;

  return (
    <div className="border-2 border-foreground p-6 space-y-4">
      <h2 className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
        Sahiplik QR Kodu
      </h2>
      <div className="flex flex-wrap items-center gap-6">
        <QrCode value={url} size={150} alt="Sahiplik QR kodu" />
        <div className="space-y-2 min-w-0">
          <p className="text-[10px] leading-relaxed text-muted-foreground max-w-sm">
            Bu QR kodu ürün etiketine basın. Alıcı ilk okutmada giriş yapıp sahipliği hesabına
            tanımlar. Kod yalnızca bir kez kullanılabilir.
          </p>
          <p className="text-[10px] break-all text-muted-foreground">{url}</p>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(url)}
            className="border-2 border-foreground px-4 py-1.5 text-[10px] tracking-[0.2em] uppercase hover:bg-foreground hover:text-background transition-colors"
          >
            Bağlantıyı Kopyala
          </button>
        </div>
      </div>
    </div>
  );
};

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { resolveImageUrl, formatDate } from "@/lib/storage";
import meezyLogo from "@/assets/meezy-logo.png";

const STEPS = [
  "Doğrulama protokolü başlatılıyor...",
  "Ürün tanımlayıcıları taranıyor...",
  "Veritabanı çapraz sorgulanıyor...",
  "Materyal imzaları analiz ediliyor...",
  "Üretici etiketleri doğrulanıyor...",
  "Orijinallik onaylanıyor...",
];

type Certificate = Tables<"certificates">;
type History = Tables<"ownership_history">;

const Verify = () => {
  const { code } = useParams<{ code: string }>();
  const [phase, setPhase] = useState<"loading" | "done">("loading");
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [cert, setCert] = useState<Certificate | null>(null);
  const [history, setHistory] = useState<History[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from("certificates")
        .select("*")
        .eq("auth_code", (code ?? "").toUpperCase())
        .maybeSingle();

      if (!active) return;
      setCert(data ?? null);

      if (data) {
        logScan({ certificateId: data.id, authCode: data.auth_code, kind: "verify" });
      }
        document.title = `${data.product_name} — Meezy Archive`;
        const [{ data: h }, url] = await Promise.all([
          supabase
            .from("ownership_history")
            .select("*")
            .eq("certificate_id", data.id)
            .order("transferred_at", { ascending: false }),
          resolveImageUrl(data.image_url),
        ]);
        if (!active) return;
        setHistory(h ?? []);
        setImageUrl(url);
      } else {
        document.title = "Sertifika bulunamadı — Meezy Archive";
      }
      setFetched(true);
    };
    load();
    return () => {
      active = false;
    };
  }, [code]);

  useEffect(() => {
    const delays = [700, 900, 800, 900, 700, 800];
    const total = delays.reduce((a, b) => a + b, 0);
    const start = Date.now();
    let timeout: ReturnType<typeof setTimeout>;

    const interval = setInterval(() => {
      setProgress(Math.min(((Date.now() - start) / total) * 100, 100));
    }, 50);

    const run = (i: number) => {
      if (i >= STEPS.length) {
        clearInterval(interval);
        setProgress(100);
        timeout = setTimeout(() => setPhase("done"), 500);
        return;
      }
      setStepIndex(i);
      timeout = setTimeout(() => run(i + 1), delays[i]);
    };
    run(0);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [code]);

  if (phase === "loading" || !fetched) {
    return (
      <div className="min-h-screen bg-background text-foreground font-mono flex flex-col items-center justify-center px-4">
        <img src={meezyLogo} alt="Meezy Archive" className="h-12 object-contain mb-10" />
        <div className="w-full max-w-md space-y-6">
          <div className="border-2 border-foreground h-3 w-full overflow-hidden">
            <div className="h-full bg-foreground" style={{ width: `${progress}%` }} />
          </div>
          <div className="h-6 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.p
                key={stepIndex}
                className="text-xs tracking-[0.15em] uppercase text-muted-foreground text-center"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                {STEPS[stepIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
          <div className="flex justify-center gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-6 border border-foreground ${i <= stepIndex ? "bg-foreground" : ""}`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!cert) {
    return (
      <div className="min-h-screen bg-background text-foreground font-mono flex flex-col items-center justify-center px-4 gap-6">
        <img src={meezyLogo} alt="Meezy Archive" className="h-12 object-contain" />
        <div className="border-2 border-foreground p-6 text-center max-w-md space-y-3">
          <p className="text-sm tracking-[0.3em] uppercase font-bold">✕ Sertifika Bulunamadı</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-bold">{code}</span> koduna ait doğrulanmış bir ürün kaydı yok.
            Kodu kontrol edip tekrar deneyin.
          </p>
        </div>
        <Link
          to="/"
          className="border-2 border-foreground px-6 py-2 text-xs tracking-[0.3em] uppercase font-bold hover:bg-foreground hover:text-background transition-colors"
        >
          Geri Dön
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-mono">
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link to="/">
            <img src={meezyLogo} alt="Meezy Archive" className="h-16 object-contain" />
          </Link>
          <p className="text-xs tracking-[0.4em] uppercase text-muted-foreground">
            Orijinallik Doğrulama
          </p>
        </motion.div>

        <motion.div
          className="border-2 border-foreground p-4 text-center"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <p className="text-sm tracking-[0.3em] uppercase font-bold">✓ Ürün Doğrulandı</p>
        </motion.div>

        <motion.div
          className="border-2 border-foreground"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="border-b-2 md:border-b-0 md:border-r-2 border-foreground p-8 flex items-center justify-center bg-secondary min-h-[16rem]">
              {imageUrl ? (
                <img src={imageUrl} alt={cert.product_name} className="max-h-72 object-contain" />
              ) : (
                <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
                  Görsel Yok
                </p>
              )}
            </div>

            <div className="p-8 space-y-6">
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-1">Ürün</p>
                <p className="text-sm font-bold tracking-wide uppercase leading-tight">
                  {cert.brand ? `${cert.brand} ` : ""}
                  {cert.product_name}
                </p>
                {cert.colorway && (
                  <p className="text-xs text-muted-foreground mt-1">{cert.colorway}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Beden" value={cert.size} />
                <Field label="Durum" value={cert.condition} />
                <Field label="Doğrulama Kodu" value={cert.auth_code} />
                <Field label="Doğrulandı" value={formatDate(cert.verified_date)} />
                <Field label="Satın Alım" value={formatDate(cert.purchase_date)} />
                <Field
                  label="Sahip"
                  value={cert.owner_masked ?? cert.current_owner ?? "Sahiplik alınmadı"}
                />
              </div>

              {!cert.claimed_at && (
                <p className="border-2 border-foreground p-3 text-[10px] leading-relaxed">
                  Bu ürünün sahipliği henüz alınmamış. Ürün etiketindeki QR kodu okutarak sahipliği
                  hesabınıza tanımlayabilirsiniz.
                </p>
              )}


              {history.length > 0 && (
                <div className="pt-2 border-t border-muted-foreground/20">
                  <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-2">
                    Sahiplik Geçmişi
                  </p>
                  <div className="space-y-1.5">
                    {history.map((h, i) => (
                      <div key={h.id} className="flex justify-between items-center text-xs gap-2">
                        <span className="text-muted-foreground">{formatDate(h.transferred_at)}</span>
                        <span className="font-bold truncate">{h.owner_handle}</span>
                        {i === 0 && (
                          <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground border border-muted-foreground/30 px-2 py-0.5 shrink-0">
                            Güncel
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        <motion.div
          className="border-2 border-foreground p-6 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
            Orijinallik Sertifikası
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {cert.notes ||
              "Bu ürün Meezy Archive'ın çok noktalı doğrulama sürecinden geçirilmiştir. Her ürün uzman ekibimiz tarafından orijinallik ve kondisyon açısından titizlikle incelenir."}
          </p>
          <div className="pt-2 border-t border-muted-foreground/20 flex items-center justify-between">
            <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
              Meezy Archive © 2026
            </p>
            <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
              meezyarchive.com
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

const Field = ({ label, value }: { label: string; value: string | null }) => (
  <div>
    <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-1">{label}</p>
    <p className="text-sm font-bold break-words">{value || "—"}</p>
  </div>
);

export default Verify;

import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import meezyLogo from "@/assets/meezy-logo.png";

type State = "idle" | "working" | "done" | "error";

const Claim = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { session, loading } = useAuth();

  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");
  const [authCode, setAuthCode] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Ürün Sahipliği Al — Meezy Archive";
  }, []);

  const claim = async () => {
    setState("working");
    const { data, error } = await supabase.functions.invoke("claim-certificate", {
      body: { token },
    });

    if (error) {
      let detail = error.message;
      try {
        const ctx = (error as { context?: Response }).context;
        if (ctx) {
          const parsed = JSON.parse(await ctx.text());
          detail = parsed.error ?? detail;
        }
      } catch {
        /* keep default message */
      }
      setState("error");
      setMessage(detail);
      return;
    }

    setAuthCode(data?.auth_code ?? null);
    setState("done");
    toast.success("Ürün sahipliği hesabınıza tanımlandı");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background font-mono flex items-center justify-center">
        <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-mono flex flex-col items-center justify-center px-4 py-12">
      <Link to="/">
        <img src={meezyLogo} alt="Meezy Archive" className="h-12 object-contain mb-10" />
      </Link>

      <main className="w-full max-w-md border-2 border-foreground p-8 space-y-6 text-center">
        <h1 className="text-xs tracking-[0.3em] uppercase font-bold">Sahiplik Talebi</h1>

        {!session && (
          <>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Bu QR kod bir Meezy Archive ürününe ait. Sahipliği almak için giriş yapın ya da hesap oluşturun.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => navigate(`/giris?next=${encodeURIComponent(`/claim/${token}`)}`)}
                className="flex-1 border-2 border-foreground py-2.5 text-xs tracking-[0.2em] uppercase font-bold hover:bg-foreground hover:text-background transition-colors"
              >
                Giriş Yap
              </button>
              <button
                onClick={() => navigate(`/kayit?next=${encodeURIComponent(`/claim/${token}`)}`)}
                className="flex-1 border-2 border-foreground py-2.5 text-xs tracking-[0.2em] uppercase font-bold hover:bg-foreground hover:text-background transition-colors"
              >
                Kayıt Ol
              </button>
            </div>
          </>
        )}

        {session && state !== "done" && (
          <>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Bu ürünün sahipliğini <span className="font-bold">{session.user.email}</span> hesabınıza
              tanımlamak üzeresiniz. Sahiplik yalnızca bir kez alınabilir.
            </p>
            {state === "error" && (
              <p className="border-2 border-foreground p-3 text-xs leading-relaxed">✕ {message}</p>
            )}
            <button
              onClick={claim}
              disabled={state === "working"}
              className="w-full border-2 border-foreground py-2.5 text-xs tracking-[0.3em] uppercase font-bold hover:bg-foreground hover:text-background transition-colors disabled:opacity-50"
            >
              {state === "working" ? "..." : "Sahipliği Al"}
            </button>
          </>
        )}

        {state === "done" && (
          <>
            <p className="text-sm tracking-[0.3em] uppercase font-bold">✓ Sahiplik Alındı</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Ürün artık hesabınıza kayıtlı. Hesabım sayfasından sahipliği başkasına devredebilirsiniz.
            </p>
            <div className="flex gap-2">
              <Link
                to="/hesabim"
                className="flex-1 border-2 border-foreground py-2.5 text-xs tracking-[0.2em] uppercase font-bold hover:bg-foreground hover:text-background transition-colors"
              >
                Hesabım
              </Link>
              {authCode && (
                <Link
                  to={`/verify/${encodeURIComponent(authCode)}`}
                  className="flex-1 border-2 border-foreground py-2.5 text-xs tracking-[0.2em] uppercase font-bold hover:bg-foreground hover:text-background transition-colors"
                >
                  Sertifika
                </Link>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Claim;

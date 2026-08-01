import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { resolveImageUrl, formatDate } from "@/lib/storage";
import { SiteHeader } from "@/components/SiteHeader";
import { QrCode } from "@/components/QrCode";
import { toast } from "sonner";
import { z } from "zod";

type Certificate = Tables<"certificates">;
type TransferRequest = Tables<"transfer_requests">;

const emailSchema = z.string().trim().email("Geçerli bir e-posta girin").max(255);

const invokeError = async (error: unknown, fallback: string) => {
  const err = error as { message?: string; context?: Response };
  try {
    if (err?.context) {
      const parsed = JSON.parse(await err.context.text());
      if (parsed?.error) return parsed.error as string;
    }
  } catch {
    /* ignore */
  }
  return err?.message ?? fallback;
};

const Account = () => {
  const navigate = useNavigate();
  const { session, loading } = useAuth();

  const [items, setItems] = useState<Certificate[]>([]);
  const [images, setImages] = useState<Record<string, string | null>>({});
  const [tokens, setTokens] = useState<Record<string, string>>({});
  const [outgoing, setOutgoing] = useState<TransferRequest[]>([]);
  const [busy, setBusy] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [transferFor, setTransferFor] = useState<Certificate | null>(null);
  const [transferEmail, setTransferEmail] = useState("");
  const [acceptCode, setAcceptCode] = useState("");

  useEffect(() => {
    document.title = "Hesabım — Meezy Archive";
  }, []);

  useEffect(() => {
    if (!loading && !session) navigate("/giris?next=%2Fhesabim", { replace: true });
  }, [loading, session, navigate]);

  const load = useCallback(async () => {
    if (!session) return;
    setFetching(true);
    const [{ data: certs }, { data: reqs }] = await Promise.all([
      supabase
        .from("certificates")
        .select("id, auth_code, product_name, brand, size, colorway, condition, image_url, verified_date, purchase_date, current_owner, notes, is_published, created_at, updated_at, owner_user_id, owner_masked, claimed_at, claim_locked, assigned_at")
        .eq("owner_user_id", session.user.id)
        .order("claimed_at", { ascending: false }),
      supabase
        .from("transfer_requests")
        .select("*")
        .eq("from_user_id", session.user.id)
        .order("created_at", { ascending: false }),
    ]);

    const list = certs ?? [];
    setItems(list);
    setOutgoing(reqs ?? []);
    setFetching(false);

    const entries = await Promise.all(
      list.map(async (c) => [c.id, await resolveImageUrl(c.image_url)] as const),
    );
    setImages(Object.fromEntries(entries));

    const tokenEntries = await Promise.all(
      list.map(async (c) => {
        const { data } = await supabase.rpc("get_claim_token", { _certificate_id: c.id });
        return [c.id, data ?? ""] as const;
      }),
    );
    setTokens(Object.fromEntries(tokenEntries.filter(([, t]) => t)));
  }, [session]);

  useEffect(() => {
    load();
  }, [load]);

  const startTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferFor) return;
    const parsed = emailSchema.safeParse(transferEmail);
    if (!parsed.success) return toast.error(parsed.error.errors[0].message);

    setBusy(true);
    const { data, error } = await supabase.functions.invoke("transfer-start", {
      body: { certificate_id: transferFor.id, to_email: parsed.data },
    });
    setBusy(false);

    if (error) return toast.error(await invokeError(error, "Transfer başlatılamadı"));

    if (data?.debug_code) {
      toast.success(`Kod alıcıya iletilemedi. Kod: ${data.debug_code}`, { duration: 20000 });
    } else {
      toast.success("6 haneli devir kodu alıcının e-postasına gönderildi");
    }
    setTransferFor(null);
    setTransferEmail("");
    load();
  };

  const acceptTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(acceptCode.trim())) return toast.error("6 haneli kodu girin");

    setBusy(true);
    const { data, error } = await supabase.functions.invoke("transfer-accept", {
      body: { code: acceptCode.trim() },
    });
    setBusy(false);

    if (error) return toast.error(await invokeError(error, "Kod doğrulanamadı"));
    toast.success(`${data?.product_name ?? "Ürün"} artık size ait`);
    setAcceptCode("");
    load();
  };

  if (loading || !session) {
    return (
      <div className="min-h-screen bg-background font-mono flex items-center justify-center">
        <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">Yükleniyor...</p>
      </div>
    );
  }

  const pending = outgoing.filter((r) => r.status === "pending");

  return (
    <div className="min-h-screen bg-background text-foreground font-mono">
      <SiteHeader />

      <main className="max-w-4xl mx-auto px-4 py-10 space-y-8">
        <div className="border-2 border-foreground p-6">
          <h1 className="text-xs tracking-[0.3em] uppercase font-bold">Hesabım</h1>
          <p className="text-xs text-muted-foreground mt-2">{session.user.email}</p>
        </div>

        <section className="space-y-4">
          <h2 className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
            Sahip Olduğum Ürünler ({items.length})
          </h2>

          {fetching ? (
            <div className="border-2 border-foreground p-6 text-xs text-muted-foreground">
              Yükleniyor...
            </div>
          ) : items.length === 0 ? (
            <div className="border-2 border-foreground p-6 text-xs leading-relaxed text-muted-foreground">
              Henüz ürününüz yok. Ürün etiketindeki QR kodu okutarak sahipliği alabilir ya da size
              devredilen bir ürünün kodunu aşağıya girebilirsiniz.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {items.map((c) => (
                <article key={c.id} className="border-2 border-foreground">
                  <div className="flex">
                    <div className="w-28 shrink-0 border-r-2 border-foreground bg-secondary flex items-center justify-center p-2">
                      {images[c.id] ? (
                        <img
                          src={images[c.id] as string}
                          alt={c.product_name}
                          loading="lazy"
                          className="max-h-24 object-contain"
                        />
                      ) : (
                        <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground">
                          Görsel Yok
                        </span>
                      )}
                    </div>
                    <div className="p-4 space-y-1.5 min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wide leading-tight truncate">
                        {c.brand ? `${c.brand} ` : ""}
                        {c.product_name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{c.auth_code}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Sahiplik: {formatDate(c.claimed_at)}
                      </p>
                      <div className="flex gap-2 pt-1">
                        <Link
                          to={`/verify/${encodeURIComponent(c.auth_code)}`}
                          className="text-[10px] tracking-[0.2em] uppercase border-2 border-foreground px-2 py-1 hover:bg-foreground hover:text-background transition-colors"
                        >
                          Sertifika
                        </Link>
                        <button
                          onClick={() => {
                            setTransferFor(c);
                            setTransferEmail("");
                          }}
                          className="text-[10px] tracking-[0.2em] uppercase border-2 border-foreground px-2 py-1 hover:bg-foreground hover:text-background transition-colors"
                        >
                          Devret
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="border-t-2 border-foreground p-4 flex items-center gap-4">
                    {tokens[c.id] && (
                      <QrCode
                        value={`${window.location.origin}/claim/${tokens[c.id]}`}
                        size={84}
                        alt={`${c.product_name} QR kodu`}
                      />
                    )}
                    <p className="text-[10px] leading-relaxed text-muted-foreground">
                      Ürün QR kodu. Sahiplik devri sonrasında yeni sahip bu kodu kullanamaz; devir
                      e-posta kodu ile yapılır.
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {transferFor && (
          <section className="border-2 border-foreground p-6 space-y-4">
            <h2 className="text-[10px] tracking-[0.3em] uppercase font-bold">
              Sahipliği Devret — {transferFor.product_name}
            </h2>
            <form onSubmit={startTransfer} className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="transfer-email"
                  className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground block"
                >
                  Alıcı E-posta
                </label>
                <input
                  id="transfer-email"
                  type="email"
                  value={transferEmail}
                  onChange={(e) => setTransferEmail(e.target.value)}
                  className="w-full border-2 border-foreground bg-transparent px-3 py-2 text-sm outline-none focus:bg-secondary"
                />
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Alıcının e-postasına 6 haneli bir kod gönderilir. Alıcı bu kodu Hesabım sayfasında
                  girerek sahipliği alır. Kod 24 saat geçerlidir.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="border-2 border-foreground px-5 py-2 text-xs tracking-[0.2em] uppercase font-bold hover:bg-foreground hover:text-background transition-colors disabled:opacity-50"
                >
                  {busy ? "..." : "Kodu Gönder"}
                </button>
                <button
                  type="button"
                  onClick={() => setTransferFor(null)}
                  className="border-2 border-foreground px-5 py-2 text-xs tracking-[0.2em] uppercase hover:bg-secondary transition-colors"
                >
                  Vazgeç
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="border-2 border-foreground p-6 space-y-4">
          <h2 className="text-[10px] tracking-[0.3em] uppercase font-bold">
            Bana Devredilen Ürünü Al
          </h2>
          <form onSubmit={acceptTransfer} className="flex flex-wrap gap-2 items-end">
            <div className="space-y-2">
              <label
                htmlFor="accept-code"
                className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground block"
              >
                6 Haneli Kod
              </label>
              <input
                id="accept-code"
                inputMode="numeric"
                maxLength={6}
                value={acceptCode}
                onChange={(e) => setAcceptCode(e.target.value.replace(/\D/g, ""))}
                className="border-2 border-foreground bg-transparent px-3 py-2 text-sm tracking-[0.4em] outline-none focus:bg-secondary w-40"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="border-2 border-foreground px-5 py-2 text-xs tracking-[0.2em] uppercase font-bold hover:bg-foreground hover:text-background transition-colors disabled:opacity-50"
            >
              {busy ? "..." : "Sahipliği Al"}
            </button>
          </form>
        </section>

        {pending.length > 0 && (
          <section className="border-2 border-foreground p-6 space-y-3">
            <h2 className="text-[10px] tracking-[0.3em] uppercase font-bold">Bekleyen Devirler</h2>
            {pending.map((r) => (
              <div key={r.id} className="flex justify-between text-xs gap-3 border-t border-muted-foreground/20 pt-2">
                <span className="truncate">{r.to_email}</span>
                <span className="text-muted-foreground shrink-0">
                  Son: {formatDate(r.expires_at)}
                </span>
              </div>
            ))}
          </section>
        )}
      </main>
    </div>
  );
};

export default Account;

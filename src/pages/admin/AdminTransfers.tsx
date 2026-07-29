import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { AdminLayout } from "@/components/AdminLayout";
import { toast } from "sonner";

type Transfer = Tables<"transfer_requests">;
type Certificate = Pick<Tables<"certificates">, "id" | "auth_code" | "product_name">;
type History = Tables<"ownership_history">;

const statusLabel: Record<string, string> = {
  pending: "Bekliyor",
  accepted: "Tamamlandı",
  expired: "Süresi doldu",
  cancelled: "İptal",
};

const AdminTransfers = () => {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [certs, setCerts] = useState<Record<string, Certificate>>({});
  const [history, setHistory] = useState<History[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Transferler — Meezy Archive";
    const load = async () => {
      setLoading(true);
      const [{ data: t, error }, { data: c }, { data: h }] = await Promise.all([
        supabase.from("transfer_requests").select("*").order("created_at", { ascending: false }),
        supabase.from("certificates").select("id, auth_code, product_name"),
        supabase
          .from("ownership_history")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50),
      ]);
      if (error) toast.error(error.message);
      setTransfers(t ?? []);
      const map: Record<string, Certificate> = {};
      (c ?? []).forEach((row) => (map[row.id] = row));
      setCerts(map);
      setHistory(h ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const stats = useMemo(
    () => ({
      total: transfers.length,
      pending: transfers.filter((t) => t.status === "pending").length,
      accepted: transfers.filter((t) => t.status === "accepted").length,
    }),
    [transfers],
  );

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="grid grid-cols-3 border-2 border-foreground md:divide-x-2 divide-foreground">
          <Stat label="Toplam Devir" value={stats.total} />
          <Stat label="Bekleyen" value={stats.pending} />
          <Stat label="Tamamlanan" value={stats.accepted} />
        </div>

        <section className="border-2 border-foreground">
          <h2 className="text-[10px] tracking-[0.3em] uppercase font-bold px-4 py-3 border-b-2 border-foreground">
            Devir Talepleri
          </h2>
          <div className="hidden md:grid grid-cols-[8rem_1fr_1fr_7rem_9rem] gap-3 px-4 py-2 border-b border-muted-foreground/30 text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
            <span>Kod</span>
            <span>Ürün</span>
            <span>Alıcı</span>
            <span>Durum</span>
            <span>Tarih</span>
          </div>
          {loading ? (
            <p className="p-6 text-xs text-muted-foreground">Yükleniyor...</p>
          ) : transfers.length === 0 ? (
            <p className="p-6 text-xs text-muted-foreground">Henüz devir talebi yok.</p>
          ) : (
            transfers.map((t) => {
              const cert = certs[t.certificate_id];
              const expired = t.status === "pending" && new Date(t.expires_at) < new Date();
              return (
                <div
                  key={t.id}
                  className="grid grid-cols-1 md:grid-cols-[8rem_1fr_1fr_7rem_9rem] gap-1 md:gap-3 px-4 py-3 border-b border-muted-foreground/20 last:border-b-0 text-xs items-center"
                >
                  <span className="font-bold">
                    {cert ? (
                      <Link to={`/admin/certificates/${cert.id}`} className="underline underline-offset-2">
                        {cert.auth_code}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </span>
                  <span className="truncate">{cert?.product_name ?? "—"}</span>
                  <span className="text-muted-foreground truncate">{t.to_email}</span>
                  <span className="text-[10px] tracking-[0.2em] uppercase">
                    {expired ? "Süresi doldu" : (statusLabel[t.status] ?? t.status)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(t.created_at).toLocaleString("tr-TR")}
                  </span>
                </div>
              );
            })
          )}
        </section>

        <section className="border-2 border-foreground">
          <h2 className="text-[10px] tracking-[0.3em] uppercase font-bold px-4 py-3 border-b-2 border-foreground">
            Sahiplik Zinciri (Son 50)
          </h2>
          {history.length === 0 ? (
            <p className="p-6 text-xs text-muted-foreground">Kayıt yok.</p>
          ) : (
            history.map((h) => (
              <div
                key={h.id}
                className="grid grid-cols-1 md:grid-cols-[8rem_1fr_7rem_9rem] gap-1 md:gap-3 px-4 py-2 border-b border-muted-foreground/20 last:border-b-0 text-xs items-center"
              >
                <span className="font-bold">{certs[h.certificate_id]?.auth_code ?? "—"}</span>
                <span className="truncate text-muted-foreground">{h.owner_handle}</span>
                <span className="text-[10px] tracking-[0.2em] uppercase">{h.kind}</span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(h.created_at).toLocaleString("tr-TR")}
                </span>
              </div>
            ))
          )}
        </section>
      </div>
    </AdminLayout>
  );
};

const Stat = ({ label, value }: { label: string; value: number }) => (
  <div className="p-5 border-b-2 md:border-b-0 border-foreground last:border-b-0">
    <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-1">{label}</p>
    <p className="text-2xl font-bold">{value}</p>
  </div>
);

export default AdminTransfers;

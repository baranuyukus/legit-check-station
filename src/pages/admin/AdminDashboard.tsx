import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { AdminLayout } from "@/components/AdminLayout";
import { formatDate } from "@/lib/storage";
import { toast } from "sonner";

type Certificate = Tables<"certificates">;

const AdminDashboard = () => {
  const [items, setItems] = useState<Certificate[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("certificates")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    document.title = "Admin Panel — Meezy Archive";
    load();
  }, []);

  const remove = async (id: string, name: string) => {
    if (!confirm(`"${name}" kaydı silinsin mi?`)) return;
    const { error } = await supabase.from("certificates").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Kayıt silindi");
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) =>
      [i.auth_code, i.product_name, i.brand, i.current_owner, i.size, i.assigned_email]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [items, query]);

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = items.filter((i) => {
      const d = new Date(i.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    const owned = items.filter((i) => i.owner_user_id).length;
    return {
      total: items.length,
      published: items.filter((i) => i.is_published).length,
      owned,
      unclaimed: items.length - owned,
      pendingAssign: items.filter((i) => i.assigned_email && !i.owner_user_id).length,
      locked: items.filter((i) => i.claim_locked).length,
      thisMonth,
    };
  }, [items]);

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-6 border-2 border-foreground md:divide-x-2 divide-foreground">
          <Stat label="Toplam" value={stats.total} />
          <Stat label="Yayında" value={stats.published} />
          <Stat label="Sahipli" value={stats.owned} />
          <Stat label="Sahipsiz" value={stats.unclaimed} />
          <Stat label="Bekleyen Atama" value={stats.pendingAssign} />
          <Stat label="Claim Kapalı" value={stats.locked} />
        </div>

        <div className="flex gap-3 flex-wrap">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Kod, ürün, marka veya sahip ara..."
            className="flex-1 min-w-[16rem] border-2 border-foreground bg-transparent px-3 py-2 text-sm outline-none focus:bg-secondary"
          />
          <Link
            to="/admin/certificates/new"
            className="border-2 border-foreground px-5 py-2 text-xs tracking-[0.3em] uppercase font-bold hover:bg-foreground hover:text-background transition-colors flex items-center"
          >
            Yeni Kayıt
          </Link>
        </div>

        <div className="border-2 border-foreground">
          <div className="hidden md:grid grid-cols-[8rem_1fr_5rem_7rem_6rem_8rem] gap-3 px-4 py-2 border-b-2 border-foreground text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
            <span>Kod</span>
            <span>Ürün</span>
            <span>Beden</span>
            <span>Sahip</span>
            <span>Durum</span>
            <span className="text-right">İşlem</span>
          </div>

          {loading ? (
            <p className="p-6 text-xs text-muted-foreground">Yükleniyor...</p>
          ) : filtered.length === 0 ? (
            <p className="p-6 text-xs text-muted-foreground">Kayıt bulunamadı.</p>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-1 md:grid-cols-[8rem_1fr_5rem_7rem_6rem_8rem] gap-1 md:gap-3 px-4 py-3 border-b border-muted-foreground/20 last:border-b-0 text-xs items-center"
              >
                <span className="font-bold">{item.auth_code}</span>
                <span className="truncate">
                  {item.brand ? `${item.brand} · ` : ""}
                  {item.product_name}
                </span>
                <span className="text-muted-foreground">{item.size || "—"}</span>
                <span className="text-muted-foreground truncate">{item.current_owner || "—"}</span>
                <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                  {item.is_published ? "Yayında" : "Taslak"}
                </span>
                <span className="flex gap-2 md:justify-end pt-2 md:pt-0">
                  <Link
                    to={`/admin/certificates/${item.id}`}
                    className="border border-foreground px-2 py-1 text-[10px] tracking-[0.2em] uppercase hover:bg-foreground hover:text-background"
                  >
                    Düzenle
                  </Link>
                  <button
                    onClick={() => remove(item.id, item.product_name)}
                    className="border border-foreground px-2 py-1 text-[10px] tracking-[0.2em] uppercase hover:bg-destructive hover:text-destructive-foreground"
                  >
                    Sil
                  </button>
                </span>
                <span className="md:hidden text-[10px] text-muted-foreground">
                  {formatDate(item.verified_date)}
                </span>
              </div>
            ))
          )}
        </div>
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

export default AdminDashboard;

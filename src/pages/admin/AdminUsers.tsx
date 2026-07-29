import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { AdminLayout } from "@/components/AdminLayout";
import { formatDate } from "@/lib/storage";
import { toast } from "sonner";

type Profile = Tables<"profiles">;

const AdminUsers = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<Record<string, string[]>>({});
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Kullanıcılar — Meezy Archive";
    const load = async () => {
      setLoading(true);
      const [{ data: p, error }, { data: r }, { data: c }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("certificates").select("owner_user_id").not("owner_user_id", "is", null),
      ]);
      if (error) toast.error(error.message);
      setProfiles(p ?? []);

      const roleMap: Record<string, string[]> = {};
      (r ?? []).forEach((row) => {
        roleMap[row.user_id] = [...(roleMap[row.user_id] ?? []), row.role];
      });
      setRoles(roleMap);

      const countMap: Record<string, number> = {};
      (c ?? []).forEach((row) => {
        if (row.owner_user_id) countMap[row.owner_user_id] = (countMap[row.owner_user_id] ?? 0) + 1;
      });
      setCounts(countMap);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((p) =>
      [p.full_name, p.display_name, p.email, p.phone]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [profiles, query]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 border-2 border-foreground md:divide-x-2 divide-foreground">
          <Stat label="Toplam Kullanıcı" value={profiles.length} />
          <Stat label="Ürün Sahibi" value={Object.keys(counts).length} />
          <Stat label="Yönetici" value={Object.values(roles).filter((r) => r.includes("admin")).length} />
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ad, e-posta veya telefon ara..."
          className="w-full border-2 border-foreground bg-transparent px-3 py-2 text-sm outline-none focus:bg-secondary"
        />

        <div className="border-2 border-foreground">
          <div className="hidden md:grid grid-cols-[1fr_1fr_9rem_5rem_6rem_7rem] gap-3 px-4 py-2 border-b-2 border-foreground text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
            <span>Ad Soyad</span>
            <span>E-posta</span>
            <span>Telefon</span>
            <span>Ürün</span>
            <span>Rol</span>
            <span>Kayıt</span>
          </div>

          {loading ? (
            <p className="p-6 text-xs text-muted-foreground">Yükleniyor...</p>
          ) : filtered.length === 0 ? (
            <p className="p-6 text-xs text-muted-foreground">Kullanıcı bulunamadı.</p>
          ) : (
            filtered.map((p) => (
              <div
                key={p.id}
                className="grid grid-cols-1 md:grid-cols-[1fr_1fr_9rem_5rem_6rem_7rem] gap-1 md:gap-3 px-4 py-3 border-b border-muted-foreground/20 last:border-b-0 text-xs items-center"
              >
                <span className="font-bold truncate">{p.full_name || p.display_name || "—"}</span>
                <span className="text-muted-foreground truncate">{p.email || "—"}</span>
                <span className="text-muted-foreground">{p.phone || "—"}</span>
                <span>{counts[p.id] ?? 0}</span>
                <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                  {(roles[p.id] ?? ["user"]).join(", ")}
                </span>
                <span className="text-[10px] text-muted-foreground">{formatDate(p.created_at)}</span>
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

export default AdminUsers;

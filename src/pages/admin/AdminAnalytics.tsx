import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { AdminLayout } from "@/components/AdminLayout";
import { toast } from "sonner";

type Scan = Tables<"scan_events">;

const RANGES = [
  { key: "24h", label: "24 Saat", days: 1 },
  { key: "7d", label: "7 Gün", days: 7 },
  { key: "30d", label: "30 Gün", days: 30 },
  { key: "90d", label: "90 Gün", days: 90 },
];

const AdminAnalytics = () => {
  const [scans, setScans] = useState<Scan[]>([]);
  const [range, setRange] = useState(RANGES[1]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Trafik — Meezy Archive";
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const since = new Date(Date.now() - range.days * 86400000).toISOString();
      const { data, error } = await supabase
        .from("scan_events")
        .select("*")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) toast.error(error.message);
      setScans(data ?? []);
      setLoading(false);
    };
    load();
  }, [range]);

  const groups = useMemo(() => {
    const by = (key: keyof Scan) => {
      const m: Record<string, number> = {};
      scans.forEach((s) => {
        const v = (s[key] as string | null) || "Bilinmiyor";
        m[v] = (m[v] ?? 0) + 1;
      });
      return Object.entries(m).sort((a, b) => b[1] - a[1]);
    };
    return {
      codes: by("auth_code").slice(0, 10),
      countries: by("country").slice(0, 8),
      devices: by("device_type"),
      browsers: by("browser").slice(0, 6),
      kinds: by("kind"),
    };
  }, [scans]);

  const series = useMemo(() => {
    const buckets: Record<string, number> = {};
    for (let i = range.days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      buckets[d] = 0;
    }
    scans.forEach((s) => {
      const d = s.created_at.slice(0, 10);
      if (d in buckets) buckets[d] += 1;
    });
    const entries = Object.entries(buckets);
    const max = Math.max(1, ...entries.map(([, v]) => v));
    return { entries, max };
  }, [scans, range]);

  const unique = useMemo(() => new Set(scans.map((s) => s.ip_hash ?? s.id)).size, [scans]);

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex gap-2 flex-wrap">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r)}
              className={`text-[10px] tracking-[0.2em] uppercase px-4 py-2 border-2 border-foreground ${
                r.key === range.key ? "bg-foreground text-background" : "hover:bg-secondary"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 border-2 border-foreground md:divide-x-2 divide-foreground">
          <Stat label="Toplam Okutma" value={scans.length} />
          <Stat label="Tekil Ziyaretçi" value={unique} />
          <Stat label="QR / Claim" value={scans.filter((s) => s.kind !== "verify").length} />
          <Stat label="Ülke" value={new Set(scans.map((s) => s.country).filter(Boolean)).size} />
        </div>

        <section className="border-2 border-foreground p-5">
          <h2 className="text-[10px] tracking-[0.3em] uppercase font-bold mb-4">Günlük Okutma</h2>
          {loading ? (
            <p className="text-xs text-muted-foreground">Yükleniyor...</p>
          ) : (
            <div className="flex items-end gap-[2px] h-40">
              {series.entries.map(([day, count]) => (
                <div key={day} className="flex-1 flex flex-col justify-end group relative">
                  <div
                    className="bg-foreground w-full"
                    style={{ height: `${(count / series.max) * 100}%`, minHeight: count ? "2px" : "0" }}
                  />
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] opacity-0 group-hover:opacity-100 whitespace-nowrap">
                    {day.slice(5)} · {count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="grid md:grid-cols-2 gap-6">
          <Breakdown title="En Çok Okutulan Kodlar" rows={groups.codes} />
          <Breakdown title="Ülkeler" rows={groups.countries} />
          <Breakdown title="Cihaz" rows={groups.devices} />
          <Breakdown title="Tarayıcı" rows={groups.browsers} />
        </div>

        <section className="border-2 border-foreground">
          <h2 className="text-[10px] tracking-[0.3em] uppercase font-bold px-4 py-3 border-b-2 border-foreground">
            Son Okutmalar
          </h2>
          <div className="hidden md:grid grid-cols-[9rem_7rem_5rem_6rem_6rem_1fr] gap-3 px-4 py-2 border-b border-muted-foreground/30 text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
            <span>Tarih</span>
            <span>Kod</span>
            <span>Tür</span>
            <span>Ülke</span>
            <span>Cihaz</span>
            <span>Tarayıcı / OS</span>
          </div>
          {scans.slice(0, 60).map((s) => (
            <div
              key={s.id}
              className="grid grid-cols-1 md:grid-cols-[9rem_7rem_5rem_6rem_6rem_1fr] gap-1 md:gap-3 px-4 py-2 border-b border-muted-foreground/20 last:border-b-0 text-xs"
            >
              <span className="text-muted-foreground">
                {new Date(s.created_at).toLocaleString("tr-TR")}
              </span>
              <span className="font-bold">
                {s.auth_code ? (
                  <Link to={`/verify/${s.auth_code}`} className="underline underline-offset-2">
                    {s.auth_code}
                  </Link>
                ) : (
                  "—"
                )}
              </span>
              <span className="uppercase text-[10px] tracking-[0.2em]">{s.kind}</span>
              <span>{s.country || "—"}</span>
              <span>{s.device_type || "—"}</span>
              <span className="text-muted-foreground truncate">
                {[s.browser, s.os].filter(Boolean).join(" / ") || "—"}
              </span>
            </div>
          ))}
          {!loading && scans.length === 0 && (
            <p className="p-6 text-xs text-muted-foreground">Bu aralıkta okutma kaydı yok.</p>
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

const Breakdown = ({ title, rows }: { title: string; rows: [string, number][] }) => {
  const max = Math.max(1, ...rows.map(([, v]) => v));
  return (
    <section className="border-2 border-foreground p-5 space-y-3">
      <h2 className="text-[10px] tracking-[0.3em] uppercase font-bold">{title}</h2>
      {rows.length === 0 && <p className="text-xs text-muted-foreground">Veri yok.</p>}
      {rows.map(([label, value]) => (
        <div key={label} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="truncate">{label}</span>
            <span className="font-bold">{value}</span>
          </div>
          <div className="h-1.5 bg-secondary">
            <div className="h-full bg-foreground" style={{ width: `${(value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </section>
  );
};

export default AdminAnalytics;

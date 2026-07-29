import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { AdminQrPanel } from "@/components/AdminQrPanel";
import { AdminLayout } from "@/components/AdminLayout";
import { resolveImageUrl, formatDate } from "@/lib/storage";
import { toast } from "sonner";
import { z } from "zod";

type History = Tables<"ownership_history">;

const schema = z.object({
  auth_code: z.string().trim().min(3, "Doğrulama kodu en az 3 karakter").max(64),
  product_name: z.string().trim().min(2, "Ürün adı gerekli").max(200),
  brand: z.string().trim().max(100),
  size: z.string().trim().max(30),
  colorway: z.string().trim().max(120),
  condition: z.string().trim().min(1).max(60),
  current_owner: z.string().trim().max(80),
  notes: z.string().trim().max(1500),
});

const empty = {
  auth_code: "",
  product_name: "",
  brand: "",
  size: "",
  colorway: "",
  condition: "New / Deadstock",
  current_owner: "",
  notes: "",
  verified_date: new Date().toISOString().slice(0, 10),
  purchase_date: "",
  is_published: true,
};

const CertificateForm = () => {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === "new";
  const navigate = useNavigate();

  const [form, setForm] = useState({ ...empty });
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [history, setHistory] = useState<History[]>([]);
  const [assign, setAssign] = useState<{
    assigned_email: string | null;
    claim_locked: boolean;
    owner_masked: string | null;
  }>({ assigned_email: null, claim_locked: false, owner_masked: null });
  const [newOwner, setNewOwner] = useState("");
  const [transferDate, setTransferDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(!isNew);

  useEffect(() => {
    document.title = isNew ? "Yeni Kayıt — Meezy Archive" : "Kaydı Düzenle — Meezy Archive";
    if (isNew) return;

    const load = async () => {
      const { data, error } = await supabase
        .from("certificates")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) toast.error(error.message);
      if (data) {
        setForm({
          auth_code: data.auth_code,
          product_name: data.product_name,
          brand: data.brand ?? "",
          size: data.size ?? "",
          colorway: data.colorway ?? "",
          condition: data.condition,
          current_owner: data.current_owner ?? "",
          notes: data.notes ?? "",
          verified_date: data.verified_date,
          purchase_date: data.purchase_date ?? "",
          is_published: data.is_published,
        });
        setAssign({
          assigned_email: data.assigned_email,
          claim_locked: data.claim_locked,
          owner_masked: data.owner_masked,
        });
        setImagePath(data.image_url);
        setImageUrl(await resolveImageUrl(data.image_url));
      }
      await loadHistory();
      setLoading(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadHistory = async () => {
    if (isNew) return;
    const { data } = await supabase
      .from("ownership_history")
      .select("*")
      .eq("certificate_id", id!)
      .order("transferred_at", { ascending: false });
    setHistory(data ?? []);
  };

  const reloadAssign = async () => {
    if (isNew) return;
    const { data } = await supabase
      .from("certificates")
      .select("assigned_email, claim_locked, owner_masked, current_owner")
      .eq("id", id!)
      .maybeSingle();
    if (data) {
      setAssign({
        assigned_email: data.assigned_email,
        claim_locked: data.claim_locked,
        owner_masked: data.owner_masked,
      });
      setForm((prev) => ({ ...prev, current_owner: data.current_owner ?? "" }));
    }
    await loadHistory();
  };

  const set = (key: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const uploadImage = async (file: File) => {
    setBusy(true);
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("item-images").upload(path, file);
    setBusy(false);
    if (error) return toast.error(error.message);
    setImagePath(path);
    setImageUrl(await resolveImageUrl(path));
    toast.success("Görsel yüklendi");
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.errors[0].message);

    const payload = {
      auth_code: parsed.data.auth_code.toUpperCase(),
      product_name: parsed.data.product_name,
      brand: parsed.data.brand || null,
      size: parsed.data.size || null,
      colorway: parsed.data.colorway || null,
      condition: parsed.data.condition,
      current_owner: parsed.data.current_owner || null,
      notes: parsed.data.notes || null,
      verified_date: form.verified_date,
      purchase_date: form.purchase_date || null,
      is_published: form.is_published,
      image_url: imagePath,
    };

    setBusy(true);
    if (isNew) {
      const { data, error } = await supabase
        .from("certificates")
        .insert(payload)
        .select("id")
        .single();
      setBusy(false);
      if (error) return toast.error(error.message);
      toast.success("Kayıt oluşturuldu");
      navigate(`/admin/certificates/${data.id}`);
    } else {
      const { error } = await supabase.from("certificates").update(payload).eq("id", id!);
      setBusy(false);
      if (error) return toast.error(error.message);
      toast.success("Kayıt güncellendi");
    }
  };

  const transfer = async () => {
    const handle = newOwner.trim();
    if (!handle) return toast.error("Yeni sahip bilgisi gerekli");
    if (handle.length > 80) return toast.error("Sahip adı çok uzun");

    setBusy(true);
    const { error } = await supabase.from("ownership_history").insert({
      certificate_id: id!,
      owner_handle: handle,
      transferred_at: transferDate,
    });
    if (!error) {
      await supabase.from("certificates").update({ current_owner: handle }).eq("id", id!);
    }
    setBusy(false);
    if (error) return toast.error(error.message);
    set("current_owner", handle);
    setNewOwner("");
    await loadHistory();
    toast.success("Sahiplik devredildi");
  };

  const removeHistory = async (hid: string) => {
    const { error } = await supabase.from("ownership_history").delete().eq("id", hid);
    if (error) return toast.error(error.message);
    await loadHistory();
  };

  if (loading) {
    return (
      <AdminLayout>
        <p className="text-xs text-muted-foreground">Yükleniyor...</p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-xs tracking-[0.3em] uppercase font-bold">
            {isNew ? "Yeni Doğrulama Kaydı" : "Kaydı Düzenle"}
          </h1>
          {!isNew && (
            <Link
              to={`/verify/${form.auth_code}`}
              className="border-2 border-foreground px-4 py-1.5 text-[10px] tracking-[0.2em] uppercase hover:bg-foreground hover:text-background"
            >
              Sertifikayı Gör
            </Link>
          )}
        </div>

        <form onSubmit={save} className="border-2 border-foreground p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input label="Doğrulama Kodu" value={form.auth_code} onChange={(v) => set("auth_code", v)} placeholder="MA-2026-00487" />
            <Input label="Ürün Adı" value={form.product_name} onChange={(v) => set("product_name", v)} />
            <Input label="Marka" value={form.brand} onChange={(v) => set("brand", v)} />
            <Input label="Beden" value={form.size} onChange={(v) => set("size", v)} />
            <Input label="Renk / Colorway" value={form.colorway} onChange={(v) => set("colorway", v)} />
            <Input label="Durum" value={form.condition} onChange={(v) => set("condition", v)} />
            <Input label="Doğrulama Tarihi" type="date" value={form.verified_date} onChange={(v) => set("verified_date", v)} />
            <Input label="Satın Alım Tarihi" type="date" value={form.purchase_date} onChange={(v) => set("purchase_date", v)} />
            <Input label="Güncel Sahip" value={form.current_owner} onChange={(v) => set("current_owner", v)} />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">Not</label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              className="w-full border-2 border-foreground bg-transparent px-3 py-2 text-sm outline-none focus:bg-secondary"
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground block">
              Ürün Görseli
            </label>
            <div className="flex items-center gap-4 flex-wrap">
              {imageUrl && (
                <img src={imageUrl} alt="Ürün" className="h-24 w-24 object-contain border-2 border-foreground bg-secondary" />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])}
                className="text-xs file:mr-3 file:border-2 file:border-foreground file:bg-transparent file:px-3 file:py-1.5 file:text-[10px] file:tracking-[0.2em] file:uppercase"
              />
            </div>
          </div>

          <label className="flex items-center gap-3 text-xs">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(e) => set("is_published", e.target.checked)}
              className="h-4 w-4 accent-foreground"
            />
            <span className="tracking-[0.2em] uppercase text-[10px]">Yayında (herkes görebilir)</span>
          </label>

          <button
            type="submit"
            disabled={busy}
            className="border-2 border-foreground px-8 py-2.5 text-xs tracking-[0.3em] uppercase font-bold hover:bg-foreground hover:text-background transition-colors disabled:opacity-50"
          >
            {busy ? "..." : "Kaydet"}
          </button>
        </form>

        {!isNew && <AdminQrPanel certificateId={id!} />}

        {!isNew && (
          <div className="border-2 border-foreground p-6 space-y-5">
            <h2 className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
              Sahiplik Geçmişi
            </h2>

            <div className="space-y-2">
              {history.length === 0 && (
                <p className="text-xs text-muted-foreground">Henüz kayıt yok.</p>
              )}
              {history.map((h, i) => (
                <div key={h.id} className="flex items-center justify-between gap-3 text-xs border-b border-muted-foreground/20 pb-2">
                  <span className="text-muted-foreground">{formatDate(h.transferred_at)}</span>
                  <span className="font-bold flex-1 truncate">{h.owner_handle}</span>
                  {i === 0 && (
                    <span className="text-[10px] tracking-[0.2em] uppercase border border-muted-foreground/30 px-2 py-0.5">
                      Güncel
                    </span>
                  )}
                  <button
                    onClick={() => removeHistory(h.id)}
                    className="text-[10px] tracking-[0.2em] uppercase border border-foreground px-2 py-0.5 hover:bg-destructive hover:text-destructive-foreground"
                  >
                    Sil
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-3 flex-wrap items-end pt-2">
              <div className="flex-1 min-w-[12rem] space-y-2">
                <label className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
                  Yeni Sahip
                </label>
                <input
                  value={newOwner}
                  onChange={(e) => setNewOwner(e.target.value)}
                  placeholder="@kullanici"
                  className="w-full border-2 border-foreground bg-transparent px-3 py-2 text-sm outline-none focus:bg-secondary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
                  Tarih
                </label>
                <input
                  type="date"
                  value={transferDate}
                  onChange={(e) => setTransferDate(e.target.value)}
                  className="border-2 border-foreground bg-transparent px-3 py-2 text-sm outline-none focus:bg-secondary"
                />
              </div>
              <button
                onClick={transfer}
                disabled={busy}
                className="border-2 border-foreground px-6 py-2 text-xs tracking-[0.3em] uppercase font-bold hover:bg-foreground hover:text-background transition-colors disabled:opacity-50"
              >
                Devret
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

const Input = ({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) => (
  <div className="space-y-2">
    <label className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">{label}</label>
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border-2 border-foreground bg-transparent px-3 py-2 text-sm outline-none focus:bg-secondary"
    />
  </div>
);

export default CertificateForm;

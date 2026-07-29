import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = {
  certificateId: string;
  assignedEmail: string | null;
  claimLocked: boolean;
  ownerMasked: string | null;
  onChanged: () => void;
};

export const AdminAssignPanel = ({
  certificateId,
  assignedEmail,
  claimLocked,
  ownerMasked,
  onChanged,
}: Props) => {
  const [email, setEmail] = useState(assignedEmail ?? "");
  const [locked, setLocked] = useState(claimLocked);
  const [busy, setBusy] = useState(false);

  const call = async (action: "assign" | "unassign") => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("admin-assign-certificate", {
      body: { certificate_id: certificateId, email, claim_locked: locked, action },
    });
    setBusy(false);

    if (error) return toast.error("İşlem başarısız oldu");
    if (data?.error) return toast.error(data.error);

    if (data?.status === "assigned") toast.success("Ürün doğrudan hesaba tanımlandı");
    else if (data?.status === "pending")
      toast.success("Hesap bulunamadı — kişi bu e-posta ile kayıt olduğunda ürün otomatik düşecek");
    else toast.success("Sahiplik kaldırıldı");

    onChanged();
  };

  return (
    <section className="border-2 border-foreground p-5 space-y-4">
      <h2 className="text-[10px] tracking-[0.3em] uppercase font-bold">Sahiplik Ataması</h2>

      <div className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground space-y-1">
        <p>Mevcut sahip: {ownerMasked || "— sahipsiz"}</p>
        <p>Atanan e-posta: {assignedEmail || "—"}</p>
        <p>Claim durumu: {claimLocked ? "KAPALI (QR ile alınamaz)" : "AÇIK (QR ile alınabilir)"}</p>
      </div>

      <div className="space-y-2">
        <label htmlFor="assign-email" className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground block">
          E-posta ile ata
        </label>
        <input
          id="assign-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="musteri@ornek.com"
          className="w-full border-2 border-foreground bg-transparent px-3 py-2 text-sm outline-none focus:bg-secondary"
        />
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Hesap varsa ürün anında o hesaba geçer. Hesap yoksa kişi bu e-posta ile kayıt olduğu an ürün
          otomatik olarak hesabına eklenir.
        </p>
      </div>

      <label className="flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase cursor-pointer">
        <input
          type="checkbox"
          checked={locked}
          onChange={(e) => setLocked(e.target.checked)}
          className="h-4 w-4 accent-foreground"
        />
        Claim'e kapat (QR okutan kişi sahiplenemesin)
      </label>

      <div className="flex gap-3 flex-wrap">
        <button
          type="button"
          disabled={busy}
          onClick={() => call("assign")}
          className="border-2 border-foreground px-5 py-2 text-[10px] tracking-[0.3em] uppercase font-bold hover:bg-foreground hover:text-background transition-colors disabled:opacity-50"
        >
          {busy ? "..." : "Ata / Güncelle"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (confirm("Sahiplik ve atama kaldırılsın mı?")) call("unassign");
          }}
          className="border-2 border-foreground px-5 py-2 text-[10px] tracking-[0.3em] uppercase hover:bg-destructive hover:text-destructive-foreground transition-colors disabled:opacity-50"
        >
          Sahipliği Kaldır
        </button>
      </div>
    </section>
  );
};

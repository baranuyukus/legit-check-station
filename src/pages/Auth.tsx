import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import meezyLogo from "@/assets/meezy-logo.png";

const schema = z.object({
  email: z.string().trim().email("Geçerli bir e-posta girin").max(255),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı").max(72),
});

const Auth = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
        navigate("/admin");
      } else {
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: { emailRedirectTo: `${window.location.origin}/admin` },
        });
        if (error) throw error;
        toast.success("Hesap oluşturuldu. Admin yetkisi verilmesi gerekiyor.");
        navigate("/admin");
      }

    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-mono flex flex-col items-center justify-center px-4">
      <img src={meezyLogo} alt="Meezy Archive" className="h-12 object-contain mb-10" />
      <form onSubmit={submit} className="w-full max-w-sm border-2 border-foreground p-8 space-y-6">
        <h1 className="text-xs tracking-[0.3em] uppercase font-bold text-center">
          {mode === "signin" ? "Admin Girişi" : "Hesap Oluştur"}
        </h1>

        <div className="space-y-2">
          <label className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">E-posta</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border-2 border-foreground bg-transparent px-3 py-2 text-sm outline-none focus:bg-secondary"
            autoComplete="email"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">Şifre</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border-2 border-foreground bg-transparent px-3 py-2 text-sm outline-none focus:bg-secondary"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
          />
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full border-2 border-foreground py-2.5 text-xs tracking-[0.3em] uppercase font-bold hover:bg-foreground hover:text-background transition-colors disabled:opacity-50"
        >
          {busy ? "..." : mode === "signin" ? "Giriş Yap" : "Kayıt Ol"}
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="w-full text-[10px] tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground"
        >
          {mode === "signin" ? "Hesabın yok mu? Kayıt ol" : "Zaten hesabın var mı? Giriş yap"}
        </button>
      </form>
    </div>
  );
};

export default Auth;

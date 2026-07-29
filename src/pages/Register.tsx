import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { z } from "zod";
import meezyLogo from "@/assets/meezy-logo.png";
import { safeNext } from "./Login";

const schema = z.object({
  displayName: z.string().trim().min(2, "İsim en az 2 karakter olmalı").max(80),
  email: z.string().trim().email("Geçerli bir e-posta girin").max(255),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı").max(72),
});

const Register = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = "Kayıt Ol — Meezy Archive";
  }, []);

  useEffect(() => {
    if (session) navigate(next ?? "/hesabim", { replace: true });
  }, [session, next, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ displayName, email, password });
    if (!parsed.success) return toast.error(parsed.error.errors[0].message);

    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/hesabim`,
        data: { display_name: parsed.data.displayName },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);

    if (data.session) {
      navigate(next ?? "/hesabim", { replace: true });
    } else {
      toast.success("Hesap oluşturuldu. E-postanızdaki bağlantıyla hesabınızı doğrulayın.");
      navigate("/giris", { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-mono flex flex-col items-center justify-center px-4 py-10">
      <Link to="/">
        <img src={meezyLogo} alt="Meezy Archive" className="h-12 object-contain mb-10" />
      </Link>
      <main className="w-full max-w-sm">
        <form onSubmit={submit} className="border-2 border-foreground p-8 space-y-6">
          <h1 className="text-xs tracking-[0.3em] uppercase font-bold text-center">Kayıt Ol</h1>

          <div className="space-y-2">
            <label htmlFor="reg-name" className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground block">
              Ad Soyad
            </label>
            <input
              id="reg-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="name"
              className="w-full border-2 border-foreground bg-transparent px-3 py-2 text-sm outline-none focus:bg-secondary"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="reg-email" className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground block">
              E-posta
            </label>
            <input
              id="reg-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full border-2 border-foreground bg-transparent px-3 py-2 text-sm outline-none focus:bg-secondary"
            />
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Shopify siparişinizde kullandığınız e-posta ile kayıt olun; ürünleriniz otomatik eşleşir.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="reg-password" className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground block">
              Şifre
            </label>
            <input
              id="reg-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full border-2 border-foreground bg-transparent px-3 py-2 text-sm outline-none focus:bg-secondary"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full border-2 border-foreground py-2.5 text-xs tracking-[0.3em] uppercase font-bold hover:bg-foreground hover:text-background transition-colors disabled:opacity-50"
          >
            {busy ? "..." : "Hesap Oluştur"}
          </button>

          <Link
            to={next ? `/giris?next=${encodeURIComponent(next)}` : "/giris"}
            className="block text-center text-[10px] tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground"
          >
            Zaten hesabın var mı? Giriş yap
          </Link>
        </form>
      </main>
    </div>
  );
};

export default Register;

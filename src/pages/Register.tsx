import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { z } from "zod";
import meezyLogo from "@/assets/meezy-logo.png";
import { safeNext } from "./Login";

const schema = z.object({
  fullName: z.string().trim().min(3, "Ad soyad en az 3 karakter olmalı").max(80),
  phone: z
    .string()
    .trim()
    .min(10, "Geçerli bir telefon numarası girin")
    .max(20, "Telefon numarası çok uzun")
    .regex(/^[0-9+()\s-]+$/, "Telefon sadece rakam ve + ( ) - içerebilir"),
  email: z.string().trim().email("Geçerli bir e-posta girin").max(255),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı").max(72),
});

const fieldClass =
  "w-full border-2 border-foreground bg-transparent px-3 py-2 text-sm outline-none focus:bg-secondary";
const labelClass = "text-[10px] tracking-[0.3em] uppercase text-muted-foreground block";

const Register = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
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
    const parsed = schema.safeParse({ fullName, phone, email, password });
    if (!parsed.success) return toast.error(parsed.error.errors[0].message);

    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/hesabim`,
        data: {
          display_name: parsed.data.fullName,
          full_name: parsed.data.fullName,
          phone: parsed.data.phone,
        },
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
            <label htmlFor="reg-name" className={labelClass}>
              Ad Soyad
            </label>
            <input
              id="reg-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              className={fieldClass}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="reg-phone" className={labelClass}>
              Telefon
            </label>
            <input
              id="reg-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              placeholder="+90 5XX XXX XX XX"
              className={fieldClass}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="reg-email" className={labelClass}>
              E-posta
            </label>
            <input
              id="reg-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className={fieldClass}
            />
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Shopify siparişinizde kullandığınız e-posta ile kayıt olun; ürünleriniz otomatik eşleşir.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="reg-password" className={labelClass}>
              Şifre
            </label>
            <input
              id="reg-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className={fieldClass}
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

import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { z } from "zod";
import meezyLogo from "@/assets/meezy-logo.png";

const schema = z.object({
  email: z.string().trim().email("Geçerli bir e-posta girin").max(255),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı").max(72),
});

/** Returns a safe same-origin path from ?next=, or null. */
export const safeNext = (value: string | null) =>
  value && value.startsWith("/") && !value.startsWith("//") ? value : null;

const Login = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = "Giriş Yap — Meezy Archive";
  }, []);

  useEffect(() => {
    if (session) navigate(next ?? "/hesabim", { replace: true });
  }, [session, next, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) return toast.error(parsed.error.errors[0].message);

    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    navigate(next ?? "/hesabim", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-mono flex flex-col items-center justify-center px-4">
      <Link to="/">
        <img src={meezyLogo} alt="Meezy Archive" className="h-12 object-contain mb-10" />
      </Link>
      <main className="w-full max-w-sm">
        <form onSubmit={submit} className="border-2 border-foreground p-8 space-y-6">
          <h1 className="text-xs tracking-[0.3em] uppercase font-bold text-center">Giriş Yap</h1>

          <div className="space-y-2">
            <label htmlFor="login-email" className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground block">
              E-posta
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full border-2 border-foreground bg-transparent px-3 py-2 text-sm outline-none focus:bg-secondary"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="login-password" className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground block">
              Şifre
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full border-2 border-foreground bg-transparent px-3 py-2 text-sm outline-none focus:bg-secondary"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full border-2 border-foreground py-2.5 text-xs tracking-[0.3em] uppercase font-bold hover:bg-foreground hover:text-background transition-colors disabled:opacity-50"
          >
            {busy ? "..." : "Giriş Yap"}
          </button>

          <Link
            to={next ? `/kayit?next=${encodeURIComponent(next)}` : "/kayit"}
            className="block text-center text-[10px] tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground"
          >
            Hesabın yok mu? Kayıt ol
          </Link>
        </form>
      </main>
    </div>
  );
};

export default Login;

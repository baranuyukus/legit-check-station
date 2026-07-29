import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import meezyLogo from "@/assets/meezy-logo.png";
import { SiteHeader } from "@/components/SiteHeader";

const Index = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState("");

  useEffect(() => {
    document.title = "Meezy Archive — Orijinallik Doğrulama";
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (clean) navigate(`/verify/${encodeURIComponent(clean)}`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-mono flex flex-col">
      <SiteHeader />
      <main className="flex-1 flex flex-col items-center justify-center px-4">
        <motion.img
          src={meezyLogo}
          alt="Meezy Archive"
          className="h-16 object-contain mb-6"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        />
        <h1 className="text-xs tracking-[0.4em] uppercase text-muted-foreground mb-10">
          Orijinallik Doğrulama
        </h1>

        <motion.form
          onSubmit={submit}
          className="w-full max-w-md border-2 border-foreground p-8 space-y-5"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <label className="block text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
            Doğrulama Kodu
          </label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="MA-2026-00487"
            className="w-full border-2 border-foreground bg-transparent px-3 py-2.5 text-sm tracking-widest uppercase outline-none focus:bg-secondary placeholder:text-muted-foreground/50"
          />
          <button
            type="submit"
            className="w-full border-2 border-foreground py-2.5 text-xs tracking-[0.3em] uppercase font-bold hover:bg-foreground hover:text-background transition-colors"
          >
            Sertifikayı Doğrula
          </button>
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            Her Meezy Archive ürününün etiketinde benzersiz bir doğrulama kodu bulunur.
            Kodu girerek ürünün orijinallik sertifikasını ve sahiplik geçmişini görüntüleyin.
          </p>
        </motion.form>
      </main>

      <footer className="border-t-2 border-foreground px-4 py-4 flex items-center justify-between">
        <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
          Meezy Archive © 2026
        </p>
        <a
          href="/admin"
          className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground hover:text-foreground"
        >
          Admin
        </a>
      </footer>
    </div>
  );
};

export default Index;

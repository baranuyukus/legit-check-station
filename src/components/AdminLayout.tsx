import { ReactNode } from "react";
import { Navigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import meezyLogo from "@/assets/meezy-logo.png";

export const AdminLayout = ({ children }: { children: ReactNode }) => {
  const { loading, session, isAdmin, signOut } = useAuth();
  const { pathname } = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground font-mono flex items-center justify-center">
        <p className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground">Yükleniyor</p>
      </div>
    );
  }

  if (!session) return <Navigate to="/auth" replace />;

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background text-foreground font-mono flex flex-col items-center justify-center gap-6 px-4">
        <div className="border-2 border-foreground p-6 max-w-md text-center space-y-3">
          <p className="text-sm tracking-[0.3em] uppercase font-bold">Yetki Yok</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Bu hesabın admin yetkisi bulunmuyor. Yetkilendirme yapılması gerekiyor.
          </p>
        </div>
        <button
          onClick={signOut}
          className="border-2 border-foreground px-6 py-2 text-xs tracking-[0.3em] uppercase font-bold hover:bg-foreground hover:text-background transition-colors"
        >
          Çıkış Yap
        </button>
      </div>
    );
  }

  const navItems = [
    { to: "/admin", label: "Panel" },
    { to: "/admin/users", label: "Kullanıcılar" },
    { to: "/admin/analytics", label: "Trafik" },
    { to: "/admin/transfers", label: "Transferler" },
    { to: "/admin/certificates/new", label: "Yeni Kayıt" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-mono">
      <header className="border-b-2 border-foreground px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
        <Link to="/admin" className="flex items-center gap-3">
          <img src={meezyLogo} alt="Meezy Archive" className="h-7 object-contain" />
          <span className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">Admin</span>
        </Link>
        <nav className="flex items-center gap-3">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`text-[10px] tracking-[0.2em] uppercase px-3 py-1.5 border-2 ${
                pathname === item.to
                  ? "border-foreground bg-foreground text-background"
                  : "border-transparent hover:border-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <button
            onClick={signOut}
            className="text-[10px] tracking-[0.2em] uppercase px-3 py-1.5 border-2 border-foreground hover:bg-foreground hover:text-background transition-colors"
          >
            Çıkış
          </button>
        </nav>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
};

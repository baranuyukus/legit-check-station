import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import meezyLogo from "@/assets/meezy-logo.png";

export const SiteHeader = () => {
  const { session, isAdmin, signOut } = useAuth();
  const { pathname } = useLocation();

  const link =
    "text-[10px] tracking-[0.2em] uppercase px-3 py-1.5 border-2 border-transparent hover:border-foreground";
  const active = "text-[10px] tracking-[0.2em] uppercase px-3 py-1.5 border-2 border-foreground";

  return (
    <header className="border-b-2 border-foreground px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
      <Link to="/" className="flex items-center gap-3">
        <img src={meezyLogo} alt="Meezy Archive" className="h-7 object-contain" />
      </Link>
      <nav className="flex items-center gap-1 flex-wrap">
        {session ? (
          <>
            <Link to="/hesabim" className={pathname === "/hesabim" ? active : link}>
              Hesabım
            </Link>
            {isAdmin && (
              <Link to="/admin" className={link}>
                Admin
              </Link>
            )}
            <button
              onClick={signOut}
              className="text-[10px] tracking-[0.2em] uppercase px-3 py-1.5 border-2 border-foreground hover:bg-foreground hover:text-background transition-colors"
            >
              Çıkış
            </button>
          </>
        ) : (
          <>
            <Link to="/giris" className={pathname === "/giris" ? active : link}>
              Giriş
            </Link>
            <Link
              to="/kayit"
              className="text-[10px] tracking-[0.2em] uppercase px-3 py-1.5 border-2 border-foreground hover:bg-foreground hover:text-background transition-colors"
            >
              Kayıt Ol
            </Link>
          </>
        )}
      </nav>
    </header>
  );
};

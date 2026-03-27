import { NavLink } from "react-router-dom";
import { Users, ArrowLeftRight, FileText, BarChart2, LogOut, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/cariler", icon: Users, label: "Cariler" },
  { to: "/islemler", icon: ArrowLeftRight, label: "İşlemler" },
  { to: "/fatura-kes", icon: FileText, label: "Fatura Kes" },
  { to: "/ekstre", icon: BarChart2, label: "Ekstre / Rapor" },
];

export function Sidebar({ onCikis }) {
  return (
    <aside className="flex h-full w-52 flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex h-11 items-center gap-2.5 border-b px-5">
        <img src="/logo.svg" alt="Muhasebe" className="h-6 w-6 rounded" />
        <span className="text-sm font-bold tracking-tight">Muhasebe</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-3 py-3">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Alt butonlar */}
      <div className="border-t px-3 py-3 space-y-0.5">
        <NavLink
          to="/ayarlar"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )
          }
        >
          <Settings className="h-4 w-4 shrink-0" />
          Ayarlar
        </NavLink>
        <button
          onClick={onCikis}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Çıkış Yap
        </button>
      </div>
    </aside>
  );
}

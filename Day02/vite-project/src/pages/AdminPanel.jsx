import { useEffect } from "react";
import { NavLink, Outlet, useNavigate, Navigate } from "react-router";
import { Info, Plus, RefreshCw, Trash2, ShieldCheck } from "lucide-react";

function AdminPanel() {
  const navItems = [
    { to: "/admin/info",   label: "Dashboard",     icon: Info },
    { to: "/admin/create", label: "Create Problem", icon: Plus },
    { to: "/admin/update", label: "Update Problem", icon: RefreshCw },
    { to: "/admin/delete", label: "Delete Problem", icon: Trash2 },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* ── NAV BAR ── */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl px-6 py-0 flex items-center justify-between gap-4">
        {/* Logo */}
        <NavLink to="/" className="py-4 shrink-0">
          <h1 className="logo">
            <span>LogicLab</span>
          </h1>
        </NavLink>

        {/* Admin badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
          <ShieldCheck size={13} className="text-indigo-400" />
          <span className="text-[11px] font-black text-indigo-300 uppercase tracking-widest">Admin Panel</span>
        </div>

        {/* Nav links */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/20"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`
              }
            >
              <Icon size={15} />
              <span className="hidden md:inline">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* ── OUTLET ── */}
      <main className="max-w-6xl mx-auto p-6 space-y-8">
        <Outlet />
      </main>
    </div>
  );
}

export default AdminPanel;

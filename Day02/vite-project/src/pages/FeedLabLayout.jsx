import React from "react";
import { 
  Home, User,
  MoreHorizontal, Plus
} from "lucide-react";
import { NavLink, Outlet, Link } from "react-router";
import { useSelector } from "react-redux";

function FeedLabLayout() {
  const { user } = useSelector((state) => state.auth);
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const NAV_ITEMS = [
    { name: "Home", icon: Home, path: "/feedlab", exact: true },
    { name: "Profile", icon: User, path: "/profile" },
  ];

  return (
    <div className="min-h-screen font-sans selection:bg-indigo-500/30 bg-slate-950 text-slate-200">
      
      {/* ── PARENT WRAPPER ── */}
      <div className="max-w-[1300px] mx-auto flex justify-center h-screen overflow-hidden">

        {/* ── LEFT SIDEBAR (Navigation) ── */}
        <aside className={`hidden sm:flex flex-col h-full sticky top-0 border-r border-slate-200 dark:border-white/5 pt-4 pb-6 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-0 opacity-0 overflow-hidden px-0 border-none' : 'w-[80px] xl:w-[275px] px-2 xl:px-4'}`}>
          <div className="flex flex-col h-full">
            
            {/* LogicLab Logo (Reverted to standard LogicLab Style) */}
            <NavLink to="/" className="flex items-center gap-3 p-3 mb-4 w-fit hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors">
              <h1 className="logo">
                <span>FeedLab</span>
              </h1>
            </NavLink>

            {/* Nav Links */}
            <nav className="flex flex-col gap-2 flex-1">
              {NAV_ITEMS.map((item) => (
                <NavLink 
                  key={item.name}
                  to={item.path}
                  end={item.exact}
                  className={({ isActive }) => 
                    `flex items-center gap-4 p-3 xl:px-4 rounded-full w-fit xl:w-full transition-all duration-200 ${
                      isActive 
                        ? "bg-black/5 dark:bg-white/10 font-bold text-indigo-600 dark:text-white relative" 
                        : "hover:bg-black/5 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon size={26} strokeWidth={isActive ? 2.5 : 2} className={isActive ? "text-indigo-500 dark:text-indigo-400" : ""} />
                      <span className="hidden xl:block text-lg">{item.name}</span>
                      {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-full hidden xl:block" />}
                    </>
                  )}
                </NavLink>
              ))}

              {/* Post Button */}
              <Link to="/feedlab#create-post" className="mt-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full p-4 xl:py-4 xl:px-0 font-bold shadow-lg shadow-indigo-500/25 transition-all w-fit xl:w-[90%] mx-auto flex justify-center items-center">
                <Plus size={24} className="xl:hidden" />
                <span className="hidden xl:block text-lg">Lab Post</span>
              </Link>
            </nav>

            {/* Bottom Profile Preview */}
            <div className="mt-auto flex items-center justify-between p-3 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer w-fit xl:w-full">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-white shrink-0">
                  {user ? user.firstName.charAt(0) : "G"}
                </div>
                <div className="hidden xl:block">
                  <p className="font-bold text-sm leading-tight text-slate-900 dark:text-slate-200">
                    {user ? `${user.firstName} ${user.lastName || ""}` : "Guest Mode"}
                  </p>
                  <p className="text-slate-500 text-sm">@{user ? user.firstName.toLowerCase() : "guest"}</p>
                </div>
              </div>
              <MoreHorizontal size={20} className="text-slate-500 hidden xl:block shrink-0" />
            </div>
          </div>
        </aside>

        {/* ── dynamic nested routes rendered here ── */}
        <Outlet context={{ isCollapsed, setIsCollapsed }} />

      </div>
    </div>
  );
}

export default FeedLabLayout;

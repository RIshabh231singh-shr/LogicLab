import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useDispatch } from "react-redux";
import { logoutUser } from "../authSlice";
import axiosClient from "../utility/axios";
import {
  Loader2,
  Mail,
  Calendar,
  ShieldCheck,
  Award,
  MapPin,
  LogOut,
  User,
  Briefcase,
  GraduationCap,
  Wrench,
  Trophy,
  CheckCircle2,
  Plus,
  RefreshCw,
  Trash2,
  ChevronRight,
  Activity,
} from "lucide-react";

function AdminInfo() {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchAdmin() {
      try {
        const res = await axiosClient.get("/user/getprofile");
        setAdmin(res.data.user);
      } catch (err) {
        console.error("Failed to load admin info", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAdmin();
  }, []);

  const handleLogout = () => dispatch(logoutUser());

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-slate-400">Admin data not found.</p>
      </div>
    );
  }

  const quickActions = [
    { label: "Create Problem", icon: Plus, to: "/admin/create", color: "from-indigo-500 to-purple-600" },
    { label: "Update Problem", icon: RefreshCw, to: "/admin/update", color: "from-purple-500 to-pink-600" },
    { label: "Delete Problem", icon: Trash2,   to: "/admin/delete", color: "from-rose-500 to-red-600" },
  ];

  const solvedCount = admin.problemSolved?.length || 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── HERO CARD ── */}
      <div className="bg-slate-900 rounded-3xl border border-slate-600 relative overflow-hidden">
        {/* bg glow */}
        <div className="absolute -right-24 -top-24 bg-indigo-500/10 w-80 h-80 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 bottom-0 bg-purple-500/10 w-60 h-60 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row gap-0 relative">
          {/* Avatar column */}
          <div className="md:w-56 flex flex-col items-center justify-center p-8 border-b md:border-b-0 md:border-r border-slate-700 bg-slate-800/50 shrink-0 gap-4">
            <div className="relative">
              <div className="w-28 h-28 rounded-3xl overflow-hidden ring-4 ring-white/5 shadow-2xl shadow-indigo-900/30">
                {admin.profilePicture ? (
                  <img src={admin.profilePicture} alt={admin.firstName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full vibrant-gradient flex items-center justify-center text-white text-4xl font-black">
                    {admin.firstName?.[0]?.toUpperCase() || <User size={36} />}
                  </div>
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-indigo-600 p-2 rounded-xl border-4 border-slate-950 shadow-lg">
                <ShieldCheck size={14} className="text-white" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-xs font-black uppercase tracking-widest text-indigo-300">Administrator</p>
            </div>
          </div>

          {/* Info column */}
          <div className="flex-1 p-8 space-y-5">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-white tracking-tight">
                  Welcome back, {admin.firstName}!
                </h1>
                <p className="text-slate-200 text-sm mt-1">Here's your admin overview.</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-rose-400 border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 transition-all shrink-0"
              >
                <LogOut size={15} />
                Logout
              </button>
            </div>

            {/* Info chips */}
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-700 border border-slate-500 text-xs text-white">
                <Mail size={11} className="text-indigo-400" />
                <span className="font-medium">{admin.emailId}</span>
              </div>
              {admin.age && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-700 border border-slate-500 text-xs text-white">
                  <Calendar size={11} className="text-indigo-400" />
                  <span className="font-medium">{admin.age} yrs</span>
                </div>
              )}
              {admin.location && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-700 border border-slate-500 text-xs text-white">
                  <MapPin size={11} className="text-indigo-400" />
                  <span className="font-medium">{admin.location}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-xs text-indigo-200">
                <ShieldCheck size={11} />
                <span className="font-black uppercase tracking-wider">{admin.role}</span>
              </div>
            </div>

            {/* Stats strip */}
            <div className="flex flex-wrap gap-6 pt-4 border-t border-slate-700">
              <div className="flex items-center gap-2">
                <Activity size={15} className="text-indigo-400" />
                <span className="text-xs font-black uppercase tracking-widest text-slate-200">Problems Solved:</span>
                <span className="text-sm font-mono text-white font-black">{solvedCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <Award size={15} className="text-indigo-400" />
                <span className="text-xs font-black uppercase tracking-widest text-slate-200">Badge:</span>
                <span className="text-sm font-bold text-white">{solvedCount > 10 ? "Code Ninja" : "Beginner"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── QUICK ACTIONS ── */}
      <div>
        <h2 className="text-sm font-black uppercase tracking-widest text-white mb-4 px-1">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickActions.map(({ label, icon: Icon, to, color }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="bg-slate-800 rounded-2xl p-5 border border-slate-600 hover:border-indigo-500/50 transition-all group text-left hover:translate-y-[-2px] active:translate-y-0"
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3 shadow-lg`}>
                <Icon size={18} className="text-white" />
              </div>
              <p className="font-black text-white group-hover:text-indigo-200 transition-colors">{label}</p>
              <div className="flex items-center gap-1 mt-1 text-slate-300 group-hover:text-indigo-300 transition-colors">
                <span className="text-xs font-bold">Go to page</span>
                <ChevronRight size={12} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── SOLVED PROBLEMS ── */}
      <div>
        <div className="flex items-center justify-between px-1 mb-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
            <Trophy size={14} className="text-indigo-400" />
            Problems Solved
          </h2>
          <span className="px-3 py-1 rounded-full bg-slate-800 border border-slate-600 text-xs font-black text-white uppercase tracking-widest">
            {solvedCount} Total
          </span>
        </div>

        {solvedCount > 0 ? (
          <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
            {admin.problemSolved.map((p, idx) => (
              <div
                key={p._id}
                className="bg-slate-800 group rounded-2xl px-5 py-4 border border-slate-600 hover:border-indigo-500/40 transition-all flex items-center justify-between cursor-pointer"
                onClick={() => navigate(`/problem/${p._id}?loadLast=true`)}
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-xl bg-slate-700 flex items-center justify-center text-emerald-300 text-xs font-black">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">{p.title}</p>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${
                      p.difficulty?.toLowerCase() === "easy" ? "text-emerald-400" :
                      p.difficulty?.toLowerCase() === "medium" ? "text-amber-400" : "text-rose-400"
                    }`}>
                      {p.difficulty}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-emerald-400 opacity-60 group-hover:opacity-100 transition-opacity">
                  <CheckCircle2 size={16} />
                  <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-800 rounded-2xl p-8 border border-slate-600 text-center">
            <Trophy size={40} className="mx-auto text-slate-400 mb-3" />
            <p className="text-slate-200 text-sm font-bold">No problems solved yet.</p>
          </div>
        )}
      </div>

      {/* ── SKILLS ── */}
      {admin.skills?.length > 0 && (
        <div>
          <h2 className="text-sm font-black uppercase tracking-widest text-white mb-4 px-1 flex items-center gap-2">
            <Wrench size={14} className="text-indigo-400" />
            Skills
          </h2>
          <div className="flex flex-wrap gap-2">
            {admin.skills.map((skill, i) => (
              <span key={i} className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-xs font-bold text-indigo-300">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── WORK ── */}
      {admin.work?.length > 0 && (
        <div>
          <h2 className="text-sm font-black uppercase tracking-widest text-white mb-4 px-1 flex items-center gap-2">
            <Briefcase size={14} className="text-indigo-400" />
            Work Experience
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {admin.work.map((w, i) => (
              <div key={i} className="bg-slate-800 rounded-2xl p-5 border border-slate-600">
                <p className="font-black text-white">{w.role}</p>
                <p className="text-sm text-slate-200 font-medium">{w.company}</p>
                {(w.from || w.to) && (
                  <p className="text-xs text-slate-300 uppercase tracking-widest mt-2 font-bold">
                    {w.from} {w.from && w.to ? "→" : ""} {w.to}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── EDUCATION ── */}
      {admin.education?.length > 0 && (
        <div>
          <h2 className="text-sm font-black uppercase tracking-widest text-white mb-4 px-1 flex items-center gap-2">
            <GraduationCap size={14} className="text-indigo-400" />
            Education
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {admin.education.map((e, i) => (
              <div key={i} className="bg-slate-800 rounded-2xl p-5 border border-slate-600">
                <p className="font-black text-white">{e.degree}</p>
                <p className="text-sm text-slate-200 font-medium">{e.institution}</p>
                {(e.from || e.to) && (
                  <p className="text-xs text-slate-300 uppercase tracking-widest mt-2 font-bold">
                    {e.from} {e.from && e.to ? "→" : ""} {e.to}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminInfo;

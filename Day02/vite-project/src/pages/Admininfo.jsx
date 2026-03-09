import { useEffect, useState } from "react";
import {
  Terminal,
  Sun,
  Moon,
  ChevronDown,
  LogOut,
  Mail,
  Calendar,
  ShieldCheck,
  Award,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { NavLink } from "react-router";
import { useDispatch } from "react-redux";
import { logoutUser } from "../authSlice";
import axiosClient from "../utility/axios";

function AdminInfo() {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState("dark");
  const dispatch = useDispatch();

  /* ================= FETCH ADMIN ================= */
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

  /* ================= THEME ================= */
  useEffect(() => {
    document.body.className =
      theme === "dark"
        ? "bg-slate-950 text-slate-200"
        : "bg-slate-50 text-slate-900";
  }, [theme]);

  const toggleTheme = () =>
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  const handleLogout = () => dispatch(logoutUser());

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!admin) {
    return <p className="text-center mt-10">Admin data not found</p>;
  }

  /* ================= UI ================= */
  return (
    <div className="min-h-screen">
      {/* MAIN */}
      <main className="max-w-5xl mx-auto p-6 space-y-8">
        {/* HEADER */}
        <div className="bg-slate-900 p-6 rounded-xl space-y-2">
          <h1 className="text-3xl font-bold text-white">
            Welcome, {admin.firstName} {admin.lastName}
          </h1>
          <span className="text-indigo-400 uppercase text-xs font-bold">
            {admin.role}
          </span>
        </div>

        {/* INFO */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-slate-900 p-6 rounded-xl space-y-4">
            <div className="flex items-center gap-3">
              <Mail size={18} />
              <span className="text-white">{admin.emailId}</span>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="text-white" size={18} />
              <span className="text-white">{admin.age} years</span>
            </div>

            <div className="flex items-center gap-3">
              <ShieldCheck className="text-white" size={18} />
              <span className="capitalize text-white">{admin.role}</span>
            </div>
          </div>

          {/* STATS */}
          <div className="md:col-span-2 bg-slate-900 p-6 rounded-xl">
            <div className="flex items-center gap-2 mb-4">
              <Award className="text-white" />
              <h3 className="font-bold text-white">Problems Solved</h3>
            </div>

            {admin.problemSolved?.length > 0 ? (
              <div className="space-y-3">
                {admin.problemSolved.map((p, idx) => (
                  <div
                    key={p._id}
                    className="flex justify-between items-center bg-slate-800 p-4 rounded-lg"
                  >
                    <span className="text-white">
                      {idx + 1}. {p.title}
                    </span>
                    <span className="text-sm text-slate-400 capitalize">
                      {p.difficulty}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500">No problems solved yet.</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default AdminInfo;

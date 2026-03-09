import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import axiosClient from "../utility/axios";
import { useNavigate, NavLink, Outlet } from "react-router";

import {
  Terminal,
  Sun,
  Moon,
  ChevronDown,
  Plus,
  Trash2,
  Code2,
  Bug,
  Settings,
  FileText,
  Save,
} from "lucide-react";

/* ================= SCHEMA ================= */
function AdminPanel() {
  const navigate = useNavigate();
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    document.body.className =
      theme === "dark"
        ? "bg-slate-950 text-slate-200"
        : "bg-slate-50 text-slate-900";
  }, [theme]);

  /* ================= UI ================= */

  return (
    <div className="min-h-screen">
      {/* NAVBAR */}
      <nav className="border-b border-white/10 px-6 py-3 flex justify-between">
        <NavLink to="/" className="flex items-center gap-2">
          <div className="bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500 p-2 rounded-xl">
            <Terminal className="text-white" />
          </div>
          <span className="text-xl font-bold">LogicLab</span>
        </NavLink>
        <div className="flex  items-center gap-8">
          <NavLink to="/admin/info">
            <span>Info</span>
          </NavLink>
          <NavLink to="/admin/create">
            <span>CreateProblem</span>
          </NavLink>
          <NavLink to="/admin/update">
            <span>UpdateProblem</span>
          </NavLink>
          <NavLink to="/admin/delete">
            <span>DeleteProblem</span>
          </NavLink>

          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2"
          >
            {theme === "dark" ? <Sun /> : <Moon />}
          </button>
        </div>
      </nav>

      {/* MAIN */}
      <main className="max-w-5xl mx-auto p-6 space-y-8">
        {/*nested Routing*/}
        <Outlet></Outlet>
      </main>
    </div>
  );
}

export default AdminPanel;

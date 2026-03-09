import { useEffect, useState } from "react";
import axiosClient from "../utility/axios";
import { useNavigate } from "react-router";
import {
  Loader2, Trash2, XCircle, CheckCircle, AlertTriangle,
  Search, X
} from "lucide-react";

export default function DeletePanel() {
  const navigate = useNavigate();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState(null);   // which problem is being deleted (spinner)
  const [confirmId, setConfirmId] = useState(null);     // which problem is in confirm modal
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  /* ================= FETCH ALL PROBLEMS ================= */
  const fetchProblems = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axiosClient.get("/problem/getAllProblem");
      setProblems(data);
    } catch (err) {
      setError("Failed to load problems.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProblems();
  }, []);

  /* ================= DELETE ================= */
  const handleDelete = async () => {
    if (!confirmId) return;
    setDeletingId(confirmId);
    setConfirmId(null);
    try {
      await axiosClient.delete(`/problem/delete/${confirmId}`);
      setProblems((prev) => prev.filter((p) => p._id !== confirmId));
      showToast("success", "Problem deleted successfully.");
    } catch (err) {
      const msg = err?.response?.data || "Failed to delete problem.";
      showToast("error", msg);
    } finally {
      setDeletingId(null);
    }
  };

  /* ================= HELPERS ================= */
  const diffColor = (d) => {
    if (d === "easy") return "text-emerald-400 bg-emerald-400/10";
    if (d === "medium") return "text-amber-400 bg-amber-400/10";
    return "text-rose-400 bg-rose-400/10";
  };

  const filtered = problems.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <XCircle className="w-10 h-10 text-rose-400 mx-auto" />
          <p className="text-rose-300">{error}</p>
          <button onClick={fetchProblems} className="text-indigo-400 underline text-sm">Retry</button>
        </div>
      </div>
    );
  }

  /* ================= UI ================= */
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">

      {/* TOAST */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl border
          ${toast.type === "success"
            ? "bg-emerald-950 border-emerald-500/40 text-emerald-300"
            : "bg-rose-950 border-rose-500/40 text-rose-300"
          }`}
        >
          {toast.type === "success"
            ? <CheckCircle className="w-5 h-5" />
            : <XCircle className="w-5 h-5" />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* CONFIRM MODAL */}
      {confirmId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl space-y-6">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-rose-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Delete Problem?</h2>
              <p className="text-slate-400 text-sm">
                This action is <span className="text-rose-400 font-semibold">permanent</span> and cannot be undone.
                The problem and all its test cases will be removed.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmId(null)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition"
              >
                <X className="w-4 h-4" /> Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium transition"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 py-10 space-y-8">

        {/* HEADER */}
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Delete Problem</h1>
          <p className="text-slate-400 mt-1 text-sm">Remove a problem from LogicLab permanently</p>
        </div>

        {/* SEARCH */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search problems..."
            className="w-full bg-slate-900/70 border border-white/[0.06] text-slate-200 pl-11 pr-4 py-3 rounded-xl outline-none focus:border-indigo-500/50 text-sm transition"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* COUNT */}
        <p className="text-slate-500 text-sm">{filtered.length} problem{filtered.length !== 1 ? "s" : ""} found</p>

        {/* PROBLEM LIST */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <p className="text-lg">No problems match your search.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((problem) => (
              <div
                key={problem._id}
                className="flex items-center justify-between bg-slate-900/70 border border-white/[0.06] rounded-xl px-6 py-4 hover:border-rose-500/20 transition group"
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <h2 className="font-semibold text-slate-200 truncate">{problem.title}</h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${diffColor(problem.difficulty)}`}>
                      {problem.difficulty}
                    </span>
                    {problem.tags?.map((tag, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-slate-700/50 text-slate-400 text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setConfirmId(problem._id)}
                  disabled={deletingId === problem._id}
                  className="ml-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600/10 border border-rose-500/20 text-rose-400 hover:bg-rose-600/20 hover:border-rose-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium"
                >
                  {deletingId === problem._id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  {deletingId === problem._id ? "Deleting..." : "Delete"}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
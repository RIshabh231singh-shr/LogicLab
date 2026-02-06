import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router";
import { Search, Loader2 } from "lucide-react";
import axiosClient from "../utility/axios";

export default function AllProblems() {
  const [problems, setProblems] = useState([]);
  const [searchProblem, setSearchProblem] = useState("");
  const [loading, setLoading] = useState(true);

  /* ================= FETCH ALL PROBLEMS ================= */
  const fetchProblems = async () => {
    try {
      const { data } = await axiosClient.get("/problem/getAllProblem");
      setProblems(data); // backend returns array
    } catch (err) {
      console.error("Failed to fetch problems", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProblems();
  }, []);

  /* ================= SEARCH ================= */
  const filteredProblems = problems.filter((problem) =>
    problem.title.toLowerCase().includes(searchProblem.toLowerCase()),
  );

  const getDifficultyStyle = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case "easy":
        return "text-emerald-400 bg-emerald-400/10";
      case "medium":
        return "text-amber-400 bg-amber-400/10";
      case "hard":
        return "text-rose-400 bg-rose-400/10";
      default:
        return "text-slate-400 bg-slate-400/10";
    }
  };

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* SEARCH BAR */}
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Search problems..."
            value={searchProblem}
            onChange={(e) => setSearchProblem(e.target.value)}
            className="w-full bg-slate-800/60 border border-white/10 pl-12 pr-4 py-3 rounded-xl focus:outline-none"
          />
        </div>

        {/* PROBLEMS LIST */}
        <div className="grid gap-4">
          {filteredProblems.length === 0 && (
            <p className="text-slate-500 text-center">No problems found</p>
          )}

          {filteredProblems.map((problem) => (
            <div
              key={problem._id}
              className="bg-slate-800/60 border border-white/10 rounded-xl px-6 py-5 hover:border-indigo-500/40 transition"
            >
              <h2 className="text-lg font-semibold mb-2">
                <NavLink
                  to={`/admin/update/${problem._id}`}
                  className="hover:text-indigo-400"
                >
                  {problem.title}
                </NavLink>
              </h2>

              <div className="flex items-center gap-3 text-sm">
                {/* Difficulty */}
                <span
                  className={`px-3 py-1 rounded-lg font-bold ${getDifficultyStyle(
                    problem.difficulty,
                  )}`}
                >
                  {problem.difficulty}
                </span>

                {/* Tags */}
                {problem.tags?.map((tag, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded-lg bg-slate-700/50 text-slate-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
      <Outlet></Outlet>
    </div>
  );
}

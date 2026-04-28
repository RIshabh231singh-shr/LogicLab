import { useEffect, useState } from "react";
import { NavLink } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import {
  LogOut,
  Search,
  Filter,
  ChevronDown,
  CheckCircle2,
  Trophy,
  Sun,
  Moon,
  Layers,
  Zap,
  User,
  MessageCircle,
} from "lucide-react";
import axiosClient from "../utility/axios";
import { logoutUser } from "../authSlice";

function Homepage() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const [problems, setProblems] = useState([]);
  const [solvedProblems, setSolvedProblems] = useState([]);
  const [profilePicture, setProfilePicture] = useState(null);
  const [theme, setTheme] = useState("dark");
  const [searchProblem, setSearchProblem] = useState("");
  const [filters, setFilters] = useState({
    difficulty: "all",
    tag: "all",
    status: "all",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [serverTotalPages, setServerTotalPages] = useState(1);
  const itemsPerPage = 10;


  useEffect(() => {
    setCurrentPage(1);
  }, [searchProblem, filters]);

  /* ================= THEME ================= */
  useEffect(() => {
    if (theme === "dark") {
      document.body.className = "bg-slate-950 text-slate-100";
    } else {
      document.body.className = "bg-slate-50 text-slate-900";
    }
  }, [theme]);

  /* ================= DATA FETCH ================= */
  useEffect(() => {
    const fetchProblems = async () => {
      try {
        const { data } = await axiosClient.get(
          `/problem/getAllProblem?page=${currentPage}&limit=${itemsPerPage}&search=${searchProblem}&difficulty=${filters.difficulty}&tag=${filters.tag}`,
        );
        // Handle both old array response and new paginated object response
        const problemList = data.problems || data;
        setProblems(Array.isArray(problemList) ? problemList : []);
        if (data.totalPages) {
          setServerTotalPages(data.totalPages);
        }
      } catch (err) {
        console.error(err);
      }
    };


    const fetchSolvedProblems = async () => {
      try {
        const { data } = await axiosClient.get(
          "/problem/problemSolvedByUser/user",
        );
        setSolvedProblems(data);
      } catch (err) {
        console.error(err);
      }
    };

    const fetchProfilePicture = async () => {
      try {
        const { data } = await axiosClient.get("/user/getprofile");
        setProfilePicture(data.user?.profilePicture || null);
      } catch (err) {
        console.error(err);
      }
    };

    fetchProblems();
    if (user) {
      fetchSolvedProblems();
      fetchProfilePicture();
    }
  }, [user, currentPage, searchProblem, filters.difficulty, filters.tag]);


  /* ================= LOGOUT ================= */
  const handleLogout = () => {
    dispatch(logoutUser());
    setSolvedProblems([]);
  };

  /* ================= FILTER ================= */
  const filteredProblems = problems.filter((problem) => {
    // Only filter by status on frontend, as others are handled by backend
    const isSolved = solvedProblems.some((sp) => sp._id === problem._id);
    const statusMatch =
      filters.status === "all" || (filters.status === "solved" && isSolved);

    return statusMatch;
  });


  const totalPages = serverTotalPages;
  const currentProblems = filteredProblems;


  return (
    <div className="min-h-screen transition-colors duration-300">
      {/* ================= NAVBAR ================= */}
      <nav className="sticky top-0 z-50 glass border-b border-white/5 px-6 py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="logo">
            <span>LogicLab</span>
          </h1>

          <div className="flex items-center gap-4">
            {user && (
              <NavLink
                to="/feedlab"
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 font-bold hover:bg-indigo-500/20 transition-all font-mono text-sm tracking-wide"
              >
                <MessageCircle size={24} />
                <span className="hidden sm:inline">FeedLab</span>
              </NavLink>
            )}

            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-xl glass hover:bg-white/10"
            >
              {theme === "dark" ? <Sun /> : <Moon />}
            </button>

            {user && (
              <div className="relative group inline-block">
                <button className="flex items-center gap-2 glass px-3 py-1 rounded-full">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-indigo-500 flex items-center justify-center text-white font-bold">
                    {profilePicture ? (
                      <img src={profilePicture} alt={user.firstName} className="w-full h-full object-cover" />
                    ) : (
                      user.firstName[0]
                    )}
                  </div>
                  <span className="hidden md:block">{user.firstName}</span>
                  <ChevronDown size={14} />
                </button>

                <div className="absolute right-0 top-full w-40 glass rounded-xl opacity-0 invisible group-hover:visible group-hover:opacity-100 transition z-50 overflow-hidden shadow-2xl border border-white/10">
                  <NavLink
                    to="/profile"
                    className="flex items-center gap-2 w-full px-4 py-3 text-slate-200 text-sm font-bold hover:bg-white/5 transition"
                  >
                    <User size={16} className="text-indigo-400" />
                    My Profile
                  </NavLink>
                  {user?.role === "admin" && (
                    <NavLink
                      to="/admin/info"
                      className="flex items-center gap-2 w-full px-4 py-3 text-slate-200 text-sm font-bold hover:bg-white/5 transition border-t border-white/5"
                    >
                      <Layers size={16} className="text-amber-400" />
                      AdminPanel
                    </NavLink>
                  )}
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-4 py-3 text-rose-400 hover:bg-white/5 transition border-t border-white/5 text-sm font-bold"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ================= MAIN ================= */}
      <main className="max-w-7xl mx-auto p-6 space-y-8">
        {/* HERO */}
        <div className="glass rounded-3xl p-8 relative overflow-hidden">
          <Trophy size={180} className="absolute right-4 top-4 opacity-10" />
          <h1 className="text-4xl font-extrabold">
            Hello,{" "}
            <span className="text-indigo-500">
              {user?.firstName || "Guest"}
            </span>
          </h1>
          <p className="text-slate-400 mt-2">
            Ready to solve today’s DSA challenge?
          </p>
        </div>
        {/* SEARCH + FILTER */}
        <div className="flex flex-wrap gap-4 justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              placeholder="Search problems..."
              value={searchProblem}
              onChange={(e) => setSearchProblem(e.target.value)}
              className="w-full glass pl-12 pr-4 py-3 rounded-xl focus:outline-none"
            />
          </div>

          <div className="flex gap-3">
            <select
              className="glass px-4 py-2 rounded-xl"
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
            >
              <option className="text-black" value="all">
                All
              </option>
              <option className="text-black" value="solved">
                Solved
              </option>
            </select>

            <select
              className="glass px-4 py-2 rounded-xl"
              value={filters.difficulty}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  difficulty: e.target.value,
                })
              }
            >
              <option className="text-black" value="all">
                Difficulty
              </option>
              <option className="text-black" value="easy">
                Easy
              </option>
              <option className="text-black" value="medium">
                Medium
              </option>
              <option className="text-black" value="hard">
                Hard
              </option>
            </select>
          </div>
        </div>

        {/* PROBLEMS */}
        <div className="grid gap-4">
          {currentProblems.map((problem) => {
            const solved = solvedProblems.some((sp) => sp._id === problem._id);

            return (
              <div
                key={problem._id}
                className="glass rounded-2xl p-6 border border-white/5"
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">
                    <NavLink
                      to={`/problem/${problem._id}`}
                      className="hover:text-indigo-500"
                    >
                      {problem.title}
                    </NavLink>
                  </h2>

                  {solved && (
                    <span className="flex items-center gap-1 text-emerald-400 font-500 font-bold">
                      <CheckCircle2 size={18} /> Solved
                    </span>
                  )}
                </div>

                <div className="flex gap-2 mt-3">
                  <span
                    className={`px-3 py-1 rounded-lg text-xl font-bold ${getDifficultyStyle(
                      problem.difficulty,
                    )}`}
                  >
                    {problem.difficulty}
                  </span>

                  {problem.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-slate-500/10 rounded-lg text-xl"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-8">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-6 py-2 glass rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition font-bold"
            >
              Previous
            </button>
            <span className="text-slate-400 font-medium font-mono">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-6 py-2 glass rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition font-bold"
            >
              Next
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

/* ================= HELPERS ================= */
const getDifficultyStyle = (difficulty) => {
  switch (difficulty.toLowerCase()) {
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

export default Homepage;

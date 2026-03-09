import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import axiosClient from "../utility/axios";
import { useNavigate, useParams } from "react-router";
import {
  Loader2, Plus, Trash2, CheckCircle, XCircle,
  Code2, Eye, EyeOff, RefreshCw, BookOpen
} from "lucide-react";

/* ================= SCHEMA ================= */
const problemSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  difficulty: z.enum(["easy", "medium", "hard"]),
  tags: z.enum(["array", "linkedlist", "graph", "dp"]),
  visibletestCase: z.array(
    z.object({
      input: z.string().min(1, "Input required"),
      output: z.string().min(1, "Output required"),
      explanation: z.string().min(1, "Explanation required"),
    })
  ).min(1),
  hiddentestCase: z.array(
    z.object({
      input: z.string().min(1, "Input required"),
      output: z.string().min(1, "Output required"),
    })
  ).min(1),
  startCode: z.array(
    z.object({
      language: z.enum(["C++", "Java", "JavaScript"]),
      initialCode: z.string().min(1, "Starter code required"),
    })
  ),
  referenceSolution: z.array(
    z.object({
      language: z.enum(["C++", "Java", "JavaScript"]),
      completeCode: z.string().min(1, "Solution code required"),
    })
  ),
});

/* ================= CONSTANTS ================= */
const LANGS = ["C++", "Java", "JavaScript"];
const LANG_COLORS = {
  "C++": "text-sky-400 border-sky-400/40 bg-sky-400/10",
  "Java": "text-orange-400 border-orange-400/40 bg-orange-400/10",
  "JavaScript": "text-yellow-400 border-yellow-400/40 bg-yellow-400/10",
};
const DIFF_COLORS = {
  easy: "text-emerald-400 border-emerald-400/40 bg-emerald-400/10",
  medium: "text-amber-400 border-amber-400/40 bg-amber-400/10",
  hard: "text-rose-400 border-rose-400/40 bg-rose-400/10",
};
const TAG_LABELS = {
  array: "Array", linkedlist: "Linked List", graph: "Graph", dp: "Dynamic Programming",
};

/**
 * Normalize any language string from the DB to our canonical display names.
 * Handles: "cpp", "c++", "C++", "javascript", "Javascript", "js", "java", "Java", etc.
 */
function normalizeLang(lang) {
  if (!lang) return null;
  const l = lang.toLowerCase().trim();
  if (l === "c++" || l === "cpp") return "C++";
  if (l === "java") return "Java";
  if (l === "javascript" || l === "js") return "JavaScript";
  return lang; // fallback — return as-is
}

/**
 * Sort startCode / referenceSolution from the backend to always be
 * [C++, Java, JavaScript] order, matching by language name (case-insensitive).
 * Fixes "JavaScript code appearing in C++ field" and "code not prefilling" bugs.
 */
function sortByLanguage(arr, codeKey) {
  return LANGS.map((lang) => {
    const found = arr?.find((item) => normalizeLang(item.language) === lang);
    if (found) {
      // Normalize the language field too so the form value is always canonical
      return { ...found, language: lang };
    }
    return { language: lang, [codeKey]: "" };
  });
}

/* ================= COMPONENT ================= */
function UpdatePanel() {
  const navigate = useNavigate();
  const { id } = useParams();

  // UI state (formerly dead code — now all used)
  const [activeTab, setActiveTab] = useState("C++");     // language tab switcher
  const [showPreview, setShowPreview] = useState(false); // live problem preview panel
  const [toast, setToast] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  /* ================= FORM ================= */
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(problemSchema),
    defaultValues: {
      difficulty: "medium",
      tags: "array",
      visibletestCase: [{ input: "", output: "", explanation: "" }],
      hiddentestCase: [{ input: "", output: "" }],
      startCode: LANGS.map((lang) => ({ language: lang, initialCode: "" })),
      referenceSolution: LANGS.map((lang) => ({ language: lang, completeCode: "" })),
    },
  });

  const { fields: visibleFields, append: appendVisible, remove: removeVisible } =
    useFieldArray({ control, name: "visibletestCase" });

  const { fields: hiddenFields, append: appendHidden, remove: removeHidden } =
    useFieldArray({ control, name: "hiddentestCase" });

  /* ================= FETCH EXISTING PROBLEM ================= */
  useEffect(() => {
    const fetchProblem = async () => {
      setFetchLoading(true);
      setFetchError(null);
      try {
        const res = await axiosClient.get(`/problem/ProblemById/${id}`);
        const problem = res.data;

        // Sort arrays so index always matches [C++, Java, JavaScript] order
        const sortedStartCode = sortByLanguage(problem.startCode, "initialCode");
        const sortedSolution  = sortByLanguage(problem.referenceSolution, "completeCode");

        reset({
          title: problem.title,
          description: problem.description,
          difficulty: problem.difficulty,
          tags: problem.tags?.[0] || "array",
          visibletestCase: problem.visibletestCase?.length
            ? problem.visibletestCase
            : [{ input: "", output: "", explanation: "" }],
          hiddentestCase: problem.hiddentestCase?.length
            ? problem.hiddentestCase
            : [{ input: "", output: "" }],
          startCode: sortedStartCode,
          referenceSolution: sortedSolution,
        });
      } catch (err) {
        setFetchError("Failed to load problem. It may not exist.");
      } finally {
        setFetchLoading(false);
      }
    };

    if (id) fetchProblem();
  }, [id, reset]);

  /* ================= SUBMIT ================= */
  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      await axiosClient.put(`/problem/update/${id}`, data);
      showToast("success", "Problem updated successfully!");
      setTimeout(() => navigate("/admin"), 1500);
    } catch (err) {
      const msg = err?.response?.data || "Failed to update problem.";
      showToast("error", msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // watch() values used for live preview and stats bar
  const title        = watch("title");
  const description  = watch("description");
  const difficulty   = watch("difficulty");
  const tag          = watch("tags");
  const visibleCases = watch("visibletestCase");
  const hiddenCases  = watch("hiddentestCase");

  /* ================= LOADING / ERROR ================= */
  if (fetchLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mx-auto" />
          <p className="text-slate-400">Loading problem...</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <XCircle className="w-10 h-10 text-rose-400 mx-auto" />
          <p className="text-rose-300">{fetchError}</p>
          <button onClick={() => navigate("/admin")} className="text-indigo-400 underline text-sm">
            Back to Admin
          </button>
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
          {toast.type === "success" ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 py-10 space-y-8">

        {/* HEADER */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Update: <span className="text-indigo-400">{title || "Problem"}</span>
            </h1>
            <p className="text-slate-400 mt-1 text-sm">Edit an existing problem in LogicLab</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPreview((v) => !v)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition
                ${showPreview
                  ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-300"
                  : "bg-slate-800 border-white/[0.06] text-slate-400 hover:text-slate-200"
                }`}
            >
              <BookOpen className="w-4 h-4" />
              {showPreview ? "Hide Preview" : "Live Preview"}
            </button>
            <span className={`px-3 py-1 rounded-lg text-xs font-bold border uppercase tracking-wider ${DIFF_COLORS[difficulty] || DIFF_COLORS.medium}`}>
              {difficulty}
            </span>
          </div>
        </div>

        {/* LIVE STATS BAR */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Difficulty", value: difficulty?.charAt(0).toUpperCase() + difficulty?.slice(1) || "—" },
            { label: "Tag",        value: TAG_LABELS[tag] || tag || "—" },
            { label: "Visible Cases", value: visibleCases?.length ?? 0 },
            { label: "Hidden Cases",  value: hiddenCases?.length ?? 0 },
          ].map(({ label, value }) => (
            <div key={label} className="bg-slate-900/60 border border-white/[0.06] rounded-xl p-3 text-center">
              <div className="text-xs text-slate-500 mb-1">{label}</div>
              <div className="text-sm font-bold text-slate-200">{value}</div>
            </div>
          ))}
        </div>

        {/* LIVE PREVIEW PANEL */}
        {showPreview && (
          <div className="bg-slate-900/70 border border-indigo-500/20 rounded-2xl p-6 space-y-4">
            <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-3">📖 Problem Preview</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3 flex-wrap">
                <h3 className="text-xl font-bold text-white flex-1">
                  {title || <span className="text-slate-500 italic">No title yet</span>}
                </h3>
                <div className="flex gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold border ${DIFF_COLORS[difficulty] || ""}`}>
                    {difficulty}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-700/50 text-slate-300 text-xs">
                    {TAG_LABELS[tag] || tag}
                  </span>
                </div>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed whitespace-pre-wrap">
                {description || <span className="italic">No description yet...</span>}
              </p>
              {visibleCases?.length > 0 && visibleCases[0]?.input && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-400 uppercase">Example</p>
                  <div className="bg-slate-800/60 rounded-lg p-3 font-mono text-sm space-y-1">
                    <div><span className="text-slate-500">Input: </span><span className="text-slate-200">{visibleCases[0].input}</span></div>
                    <div><span className="text-slate-500">Output: </span><span className="text-emerald-400">{visibleCases[0].output}</span></div>
                    {visibleCases[0].explanation && (
                      <div className="text-slate-400 text-xs pt-1">{visibleCases[0].explanation}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

          {/* BASIC INFO */}
          <Section title="Basic Info" icon="📝">
            <div className="space-y-4">
              <div>
                <label className="label-text">Title</label>
                <input {...register("title")} placeholder="e.g. Two Sum" className="input-field" />
                {errors.title && <ErrorMsg msg={errors.title.message} />}
              </div>
              <div>
                <label className="label-text">Description</label>
                <textarea {...register("description")} placeholder="Problem statement..." rows={5} className="input-field resize-none" />
                {errors.description && <ErrorMsg msg={errors.description.message} />}
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="label-text">Difficulty</label>
                  <select {...register("difficulty")} className="input-field">
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="label-text">Tag</label>
                  <select {...register("tags")} className="input-field">
                    <option value="array">Array</option>
                    <option value="linkedlist">Linked List</option>
                    <option value="graph">Graph</option>
                    <option value="dp">Dynamic Programming</option>
                  </select>
                </div>
              </div>
            </div>
          </Section>

          {/* VISIBLE TEST CASES */}
          <Section title="Visible Test Cases" icon={<Eye className="w-4 h-4" />}>
            <div className="space-y-4">
              {visibleFields.map((field, i) => (
                <div key={field.id} className="bg-slate-800/60 border border-white/5 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Case #{i + 1}</span>
                    {visibleFields.length > 1 && (
                      <button type="button" onClick={() => removeVisible(i)} className="text-rose-400 hover:text-rose-300 transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <input {...register(`visibletestCase.${i}.input`)} placeholder="Input" className="input-field font-mono text-sm" />
                  {errors.visibletestCase?.[i]?.input && <ErrorMsg msg={errors.visibletestCase[i].input.message} />}
                  <input {...register(`visibletestCase.${i}.output`)} placeholder="Expected Output" className="input-field font-mono text-sm" />
                  {errors.visibletestCase?.[i]?.output && <ErrorMsg msg={errors.visibletestCase[i].output.message} />}
                  <textarea {...register(`visibletestCase.${i}.explanation`)} placeholder="Explanation" rows={2} className="input-field resize-none text-sm" />
                  {errors.visibletestCase?.[i]?.explanation && <ErrorMsg msg={errors.visibletestCase[i].explanation.message} />}
                </div>
              ))}
              <button type="button" onClick={() => appendVisible({ input: "", output: "", explanation: "" })} className="add-btn">
                <Plus className="w-4 h-4" /> Add Visible Case
              </button>
            </div>
          </Section>

          {/* HIDDEN TEST CASES */}
          <Section title="Hidden Test Cases" icon={<EyeOff className="w-4 h-4" />}>
            <div className="space-y-4">
              {hiddenFields.map((field, i) => (
                <div key={field.id} className="bg-slate-800/60 border border-white/5 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Case #{i + 1}</span>
                    {hiddenFields.length > 1 && (
                      <button type="button" onClick={() => removeHidden(i)} className="text-rose-400 hover:text-rose-300 transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <input {...register(`hiddentestCase.${i}.input`)} placeholder="Input" className="input-field font-mono text-sm" />
                  {errors.hiddentestCase?.[i]?.input && <ErrorMsg msg={errors.hiddentestCase[i].input.message} />}
                  <input {...register(`hiddentestCase.${i}.output`)} placeholder="Expected Output" className="input-field font-mono text-sm" />
                  {errors.hiddentestCase?.[i]?.output && <ErrorMsg msg={errors.hiddentestCase[i].output.message} />}
                </div>
              ))}
              <button type="button" onClick={() => appendHidden({ input: "", output: "" })} className="add-btn">
                <Plus className="w-4 h-4" /> Add Hidden Case
              </button>
            </div>
          </Section>

          {/* CODE SECTION
              ─────────────────────────────────────────────────────────────────
              FIX: All 3 language panels are ALWAYS rendered in the DOM.
              Only the active tab is visible (display: block vs display: none).

              WHY: If we conditionally render only the active panel, the textarea
              unmounts/remounts on tab switch. This causes two problems:
                1. react-hook-form loses the ref → preloaded data doesn't show
                2. Any new edits are wiped when you switch tabs and come back

              By keeping all 3 mounted and using CSS to hide inactive ones,
              react-hook-form refs stay registered at all times — so preloaded
              values always appear and edits are never lost on tab switch.
              ─────────────────────────────────────────────────────────────────
          */}
          <Section title="Code Templates & Solutions" icon={<Code2 className="w-4 h-4" />}>
            {/* Language Tabs */}
            <div className="flex gap-2 mb-6">
              {LANGS.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setActiveTab(lang)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition
                    ${activeTab === lang
                      ? LANG_COLORS[lang]
                      : "bg-slate-800/60 border-white/5 text-slate-400 hover:text-slate-200"
                    }`}
                >
                  {lang}
                </button>
              ))}
            </div>

            {/* Always render all 3 — hide inactive with CSS, never unmount */}
            {LANGS.map((lang, i) => (
              <div
                key={lang}
                style={{ display: activeTab === lang ? "block" : "none" }}
                className="space-y-4"
              >
                <div>
                  <label className="label-text">Starter Code — {lang}</label>
                  <textarea
                    {...register(`startCode.${i}.initialCode`)}
                    placeholder={`// ${lang} starter template`}
                    rows={8}
                    className="input-field font-mono text-sm resize-none"
                  />
                  {errors.startCode?.[i]?.initialCode && (
                    <ErrorMsg msg={errors.startCode[i].initialCode.message} />
                  )}
                </div>
                <div>
                  <label className="label-text">Reference Solution — {lang}</label>
                  <textarea
                    {...register(`referenceSolution.${i}.completeCode`)}
                    placeholder={`// ${lang} complete solution`}
                    rows={8}
                    className="input-field font-mono text-sm resize-none"
                  />
                  {errors.referenceSolution?.[i]?.completeCode && (
                    <ErrorMsg msg={errors.referenceSolution[i].completeCode.message} />
                  )}
                </div>
              </div>
            ))}
          </Section>

          {/* SUBMIT */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 disabled:opacity-60 disabled:cursor-not-allowed p-4 rounded-xl text-white font-bold text-base transition-all duration-300 shadow-lg shadow-indigo-500/20"
          >
            {isSubmitting ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Updating Problem...</>
            ) : (
              <><RefreshCw className="w-5 h-5" /> Update Problem</>
            )}
          </button>
        </form>
      </main>

      {/* STYLES */}
      <style>{`
        .input-field {
          width: 100%;
          background: rgba(30,41,59,0.8);
          border: 1px solid rgba(255,255,255,0.08);
          color: #e2e8f0;
          padding: 0.625rem 0.875rem;
          border-radius: 0.5rem;
          outline: none;
          transition: border-color 0.2s;
          font-size: 0.875rem;
        }
        .input-field:focus { border-color: rgba(99,102,241,0.6); }
        .input-field option { background: #1e293b; }
        .label-text {
          display: block;
          font-size: 0.75rem;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.375rem;
        }
        .add-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(99,102,241,0.15);
          border: 1px dashed rgba(99,102,241,0.4);
          color: #818cf8;
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .add-btn:hover { background: rgba(99,102,241,0.25); border-color: rgba(99,102,241,0.6); }
      `}</style>
    </div>
  );
}

/* ================= SHARED SUB-COMPONENTS ================= */
function Section({ title, icon, children }) {
  return (
    <div className="bg-slate-900/70 border border-white/[0.06] rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-white/[0.06] bg-slate-900/50">
        <span className="text-indigo-400">{icon}</span>
        <h2 className="font-semibold text-slate-200">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function ErrorMsg({ msg }) {
  return <p className="text-rose-400 text-xs mt-1">{msg}</p>;
}

export default UpdatePanel;

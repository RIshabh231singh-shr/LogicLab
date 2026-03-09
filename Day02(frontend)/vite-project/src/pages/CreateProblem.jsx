import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import axiosClient from "../utility/axios";
import { useNavigate } from "react-router";
import { Loader2, Plus, Trash2, CheckCircle, XCircle, Code2, FlaskConical, Eye, EyeOff } from "lucide-react";

/* ================= CONSTANTS ================= */
const LANGS = ["C++", "Java", "JavaScript"];
const LANG_INDEX = { "C++": 0, "Java": 1, "JavaScript": 2 };
const LANG_COLORS = {
  "C++": "text-sky-400 border-sky-400/40 bg-sky-400/10",
  "Java": "text-orange-400 border-orange-400/40 bg-orange-400/10",
  "JavaScript": "text-yellow-400 border-yellow-400/40 bg-yellow-400/10",
};
const TAG_LABELS = {
  array: "Array", linkedlist: "Linked List", graph: "Graph", dp: "Dynamic Programming",
};
const DIFF_COLORS = {
  easy: "text-emerald-400 border-emerald-400/40 bg-emerald-400/10",
  medium: "text-amber-400 border-amber-400/40 bg-amber-400/10",
  hard: "text-rose-400 border-rose-400/40 bg-rose-400/10",
};

/* ================= SCHEMA (matches backend model field names exactly) ================= */
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
  ).min(1, "At least one visible test case required"),

  hiddentestCase: z.array(
    z.object({
      input: z.string().min(1, "Input required"),
      output: z.string().min(1, "Output required"),
    })
  ).min(1, "At least one hidden test case required"),

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

/* ================= COMPONENT ================= */
function CreatePanel() {
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("C++"); // language tab switcher for code section

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const activeLangIdx = LANG_INDEX[activeTab] ?? 0;

  /* ================= FORM ================= */
  const {
    register,
    control,
    handleSubmit,
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

  // watch values used for live stats bar
  const difficulty = watch("difficulty");
  const tag = watch("tags");
  const visibleCases = watch("visibletestCase");
  const hiddenCases = watch("hiddentestCase");

  /* ================= SUBMIT ================= */
  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      await axiosClient.post("/problem/create", data);
      showToast("success", "Problem created successfully!");
      setTimeout(() => navigate("/admin"), 1500);
    } catch (err) {
      const msg = err?.response?.data || "Failed to create problem. Check your code solution.";
      showToast("error", msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ================= UI ================= */
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">

      {/* TOAST */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl border transition-all
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Create Problem</h1>
            <p className="text-slate-400 mt-1 text-sm">Add a new coding challenge to LogicLab</p>
          </div>
          <span className={`px-3 py-1 rounded-lg text-xs font-bold border uppercase tracking-wider ${DIFF_COLORS[difficulty]}`}>
            {difficulty}
          </span>
        </div>

        {/* LIVE STATS BAR — updates in real time as user fills form */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Difficulty", value: difficulty?.charAt(0).toUpperCase() + difficulty?.slice(1) || "—" },
            { label: "Tag", value: TAG_LABELS[tag] || tag || "—" },
            { label: "Visible Cases", value: visibleCases?.length ?? 0 },
            { label: "Hidden Cases", value: hiddenCases?.length ?? 0 },
          ].map(({ label, value }) => (
            <div key={label} className="bg-slate-900/60 border border-white/[0.06] rounded-xl p-3 text-center">
              <div className="text-xs text-slate-500 mb-1">{label}</div>
              <div className="text-sm font-bold text-slate-200">{value}</div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

          {/* BASIC INFO */}
          <Section title="Basic Info" icon="📝">
            <div className="space-y-4">
              <div>
                <label className="label-text">Title</label>
                <input
                  {...register("title")}
                  placeholder="e.g. Two Sum"
                  className="input-field"
                />
                {errors.title && <ErrorMsg msg={errors.title.message} />}
              </div>

              <div>
                <label className="label-text">Description</label>
                <textarea
                  {...register("description")}
                  placeholder="Problem statement, constraints, examples..."
                  rows={5}
                  className="input-field resize-none"
                />
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

          {/* CODE — all 3 languages always in DOM, active shown via CSS */}
          <Section title="Code Templates & Solutions" icon={<Code2 className="w-4 h-4" />}>
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
              <><Loader2 className="w-5 h-5 animate-spin" /> Publishing Problem...</>
            ) : (
              <><FlaskConical className="w-5 h-5" /> Publish Problem</>
            )}
          </button>
        </form>
      </main>

      {/* GLOBAL STYLES */}
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

export default CreatePanel;

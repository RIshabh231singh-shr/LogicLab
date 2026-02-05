import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import axiosClient from "../utility/axios";
import { useNavigate, NavLink } from "react-router";

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

const problemSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  difficulty: z.enum(["easy", "medium", "hard"]),
  tags: z.enum(["array", "linkedList", "graph", "dp"]),

  visibleTestCases: z.array(
    z.object({
      input: z.string().min(1),
      output: z.string().min(1),
      explanation: z.string().min(1),
    }),
  ),

  hiddenTestCases: z.array(
    z.object({
      input: z.string().min(1),
      output: z.string().min(1),
    }),
  ),

  startCode: z.array(
    z.object({
      language: z.enum(["C++", "Java", "JavaScript"]),
      initialCode: z.string().min(1),
    }),
  ),

  referenceSolution: z.array(
    z.object({
      language: z.enum(["C++", "Java", "JavaScript"]),
      completeCode: z.string().min(1),
    }),
  ),
});

function AdminPanel() {
  const navigate = useNavigate();
  const [theme, setTheme] = useState("dark");

  /* ================= FORM ================= */

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(problemSchema),
    defaultValues: {
      difficulty: "medium",
      tags: "array",
      visibleTestCases: [{ input: "", output: "", explanation: "" }],
      hiddenTestCases: [{ input: "", output: "" }],

      startCode: [
        { language: "C++", initialCode: "" },
        { language: "Java", initialCode: "" },
        { language: "JavaScript", initialCode: "" },
      ],

      referenceSolution: [
        { language: "C++", completeCode: "" },
        { language: "Java", completeCode: "" },
        { language: "JavaScript", completeCode: "" },
      ],
    },
  });

  const {
    fields: visibleFields,
    append: appendVisible,
    remove: removeVisible,
  } = useFieldArray({ control, name: "visibleTestCases" });

  const {
    fields: hiddenFields,
    append: appendHidden,
    remove: removeHidden,
  } = useFieldArray({ control, name: "hiddenTestCases" });

  /* ================= THEME ================= */

  useEffect(() => {
    document.body.className =
      theme === "dark"
        ? "bg-slate-950 text-slate-200"
        : "bg-slate-50 text-slate-900";
  }, [theme]);

  /* ================= SUBMIT ================= */

  const onSubmit = async (data) => {
    try {
      await axiosClient.post("/problem/create", data);
      alert("Problem created!");
      navigate("/");
    } catch (err) {
      alert("Error creating problem");
    }
  };

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

        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2"
        >
          {theme === "dark" ? <Sun /> : <Moon />}
        </button>
      </nav>

      {/* MAIN */}
      <main className="max-w-5xl mx-auto p-6 space-y-8">
        <h1 className="text-3xl font-bold">Create New Challenge</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* BASIC */}
          <div className="bg-slate-900 p-6 rounded-xl space-y-4">
            <input
              {...register("title")}
              placeholder="Title"
              className="w-full p-3 rounded bg-slate-800"
            />
            {errors.title && <p className="text-red-400">Title required</p>}

            <textarea
              {...register("description")}
              placeholder="Description"
              className="w-full p-3 rounded bg-slate-800"
            />

            <div className="flex gap-4">
              <select {...register("difficulty")} className="p-2 bg-slate-800">
                <option value="easy">easy</option>
                <option value="medium">medium</option>
                <option value="hard">hard</option>
              </select>

              <select {...register("tags")} className="p-2 bg-slate-800">
                <option value="array">array</option>
                <option value="linkedList">linkedList</option>
                <option value="graph">graph</option>
                <option value="dp">dp</option>
              </select>
            </div>
          </div>

          {/* VISIBLE CASES */}
          <div className="space-y-4">
            <h2 className="font-bold">Visible Cases</h2>

            {visibleFields.map((field, i) => (
              <div
                key={field.id}
                className="bg-slate-900 p-4 rounded space-y-2"
              >
                <input
                  {...register(`visibleTestCases.${i}.input`)}
                  placeholder="input"
                  className="w-full bg-slate-800 p-2"
                />
                <input
                  {...register(`visibleTestCases.${i}.output`)}
                  placeholder="output"
                  className="w-full bg-slate-800 p-2"
                />
                <textarea
                  {...register(`visibleTestCases.${i}.explanation`)}
                  placeholder="explanation"
                  className="w-full bg-slate-800 p-2"
                />

                <button
                  type="button"
                  onClick={() => removeVisible(i)}
                  className="text-red-400"
                >
                  remove
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() =>
                appendVisible({ input: "", output: "", explanation: "" })
              }
              className="bg-indigo-500 px-4 py-2 rounded"
            >
              Add Visible
            </button>
          </div>

          {/* HIDDEN */}
          <div className="space-y-4">
            <h2 className="font-bold">Hidden Cases</h2>

            {hiddenFields.map((field, i) => (
              <div
                key={field.id}
                className="bg-slate-900 p-4 rounded space-y-2"
              >
                <input
                  {...register(`hiddenTestCases.${i}.input`)}
                  placeholder="input"
                  className="w-full bg-slate-800 p-2"
                />
                <input
                  {...register(`hiddenTestCases.${i}.output`)}
                  placeholder="output"
                  className="w-full bg-slate-800 p-2"
                />

                <button
                  type="button"
                  onClick={() => removeHidden(i)}
                  className="text-red-400"
                >
                  remove
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() => appendHidden({ input: "", output: "" })}
              className="bg-indigo-500 px-4 py-2 rounded"
            >
              Add Hidden
            </button>
          </div>

          {/* CODE */}
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-slate-900 p-4 rounded space-y-2">
              <h3 className="font-bold">
                {i === 0 ? "C++" : i === 1 ? "Java" : "JS"}
              </h3>

              <textarea
                {...register(`startCode.${i}.initialCode`)}
                placeholder="starter"
                className="w-full bg-slate-800 p-2"
              />

              <textarea
                {...register(`referenceSolution.${i}.completeCode`)}
                placeholder="solution"
                className="w-full bg-slate-800 p-2"
              />
            </div>
          ))}

          <button className="w-full bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500 p-4 rounded text-white font-bold">
            Publish Problem
          </button>
        </form>
      </main>
    </div>
  );
}

export default AdminPanel;

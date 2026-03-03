import React, { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { useParams, useNavigate } from "react-router";
import {
  Code2,
  BookOpen,
  Play,
  Send,
  History,
  ChevronRight,
  Terminal,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Cpu,
  Database,
  ArrowLeft,
} from "lucide-react";
import axiosClient from "../utility/axios";
import SubmissionHistory from "../components/SubmissionHistory";

const langMap = {
  cpp: "C++",
  java: "Java",
  javascript: "JavaScript",
};

const ProblemPage = () => {
  const [problem, setProblem] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [submitResult, setSubmitResult] = useState(null);
  const [activeLeftTab, setActiveLeftTab] = useState("description");
  const [activeRightTab, setActiveRightTab] = useState("code");

  const editorRef = useRef(null);
  const { problemId } = useParams();
  const navigate = useNavigate();

  // Fetch problem data
  useEffect(() => {
    const fetchProblem = async () => {
      setLoading(true);
      try {
        const response = await axiosClient.get(
          `/problem/ProblemById/${problemId}`,
        );
        setProblem(response.data);

        const initialCode =
          response.data.startCode.find(
            (sc) => sc.language === langMap[selectedLanguage],
          )?.initialCode || "";

        setCode(initialCode);
      } catch (error) {
        console.error("Error fetching problem:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProblem();
  }, [problemId]);

  // Update code when language changes
  useEffect(() => {
    if (problem) {
      const initialCode =
        problem.startCode.find(
          (sc) => sc.language === langMap[selectedLanguage],
        )?.initialCode || "";
      setCode(initialCode);
    }
  }, [selectedLanguage, problem]);

  const handleEditorChange = (value) => {
    setCode(value || "");
  };

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
  };

  const handleLanguageChange = (language) => {
    setSelectedLanguage(language);
  };

  const handleRun = async () => {
    setLoading(true);
    setRunResult(null);

    try {
      const response = await axiosClient.post(`/submission/run/${problemId}`, {
        code,
        language: selectedLanguage,
      });

      setRunResult(response.data);
      setActiveRightTab("testcase");
    } catch (error) {
      console.error("Error running code:", error);
      setRunResult({
        success: false,
        error: "Internal server error",
      });
      setActiveRightTab("testcase");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitCode = async () => {
    setLoading(true);
    setSubmitResult(null);

    try {
      const response = await axiosClient.post(
        `/submission/submit/${problemId}`,
        {
          code: code,
          language: selectedLanguage,
        },
      );

      setSubmitResult(response.data);
      setActiveRightTab("result");
    } catch (error) {
      console.error("Error submitting code:", error);
      setSubmitResult(null);
      setActiveRightTab("result");
    } finally {
      setLoading(false);
    }
  };

  const getLanguageForMonaco = (lang) => {
    switch (lang) {
      case "javascript":
        return "javascript";
      case "java":
        return "java";
      case "cpp":
        return "cpp";
      default:
        return "javascript";
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case "easy":
        return "text-emerald-400 border-emerald-400/30 bg-emerald-400/10";
      case "medium":
        return "text-amber-400 border-amber-400/30 bg-amber-400/10";
      case "hard":
        return "text-rose-400 border-rose-400/30 bg-rose-400/10";
      default:
        return "text-slate-400 border-slate-400/30 bg-slate-400/10";
    }
  };

  if (loading && !problem) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-200 overflow-hidden">
      {/* Header */}
      <header className="h-14 glass border-b border-white/10 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg vibrant-gradient  tracking-tight logo">
              LogicLab
            </span>
          </div>
          <div className="h-4 w-px bg-white/10 mx-2"></div>
          <h1 className="text-xl font-bold text-cyan-400">
            {problem?.title || "Loading..."}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRun}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-all text-sm font-medium disabled:opacity-50"
          >
            <Play className="h-4 w-4 text-emerald-400" />
            Run
          </button>
          <button
            onClick={handleSubmitCode}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg vibrant-gradient text-white shadow-lg shadow-indigo-500/20 transition-all text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            Submit
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        <div className="w-1/2 flex flex-col border-r border-white/10 overflow-hidden">
          {/* Left Tabs */}
          <div className="flex bg-slate-900/50 border-b border-white/5 px-2 shrink-0">
            {[
              { id: "description", label: "Description", icon: BookOpen },
              { id: "editorial", label: "Editorial", icon: Terminal },
              { id: "solutions", label: "Solutions", icon: Code2 },
              { id: "submissions", label: "Submissions", icon: History },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveLeftTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all relative ${
                  activeLeftTab === tab.id
                    ? "text-indigo-400"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
                {activeLeftTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 vibrant-gradient"></div>
                )}
              </button>
            ))}
          </div>

          {/* Left Content */}
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {problem && (
              <div className="max-w-3xl mx-auto">
                {activeLeftTab === "description" && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getDifficultyColor(problem.difficulty)}`}
                        >
                          {problem.difficulty?.toUpperCase()}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border border-indigo-500/30 bg-indigo-500/10 text-indigo-400">
                          {problem.tags}
                        </span>
                      </div>
                      <h2 className="text-3xl font-bold tracking-tight text-white">
                        {problem.title}
                      </h2>
                    </div>

                    <div className="prose prose-invert max-w-none">
                      <div className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {problem.description}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <ChevronRight className="h-5 w-5 text-indigo-500" />
                        Examples
                      </h3>
                      <div className="space-y-4">
                        {problem.visibleTestCases?.map((example, index) => (
                          <div
                            key={index}
                            className="glass rounded-2xl border border-white/10 overflow-hidden"
                          >
                            <div className="bg-white/5 px-4 py-2 border-b border-white/10">
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                Example {index + 1}
                              </span>
                            </div>
                            <div className="p-5 space-y-4 font-mono text-sm">
                              <div className="space-y-1">
                                <p className="text-indigo-400 font-bold">
                                  Input:
                                </p>
                                <pre className="bg-black/30 p-3 rounded-xl text-slate-300 border border-white/5">
                                  {example.input}
                                </pre>
                              </div>
                              <div className="space-y-1">
                                <p className="text-emerald-400 font-bold">
                                  Output:
                                </p>
                                <pre className="bg-black/30 p-3 rounded-xl text-slate-300 border border-white/5">
                                  {example.output}
                                </pre>
                              </div>
                              {example.explanation && (
                                <div className="space-y-1">
                                  <p className="text-slate-400 font-bold italic">
                                    Explanation:
                                  </p>
                                  <p className="text-slate-400 leading-relaxed">
                                    {example.explanation}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeLeftTab === "editorial" && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h2 className="text-2xl font-bold text-white">Editorial</h2>
                    <div className="glass p-6 rounded-2xl border border-white/10">
                      <p className="text-slate-300 leading-relaxed">
                        The editorial for this problem is currently being
                        prepared by our experts. Check back soon for a detailed
                        breakdown and multiple approach strategies!
                      </p>
                    </div>
                  </div>
                )}

                {activeLeftTab === "solutions" && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h2 className="text-2xl font-bold text-white">
                      Reference Solutions
                    </h2>
                    <div className="space-y-6">
                      {problem.referenceSolution?.length > 0 ? (
                        problem.referenceSolution.map((solution, index) => (
                          <div
                            key={index}
                            className="glass rounded-2xl border border-white/10 overflow-hidden"
                          >
                            <div className="bg-white/5 px-4 py-2 border-b border-white/10 flex justify-between items-center">
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                {solution.language}
                              </span>
                            </div>
                            <div className="p-4">
                              <pre className="bg-black/30 p-4 rounded-xl text-sm overflow-x-auto border border-white/5 font-mono text-indigo-300">
                                <code>{solution.completeCode}</code>
                              </pre>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12 glass rounded-2xl border border-white/10">
                          <AlertCircle className="mx-auto h-12 w-12 text-slate-500 mb-4 opacity-20" />
                          <p className="text-slate-400">
                            Solutions will be available after you solve the
                            problem.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeLeftTab === "submissions" && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h2 className="text-2xl font-bold text-white">
                      My Submissions
                    </h2>
                    <SubmissionHistory problemId={problemId} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-1/2 flex flex-col overflow-hidden">
          {/* Right Tabs */}
          <div className="flex bg-slate-900/50 border-b border-white/5 px-2 shrink-0">
            {[
              { id: "code", label: "Code", icon: Code2 },
              { id: "testcase", label: "Console", icon: Terminal },
              { id: "result", label: "Result", icon: CheckCircle2 },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveRightTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all relative ${
                  activeRightTab === tab.id
                    ? "text-indigo-400"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
                {activeRightTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 vibrant-gradient"></div>
                )}
              </button>
            ))}
          </div>

          {/* Right Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {activeRightTab === "code" && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Language Selector */}
                <div className="p-3 border-b border-white/5 flex items-center gap-2 shrink-0">
                  {["javascript", "java", "cpp"].map((lang) => (
                    <button
                      key={lang}
                      onClick={() => handleLanguageChange(lang)}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition-all border ${
                        selectedLanguage === lang
                          ? "vibrant-gradient text-white border-transparent"
                          : "text-slate-400 border-white/10 hover:border-white/20 hover:bg-white/5"
                      }`}
                    >
                      {lang === "cpp"
                        ? "C++"
                        : lang === "javascript"
                          ? "JavaScript"
                          : "Java"}
                    </button>
                  ))}
                </div>

                {/* Monaco Editor */}
                <div className="flex-1 relative">
                  <Editor
                    height="100%"
                    language={getLanguageForMonaco(selectedLanguage)}
                    value={code}
                    onChange={handleEditorChange}
                    onMount={handleEditorDidMount}
                    theme="vs-dark"
                    options={{
                      fontSize: 14,
                      fontFamily: "'JetBrains Mono', monospace",
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      tabSize: 2,
                      insertSpaces: true,
                      wordWrap: "on",
                      lineNumbers: "on",
                      padding: { top: 16, bottom: 16 },
                      renderLineHighlight: "all",
                      cursorBlinking: "smooth",
                      cursorSmoothCaretAnimation: "on",
                      smoothScrolling: true,
                    }}
                  />
                </div>
              </div>
            )}

            {(activeRightTab === "testcase" || activeRightTab === "result") && (
              <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-slate-950/50">
                {activeRightTab === "testcase" && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Terminal className="h-5 w-5 text-indigo-500" />
                        Test Results
                      </h3>
                    </div>

                    {runResult ? (
                      <div className="space-y-4">
                        <div
                          className={`p-4 rounded-2xl border ${runResult.success ? "bg-emerald-500/10 border-emerald-500/20" : "bg-rose-500/10 border-rose-500/20"}`}
                        >
                          <div className="flex items-center gap-3 mb-4">
                            {runResult.success ? (
                              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                            ) : (
                              <XCircle className="h-6 w-6 text-rose-500" />
                            )}
                            <h4 className="text-lg font-bold text-white">
                              {runResult.success
                                ? "All test cases passed!"
                                : "Compilation or Runtime Error"}
                            </h4>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="glass p-3 rounded-xl border border-white/5 flex items-center gap-3">
                              <Cpu className="h-4 w-4 text-indigo-400" />
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                                  Runtime
                                </p>
                                <p className="text-sm font-mono text-slate-200">
                                  {runResult.runtime}s
                                </p>
                              </div>
                            </div>
                            <div className="glass p-3 rounded-xl border border-white/5 flex items-center gap-3">
                              <Database className="h-4 w-4 text-indigo-400" />
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                                  Memory
                                </p>
                                <p className="text-sm font-mono text-slate-200">
                                  {runResult.memory} KB
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {runResult.testCases?.map((tc, i) => (
                            <div
                              key={i}
                              className="glass rounded-2xl border border-white/10 overflow-hidden"
                            >
                              <div className="bg-white/5 px-4 py-2 border-b border-white/10 flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                  Test Case {i + 1}
                                </span>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tc.status_id === 3 ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}
                                >
                                  {tc.status_id === 3 ? "PASSED" : "FAILED"}
                                </span>
                              </div>
                              <div className="p-4 space-y-3 font-mono text-xs">
                                <div className="space-y-1">
                                  <p className="text-slate-500 font-bold">
                                    Input
                                  </p>
                                  <pre className="bg-black/30 p-2 rounded-lg text-slate-300 border border-white/5">
                                    {tc.stdin}
                                  </pre>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <p className="text-slate-500 font-bold">
                                      Expected
                                    </p>
                                    <pre className="bg-black/30 p-2 rounded-lg text-slate-300 border border-white/5">
                                      {tc.expected_output}
                                    </pre>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-slate-500 font-bold">
                                      Actual
                                    </p>
                                    <pre className="bg-black/30 p-2 rounded-lg text-slate-300 border border-white/5">
                                      {tc.stdout}
                                    </pre>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-20 glass rounded-2xl border border-white/10">
                        <Play className="mx-auto h-12 w-12 text-slate-500 mb-4 opacity-20" />
                        <p className="text-slate-400">
                          Click "Run" to test your code with example cases.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {activeRightTab === "result" && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-indigo-500" />
                      Submission Result
                    </h3>

                    {submitResult ? (
                      <div
                        className={`p-6 rounded-2xl border ${submitResult.accepted ? "bg-emerald-500/10 border-emerald-500/20" : "bg-rose-500/10 border-rose-500/20"}`}
                      >
                        <div className="flex items-center gap-4 mb-6">
                          <div
                            className={`p-3 rounded-2xl ${submitResult.accepted ? "bg-emerald-500/20" : "bg-rose-500/20"}`}
                          >
                            {submitResult.accepted ? (
                              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                            ) : (
                              <XCircle className="h-8 w-8 text-rose-500" />
                            )}
                          </div>
                          <div>
                            <h4
                              className={`text-2xl font-bold ${submitResult.accepted ? "text-emerald-400" : "text-rose-400"}`}
                            >
                              {submitResult.accepted
                                ? "Accepted"
                                : submitResult.error || "Wrong Answer"}
                            </h4>
                            <p className="text-slate-400 text-sm">
                              Passed {submitResult.passedTestCases} /{" "}
                              {submitResult.totalTestCases} test cases
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="glass p-4 rounded-2xl border border-white/5 space-y-1">
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                              Runtime
                            </p>
                            <p className="text-xl font-mono text-white">
                              {submitResult.runtime}s
                            </p>
                          </div>
                          <div className="glass p-4 rounded-2xl border border-white/5 space-y-1">
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                              Memory
                            </p>
                            <p className="text-xl font-mono text-white">
                              {submitResult.memory} KB
                            </p>
                          </div>
                        </div>

                        {!submitResult.accepted && (
                          <div className="mt-6 p-4 bg-black/30 rounded-2xl border border-white/5">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                              Last Executed Input
                            </p>
                            <pre className="text-sm font-mono text-rose-300 overflow-x-auto">
                              {submitResult.lastInput || "N/A"}
                            </pre>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-20 glass rounded-2xl border border-white/10">
                        <Send className="mx-auto h-12 w-12 text-slate-500 mb-4 opacity-20" />
                        <p className="text-slate-400">
                          Click "Submit" to evaluate your solution against all
                          test cases.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProblemPage;

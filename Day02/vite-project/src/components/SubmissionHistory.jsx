import React, { useState, useEffect } from "react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Code2,
  Cpu,
  Database,
  Calendar,
  ChevronRight,
  X,
} from "lucide-react";
import { useNavigate } from "react-router";
import axiosClient from "../utility/axios";

const SubmissionHistory = ({ problemId }) => {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        setLoading(true);
        const response = await axiosClient.get(
          `/problem/submittedProblem/${problemId}`,
        );
        setSubmissions(response.data);
        setError(null);
      } catch (err) {
        setError("Failed to fetch submission history");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (problemId) {
      fetchSubmissions();
    }
  }, [problemId]);

  const getStatusConfig = (status) => {
    switch (status?.toLowerCase()) {
      case "accepted":
        return {
          color: "text-emerald-400",
          bg: "bg-emerald-400/10",
          border: "border-emerald-400/20",
          icon: CheckCircle2,
          label: "Accepted",
        };
      case "wrong":
        return {
          color: "text-rose-400",
          bg: "bg-rose-400/10",
          border: "border-rose-400/20",
          icon: XCircle,
          label: "Wrong Answer",
        };
      case "error":
        return {
          color: "text-amber-400",
          bg: "bg-amber-400/10",
          border: "border-amber-400/20",
          icon: AlertCircle,
          label: "Runtime Error",
        };
      case "pending":
        return {
          color: "text-indigo-400",
          bg: "bg-indigo-400/10",
          border: "border-indigo-400/20",
          icon: Clock,
          label: "Pending",
        };
      default:
        return {
          color: "text-slate-400",
          bg: "bg-slate-400/10",
          border: "border-slate-400/20",
          icon: AlertCircle,
          label: status || "Unknown",
        };
    }
  };

  const formatMemory = (memory) => {
    if (memory < 1024) return `${memory} KB`;
    return `${(memory / 1024).toFixed(2)} MB`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass p-6 rounded-2xl border border-rose-500/20 bg-rose-500/5 flex items-center gap-4">
        <AlertCircle className="text-rose-500 h-6 w-6" />
        <span className="text-rose-200 font-medium">{error}</span>
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="text-center py-20 glass rounded-3xl border border-white/10">
        <div className="h-16 w-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Clock className="h-8 w-8 text-slate-500 opacity-40" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">
          No Submissions Yet
        </h3>
        <p className="text-slate-400 max-w-xs mx-auto">
          You haven't submitted any code for this problem. Ready to take the
          challenge?
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="glass rounded-3xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Language
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Runtime
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Memory
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Submitted
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {submissions.map((sub) => {
                const config = getStatusConfig(sub.status);
                const StatusIcon = config.icon;
                return (
                  <tr
                    key={sub._id}
                    className="hover:bg-white/2 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <StatusIcon className={`h-5 w-5 ${config.color}`} />
                        <div>
                          <p className={`font-bold ${config.color}`}>
                            {config.label}
                          </p>
                          <p className="text-[10px] text-slate-500 font-medium">
                            {sub.testCasesPassed}/{sub.testCasesTotal} passed
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-xs font-mono text-slate-300">
                        {sub.language}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-slate-400">
                      {sub.runtime}s
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-slate-400">
                      {formatMemory(sub.memory)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Calendar className="h-3 w-3" />
                        <span className="text-xs">
                          {formatDate(sub.createdAt)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => navigate(`/submission/${sub._id}`)}
                        className="p-2 hover:bg-indigo-500/10 rounded-xl transition-all text-slate-400 hover:text-indigo-400 group-hover:translate-x-1"
                      >
                        <Code2 className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Code View Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 animate-in fade-in duration-300">
          <div
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setSelectedSubmission(null)}
          ></div>

          <div className="glass w-full max-w-5xl max-h-full rounded-4xl border border-white/10 shadow-2xl flex flex-col overflow-hidden relative z-10 animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-4">
                <div
                  className={`p-3 rounded-2xl ${getStatusConfig(selectedSubmission.status).bg}`}
                >
                  {React.createElement(
                    getStatusConfig(selectedSubmission.status).icon,
                    {
                      className: `h-6 w-6 ${getStatusConfig(selectedSubmission.status).color}`,
                    },
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    Submission Details
                  </h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                      {selectedSubmission.language}
                    </span>
                    <div className="h-1 w-1 rounded-full bg-slate-700"></div>
                    <span className="text-xs text-slate-500">
                      {formatDate(selectedSubmission.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4 shrink-0">
                <div className="glass p-4 rounded-2xl border border-white/5 space-y-1">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <CheckCircle2 className="h-3 w-3" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      Status
                    </span>
                  </div>
                  <p
                    className={`text-sm font-bold ${getStatusConfig(selectedSubmission.status).color}`}
                  >
                    {getStatusConfig(selectedSubmission.status).label}
                  </p>
                </div>
                <div className="glass p-4 rounded-2xl border border-white/5 space-y-1">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <Cpu className="h-3 w-3" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      Runtime
                    </span>
                  </div>
                  <p className="text-sm font-bold text-white font-mono">
                    {selectedSubmission.runtime}s
                  </p>
                </div>
                <div className="glass p-4 rounded-2xl border border-white/5 space-y-1">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <Database className="h-3 w-3" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      Memory
                    </span>
                  </div>
                  <p className="text-sm font-bold text-white font-mono">
                    {formatMemory(selectedSubmission.memory)}
                  </p>
                </div>
                <div className="glass p-4 rounded-2xl border border-white/5 space-y-1">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <Terminal className="h-3 w-3" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      Passed
                    </span>
                  </div>
                  <p className="text-sm font-bold text-white font-mono">
                    {selectedSubmission.testCasesPassed} /{" "}
                    {selectedSubmission.testCasesTotal}
                  </p>
                </div>
              </div>

              {selectedSubmission.errorMessage && (
                <div className="px-6 mb-4 shrink-0">
                  <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-rose-200 font-mono">
                      {selectedSubmission.errorMessage}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex-1 px-6 pb-6 overflow-hidden">
                <div className="h-full bg-black/40 rounded-2xl border border-white/5 overflow-hidden flex flex-col">
                  <div className="px-4 py-2 bg-white/5 border-b border-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Source Code
                    </span>
                    <button
                      onClick={() =>
                        navigator.clipboard.writeText(selectedSubmission.code)
                      }
                      className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      Copy Code
                    </button>
                  </div>
                  <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                    <pre className="text-sm font-mono text-indigo-300 leading-relaxed">
                      <code>{selectedSubmission.code}</code>
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubmissionHistory;

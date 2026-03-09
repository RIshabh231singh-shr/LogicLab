import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  Calendar,
  Code2,
  Cpu,
  Database,
  Terminal,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Copy,
  Clock,
} from "lucide-react";
import axiosClient from "../utility/axios";

function SubmissionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubmission = async () => {
      try {
        const response = await axiosClient.get(`/problem/submission/${id}`);
        setSubmission(response.data);
      } catch (error) {
        console.error("Error fetching submission:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSubmission();
  }, [id]);

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
      default:
        return {
          color: "text-slate-400",
          bg: "bg-slate-400/10",
          border: "border-slate-400/20",
          icon: Clock,
          label: status || "Pending",
        };
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="min-h-screen bg-slate-950 flex shadow-inner items-center justify-center p-6">
        <div className="glass p-8 rounded-3xl border border-white/10 text-center max-w-sm">
          <AlertCircle size={48} className="mx-auto text-slate-500 mb-4 opacity-20" />
          <h2 className="text-xl font-bold text-white mb-2">Submission Not Found</h2>
          <button onClick={() => navigate(-1)} className="vibrant-gradient px-6 py-2 rounded-xl text-white font-bold inline-block mt-4">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const config = getStatusConfig(submission.status);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6 md:p-12 overflow-x-hidden">
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
        
        {/* Navigation */}
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-bold uppercase tracking-widest">Back to Submissions</span>
        </button>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
               <div className={`p-3 rounded-2xl ${config.bg} ${config.border} border`}>
                  <config.icon className={`h-8 w-8 ${config.color}`} />
               </div>
               <div>
                 <h1 className={`text-4xl font-black tracking-tight ${config.color}`}>{config.label}</h1>
                 <p className="text-slate-500 text-sm font-bold uppercase tracking-widest flex items-center gap-2 mt-1">
                   <Calendar size={12} />
                   Submitted on {new Date(submission.createdAt).toLocaleString()}
                 </p>
               </div>
            </div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              Problem: {submission.problemId?.title || "Unknown Problem"}
            </h2>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={() => navigate(`/problem/${submission.problemId?._id}`)}
              className="glass border border-white/10 hover:bg-white/5 px-6 py-3 rounded-2xl text-sm font-bold uppercase tracking-widest transition-all"
            >
              Solve Again
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass rounded-3xl p-6 border border-white/10 space-y-2">
             <div className="flex items-center gap-2 text-slate-500">
               <Cpu size={14} className="text-indigo-400" />
               <span className="text-[10px] font-black uppercase tracking-widest">Runtime</span>
             </div>
             <p className="text-2xl font-black text-white font-mono">{submission.runtime}s</p>
          </div>
          <div className="glass rounded-3xl p-6 border border-white/10 space-y-2">
             <div className="flex items-center gap-2 text-slate-500">
               <Database size={14} className="text-indigo-400" />
               <span className="text-[10px] font-black uppercase tracking-widest">Memory</span>
             </div>
             <p className="text-2xl font-black text-white font-mono">{(submission.memory / 1024).toFixed(2)} MB</p>
          </div>
          <div className="glass rounded-3xl p-6 border border-white/10 space-y-2">
             <div className="flex items-center gap-2 text-slate-500">
               <Code2 size={14} className="text-indigo-400" />
               <span className="text-[10px] font-black uppercase tracking-widest">Language</span>
             </div>
             <p className="text-2xl font-black text-white font-mono capitalize">{submission.language}</p>
          </div>
          <div className="glass rounded-3xl p-6 border border-white/10 space-y-2">
             <div className="flex items-center gap-2 text-slate-500">
               <Terminal size={14} className="text-indigo-400" />
               <span className="text-[10px] font-black uppercase tracking-widest">Passed</span>
             </div>
             <p className="text-2xl font-black text-white font-mono">{submission.testCasesPassed} / {submission.testCasesTotal}</p>
          </div>
        </div>

        {/* Error Message if any */}
        {submission.errorMessage && (
           <div className="glass rounded-3xl p-6 border border-rose-500/20 bg-rose-500/5 space-y-4 animate-in slide-in-from-top-4 duration-500">
              <div className="flex items-center gap-2 text-rose-400">
                 <AlertCircle size={18} />
                 <h3 className="font-bold uppercase tracking-widest text-sm">Error Output</h3>
              </div>
              <pre className="p-4 bg-black/40 rounded-2xl border border-white/5 text-rose-300 font-mono text-xs overflow-x-auto whitespace-pre-wrap">
                 {submission.errorMessage}
              </pre>
           </div>
        )}

        {/* Code Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xl font-black text-white flex items-center gap-2 uppercase tracking-tighter">
              <Code2 size={24} className="text-indigo-500" />
              Source Code
            </h3>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(submission.code);
                // Optionally show a "Copied!" toast
              }}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2"
            >
              <Copy size={14} />
              Copy
            </button>
          </div>
          
          <div className="glass rounded-4xl border border-white/10 overflow-hidden shadow-2xl">
             <div className="bg-white/5 px-6 py-3 border-b border-white/10 flex items-center justify-between">
                <div className="flex gap-1.5">
                   <div className="w-3 h-3 rounded-full bg-rose-500/50"></div>
                   <div className="w-3 h-3 rounded-full bg-amber-500/50"></div>
                   <div className="w-3 h-3 rounded-full bg-emerald-500/50"></div>
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                  {submission.language}.source
                </span>
             </div>
             <div className="p-8 bg-slate-900/40 min-h-[400px]">
                <pre className="font-mono text-sm leading-relaxed text-indigo-300 selection:bg-indigo-500/30">
                   <code>{submission.code}</code>
                </pre>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default SubmissionDetail;

import React, { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router";
import { useSelector } from "react-redux";
import {
  User,
  Mail,
  Calendar,
  Award,
  BookOpen,
  ChevronRight,
  Settings,
  Brain,
  CheckCircle2,
  Trophy,
  Activity,
} from "lucide-react";
import axiosClient from "../utility/axios";

function Profile() {
  const navigate = useNavigate();
  const { user: authUser } = useSelector((state) => state.auth);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axiosClient.get("/user/getprofile");
        setProfile(response.data.user);
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="glass p-8 rounded-3xl border border-white/10 text-center max-w-sm">
          <User size={48} className="mx-auto text-slate-500 mb-4 opacity-20" />
          <h2 className="text-xl font-bold text-white mb-2">Profile Not Found</h2>
          <p className="text-slate-400 mb-6">We couldn't load your profile information. Please try again later.</p>
          <NavLink to="/" className="vibrant-gradient px-6 py-2 rounded-xl text-white font-bold inline-block">
            Go Home
          </NavLink>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Header / Top Card */}
        <div className="glass rounded-4xl p-8 border border-white/10 relative overflow-hidden flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
          <div className="absolute right-0 top-0 opacity-5 pointer-events-none">
             <Trophy size={300} />
          </div>
          
          <div className="relative">
            <div className="w-32 h-32 rounded-3xl overflow-hidden ring-4 ring-white/5 shadow-2xl shadow-indigo-500/20">
              {profile.profilePicture ? (
                <img
                  src={profile.profilePicture}
                  alt={profile.firstName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full vibrant-gradient flex items-center justify-center text-white text-5xl font-black">
                  {profile.firstName[0]}
                </div>
              )}
            </div>
            <div className="absolute -bottom-2 -right-2 bg-emerald-500 p-2 rounded-xl border-4 border-slate-900 text-white shadow-lg">
              <CheckCircle2 size={16} />
            </div>
          </div>

          <div className="flex-1 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-4xl font-black text-white tracking-tight">
                  {profile.firstName} {profile.lastName}
                </h1>
                <p className="text-slate-400 font-medium flex items-center justify-center md:justify-start gap-2 mt-1">
                  <Mail size={14} className="text-indigo-400" />
                  {profile.emailId}
                </p>
              </div>
              <NavLink 
                to="/update-profile"
                className="glass border border-white/10 hover:bg-white/5 px-6 py-2.5 rounded-2xl flex items-center gap-2 text-sm font-bold transition-all hover:scale-105 active:scale-95"
              >
                <Settings size={16} />
                Edit Profile
              </NavLink>
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 pt-4 border-t border-white/5">
              <div className="flex items-center gap-2 text-slate-300">
                <Calendar size={16} className="text-indigo-400" />
                <span className="text-sm font-bold uppercase tracking-widest text-slate-500">Age:</span>
                <span className="text-sm font-mono">{profile.age || "N/A"}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Award size={16} className="text-indigo-400" />
                <span className="text-sm font-bold uppercase tracking-widest text-slate-500">Role:</span>
                <span className="text-sm font-mono capitalize">{profile.role}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Activity size={16} className="text-indigo-400" />
                <span className="text-sm font-bold uppercase tracking-widest text-slate-500">Problems Solved:</span>
                <span className="text-sm font-mono">{profile.problemSolved?.length || 0}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Stats Sidebar */}
          <div className="space-y-6">
            <div className="glass rounded-3xl p-6 border border-white/10 space-y-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Brain size={18} className="text-indigo-400" />
                Skill Insights
              </h3>
              
              <div className="space-y-4">
                 <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-tighter text-slate-500">
                       <span>Logic Master</span>
                       <span>{(profile.problemSolved?.length * 5) % 100}%</span>
                    </div>
                    <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-white/5">
                       <div 
                         className="h-full vibrant-gradient transition-all duration-1000" 
                         style={{ width: `${(profile.problemSolved?.length * 5) % 100}%` }}
                       ></div>
                    </div>
                 </div>
                 {/* Add more placeholder stats if needed */}
              </div>

              <div className="pt-6 border-t border-white/5">
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                   <Award size={32} className="text-indigo-400" />
                   <div>
                      <p className="text-xs font-bold text-indigo-300 uppercase">Current Badge</p>
                      <p className="text-sm font-bold text-white">{profile.problemSolved?.length > 10 ? 'Code Ninja' : 'Beginner'}</p>
                   </div>
                </div>
              </div>
            </div>
          </div>

          {/* Solved Problems List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between px-2">
               <h2 className="text-2xl font-black text-white flex items-center gap-3">
                 <BookOpen size={24} className="text-indigo-500" />
                 Solved Challenges
               </h2>
               <span className="px-3 py-1 rounded-full bg-slate-900 border border-white/5 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                 {profile.problemSolved?.length || 0} Total
               </span>
            </div>

            {profile.problemSolved?.length > 0 ? (
              <div className="grid gap-4">
                {profile.problemSolved.map((problem) => (
                  <div 
                    key={problem._id}
                    onClick={() => navigate(`/problem/${problem._id}?loadLast=true`)}
                    className="glass group rounded-2xl p-5 border border-white/5 hover:border-indigo-500/30 transition-all cursor-pointer hover:translate-x-1"
                  >
                    <div className="flex justify-between items-center">
                      <div className="space-y-1">
                        <h4 className="text-lg font-bold text-white flex items-center gap-2 group-hover:text-indigo-400 transition-colors">
                          {problem.title}
                          <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </h4>
                        <div className="flex items-center gap-3">
                           <span className={`text-[10px] font-black uppercase tracking-widest ${
                             problem.difficulty?.toLowerCase() === 'easy' ? 'text-emerald-400' :
                             problem.difficulty?.toLowerCase() === 'medium' ? 'text-amber-400' : 'text-rose-400'
                           }`}>
                             {problem.difficulty}
                           </span>
                           <div className="h-1 w-1 rounded-full bg-slate-700"></div>
                           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                             Solved
                           </span>
                        </div>
                      </div>
                      <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                         <CheckCircle2 size={20} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 glass rounded-4xl border border-white/10 opacity-50">
                <BookOpen size={48} className="mx-auto text-slate-500 mb-4 opacity-20" />
                <h3 className="text-xl font-bold text-white mb-2">No problems solved yet</h3>
                <p className="text-slate-400">Your solved challenges will appear here.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default Profile;

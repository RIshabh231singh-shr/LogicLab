import React, { useEffect, useState } from "react";
import { NavLink, useNavigate, useParams } from "react-router";
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
  Image as ImageIcon,
  MessageSquare,
  Bookmark
} from "lucide-react";
import axiosClient from "../utility/axios";

function Profile() {
  const navigate = useNavigate();
  const { user: authUser } = useSelector((state) => state.auth);
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [bookmarkPosts, setBookmarkPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  const [activeTab, setActiveTab] = useState("posts");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        if (!userId && !authUser?._id) return;
        const targetId = userId || authUser._id;
        const url = `/user/profile/${targetId}`;
        const response = await axiosClient.get(url);
        const resolvedProfile = response.data.user;
        setProfile(resolvedProfile);
        
        // Fetch posts created by this user
        const postsResponse = await axiosClient.get(`/post/user/${resolvedProfile._id}`);
        setUserPosts(postsResponse.data.posts);

        // Fetch bookmarked posts
        const sharedResponse = await axiosClient.get(`/post/user/${resolvedProfile._id}/bookmarked`);
        setBookmarkPosts(sharedResponse.data.posts);
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [userId]);

  const isOwnProfile = !userId || userId === authUser?._id;

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
              {isOwnProfile && (
                <NavLink 
                  to="/update-profile"
                  className="glass border border-white/10 hover:bg-white/5 px-6 py-2.5 rounded-2xl flex items-center gap-2 text-sm font-bold transition-all hover:scale-105 active:scale-95"
                >
                  <Settings size={16} />
                  Edit Profile
                </NavLink>
              )}
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
              <div className="max-h-[320px] overflow-y-auto pr-1 custom-scrollbar grid gap-4">
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

        {/* ── User Posts Grid (Instagram Style) ── */}
        <div className="pt-10 space-y-6">
           <div className="flex items-center justify-between px-2 border-b border-white/10 pb-4">
              <div className="flex items-center gap-6">
                 <button 
                    onClick={() => setActiveTab('posts')}
                    className={`text-xl font-black flex items-center gap-2 ${activeTab === 'posts' ? 'text-white border-b-2 border-indigo-500 pb-1 -mb-5' : 'text-slate-500 hover:text-slate-300 pb-1 -mb-5'}`}
                 >
                   <ImageIcon size={20} className={activeTab === 'posts' ? 'text-indigo-500' : ''} />
                   Lab Posts
                 </button>
                 <button 
                    onClick={() => setActiveTab('bookmarked')}
                    className={`text-xl font-black flex items-center gap-2 ${activeTab === 'bookmarked' ? 'text-white border-b-2 border-emerald-500 pb-1 -mb-5' : 'text-slate-500 hover:text-slate-300 pb-1 -mb-5'}`}
                 >
                   <Bookmark size={20} className={activeTab === 'bookmarked' ? 'text-emerald-500' : ''} />
                   Saved
                 </button>
              </div>
              <span className="px-3 py-1 rounded-full bg-slate-900 border border-white/5 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                {(activeTab === 'posts' ? userPosts : bookmarkPosts)?.length || 0} Total
              </span>
           </div>

           {(activeTab === 'posts' ? userPosts : bookmarkPosts)?.length > 0 ? (
              <div className="grid grid-cols-3 gap-1 md:gap-4 lg:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                 {(activeTab === 'posts' ? userPosts : bookmarkPosts).map(post => (
                    <div 
                        key={post._id} 
                        onClick={() => setSelectedPost(post)}
                        className="aspect-square bg-slate-900 rounded-lg md:rounded-2xl overflow-hidden border border-white/5 relative group cursor-pointer shadow-lg shadow-black/20"
                    >
                       {post.image ? (
                          <img src={post.image} alt="Post thumbnail" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                       ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-indigo-950/20 text-center">
                             <MessageSquare className="text-indigo-500/50 mb-2 w-8 h-8 md:w-12 md:h-12" />
                             <p className="text-xs md:text-sm font-medium text-slate-400 line-clamp-3 md:line-clamp-4 px-2">{post.content}</p>
                          </div>
                       )}
                       
                       {/* Overlay on Hover */}
                       <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-4 md:gap-6">
                          <div className="flex items-center gap-2 text-white font-bold text-sm md:text-lg">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6 fill-white" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0}><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                             {post.upvotesCount || 0}
                          </div>
                          <div className="flex items-center gap-2 text-white font-bold text-sm md:text-lg">
                             <MessageSquare className="w-5 h-5 md:w-6 md:h-6 fill-white text-white" />
                             0
                          </div>
                       </div>
                    </div>
                 ))}
              </div>
           ) : (
              <div className="text-center py-24 glass rounded-4xl border border-white/10 opacity-50">
                {activeTab === 'posts' ? (
                   <ImageIcon size={48} className="mx-auto text-slate-500 mb-4 opacity-20" />
                ) : (
                   <Bookmark size={48} className="mx-auto text-slate-500 mb-4 opacity-20" />
                )}
                <h3 className="text-xl font-bold text-white mb-2">No Posts Yet</h3>
                <p className="text-slate-400">When you {activeTab === 'posts' ? 'share logic or code' : 'save posts'}, it appears here.</p>
              </div>
           )}
        </div>
        
        {/* Instagram-Style Post Modal Overlay */}
        {selectedPost && (
           <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedPost(null)}>
              <div 
                 className="relative w-full max-w-5xl max-h-[90vh] bg-slate-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col md:flex-row shadow-indigo-500/10 animate-in zoom-in-95 duration-200"
                 onClick={e => e.stopPropagation()}
              >
                 <button onClick={() => setSelectedPost(null)} className="absolute top-4 right-4 md:right-auto md:left-4 z-[60] bg-black/50 hover:bg-black/80 text-white rounded-full p-2 transition-colors mix-blend-difference">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                 </button>

                 {/* Left Visual Area */}
                 <div className="md:w-[65%] bg-black flex items-center justify-center relative min-h-[300px]">
                    {selectedPost.image ? (
                        <img src={selectedPost.image} className="w-full h-full object-contain max-h-[90vh]" alt="Post content" />
                    ) : (
                        <div className="w-full h-full p-8 md:p-12 bg-indigo-950/20 custom-scrollbar overflow-y-auto flex flex-col">
                            <div className="m-auto w-full text-center py-4">
                               <p className="text-xl md:text-2xl lg:text-3xl font-medium text-slate-300 leading-relaxed whitespace-pre-wrap">{selectedPost.content}</p>
                            </div>
                        </div>
                    )}
                 </div>

                 {/* Right Detail Area */}
                 <div className="md:w-[35%] flex flex-col h-full max-h-[90vh] bg-slate-950 border-l border-white/5">
                    {/* Header */}
                    <div className="p-4 border-b border-white/5 flex items-center gap-3 shrink-0">
                       <div className="w-10 h-10 overflow-hidden rounded-full bg-indigo-900/50 flex items-center justify-center font-bold text-indigo-400 shrink-0 border border-indigo-500/20">
                          {profile?.profilePicture ? <img src={profile.profilePicture} alt="Avatar" className="w-full h-full object-cover"/> : (profile?.firstName?.charAt(0) || "U")}
                       </div>
                       <div className="flex flex-col">
                          <span className="font-bold text-slate-200 text-sm">{profile?.firstName} {profile?.lastName}</span>
                          <span className="text-xs text-slate-500">@{profile?.firstName?.toLowerCase()}</span>
                       </div>
                    </div>
                    
                    {/* Caption Box */}
                    <div className="p-4 overflow-y-auto flex-1 custom-scrollbar text-[15px] text-slate-300 whitespace-pre-wrap leading-relaxed">
                       {selectedPost.content && (
                          <div className="mb-4">
                             <span className="font-bold text-slate-200 mr-2">{profile?.firstName}</span>
                             {selectedPost.content}
                          </div>
                       )}
                       {selectedPost.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-4">
                             {selectedPost.tags.map(tag => (
                               <span key={tag} className="text-[13px] text-indigo-400 font-medium cursor-pointer">#{tag}</span>
                             ))}
                          </div>
                       )}
                    </div>

                    {/* Footer Interactions */}
                    <div className="p-4 border-t border-white/5 shrink-0 bg-slate-950">
                       <div className="flex items-center gap-4 mb-3">
                          <button className="text-slate-400 hover:text-emerald-400 transition-colors group">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 group-hover:-translate-y-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                          </button>
                          <button className="text-slate-400 hover:text-indigo-400 transition-colors group">
                             <MessageSquare className="w-6 h-6 group-hover:scale-110 transition-transform" />
                          </button>
                       </div>
                       <div className="font-bold text-sm text-white mb-1">{selectedPost.upvotesCount || 0} upvotes</div>
                       <div className="text-[11px] text-slate-500 uppercase tracking-wide font-bold">
                          {new Date(selectedPost.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                       </div>
                    </div>
                 </div>

              </div>
           </div>
        )}
      </div>
    </div>
  );
}

export default Profile;

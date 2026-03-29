import React, { useState } from "react";
import { 
  Home, Hash, Bell, Mail, Bookmark, User,
  MoreHorizontal, Image as ImageIcon, Code2, Smile, ArrowBigUp, ArrowBigDown, MessageCircle, Share, 
  Search, Settings, Sparkles, Plus, FlaskConical 
} from "lucide-react";
import { NavLink } from "react-router";

// Dummy data to visualize the developer feed
const DUMMY_POSTS = [
  {
    id: 1,
    author: { name: "Alice Dev", handle: "@alicedev", avatar: "A" },
    time: "2h",
    content: "Finally mastered Dynamic Programming today! The trick is to stop thinking about recursion and start visualizing the state transitions as a graph. Here is a generic template I use for knapsack problems:",
    codeSnippet: `function knapsack(weights, values, capacity) {
  const n = weights.length;
  const dp = Array(n + 1).fill().map(() => Array(capacity + 1).fill(0));
  
  for (let i = 1; i <= n; i++) {
    for (let w = 1; w <= capacity; w++) {
      if (weights[i-1] <= w) {
        dp[i][w] = Math.max(
          values[i-1] + dp[i-1][w - weights[i-1]],
          dp[i-1][w]
        );
      } else {
        dp[i][w] = dp[i-1][w];
      }
    }
  }
  return dp[n][capacity];
}`,
    tags: ["#DSA", "#Algorithms", "#JavaScript"],
    upvotes: 245,
    downvotes: 12,
    comments: 34,
    labMode: true
  },
  {
    id: 2,
    author: { name: "Bob Builder", handle: "@bobbuilds", avatar: "B" },
    time: "5h",
    content: "Just deployed my first microservice using Node.js and Docker! The containerization process makes everything so clean compared to resolving local dependency hell. Anyone else transitioning to microservices?",
    codeSnippet: null,
    tags: ["#Backend", "#Docker", "#NodeJS"],
    upvotes: 120,
    downvotes: 5,
    comments: 18,
    labMode: false
  }
];

function FeedLab() {
  const [labMode, setLabMode] = useState(false);
  const [activeNav, setActiveNav] = useState("Home");
  const [postText, setPostText] = useState("");

  const NAV_ITEMS = [
    { name: "Home", icon: Home, path: "/feedlab" },
    { name: "Explore", icon: Hash, path: "/feedlab/explore" },
    { name: "Notifications", icon: Bell, path: "/feedlab/notifications" },
    { name: "Messages", icon: Mail, path: "/feedlab/messages" },
    { name: "Bookmarks", icon: Bookmark, path: "/feedlab/bookmarks" },
    { name: "Profile", icon: User, path: "/profile" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30">
      
      {/* ── PARENT WRAPPER ── */}
      <div className="max-w-[1300px] mx-auto flex justify-center">

        {/* ── LEFT SIDEBAR (Navigation) ── */}
        <aside className="hidden sm:flex flex-col w-[80px] xl:w-[275px] h-screen sticky top-0 border-r border-white/5 pt-4 pb-6 px-2 xl:px-4">
          <div className="flex flex-col h-full">
            
            {/* Logo */}
            <NavLink to="/" className="flex items-center gap-3 p-3 mb-4 w-fit hover:bg-white/5 rounded-full transition-colors">
              <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-2.5 rounded-xl cursor-pointer shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                <FlaskConical size={24} className="text-white" />
              </div>
              <span className="hidden xl:block text-2xl font-black bg-gradient-to-r from-indigo-400 to-pink-400 bg-clip-text text-transparent">LogicLab</span>
            </NavLink>

            {/* Nav Links */}
            <nav className="flex flex-col gap-2 flex-1">
              {NAV_ITEMS.map((item) => {
                const isActive = activeNav === item.name;
                return (
                  <button 
                    key={item.name}
                    onClick={() => setActiveNav(item.name)}
                    className={`flex items-center gap-4 p-3 xl:px-4 rounded-full w-fit xl:w-full transition-all duration-200 ${
                      isActive ? "bg-white/10 font-bold text-white relative" : "hover:bg-white/5 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <item.icon size={26} strokeWidth={isActive ? 2.5 : 2} className={isActive ? "text-indigo-400" : ""} />
                    <span className="hidden xl:block text-lg">{item.name}</span>
                    {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-full hidden xl:block" />}
                  </button>
                )
              })}

              {/* Post Button */}
              <button className="mt-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full p-4 xl:py-4 xl:px-0 font-bold shadow-lg shadow-indigo-500/25 transition-all w-fit xl:w-[90%] mx-auto flex justify-center items-center">
                <Plus size={24} className="xl:hidden" />
                <span className="hidden xl:block text-lg">Lab Post</span>
              </button>
            </nav>

            {/* Bottom Profile Preview */}
            <div className="mt-auto flex items-center justify-between p-3 rounded-full hover:bg-white/5 transition-colors cursor-pointer w-fit xl:w-full">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-white border border-white/10 shrink-0">
                  R
                </div>
                <div className="hidden xl:block">
                  <p className="font-bold text-sm leading-tight text-slate-200">Rishabh Singh</p>
                  <p className="text-slate-500 text-sm">@rishabh_dev</p>
                </div>
              </div>
              <MoreHorizontal size={20} className="text-slate-500 hidden xl:block shrink-0" />
            </div>
          </div>
        </aside>

        {/* ── MIDDLE (Main Feed) ── */}
        <main className="flex-1 min-w-0 max-w-[600px] w-full border-r border-white/5">
          {/* Header */}
          <header className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur-md border-b border-white/5 px-4 py-3 flex items-center justify-between">
            <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-200 to-slate-400">FeedLab</h2>
            
            {/* Lab Mode Toggle */}
            <div className="flex items-center gap-2 bg-slate-900 border border-white/5 px-3 py-1.5 rounded-full shadow-inner">
              <Sparkles size={14} className={labMode ? "text-amber-400" : "text-slate-500"} />
              <span className="text-xs font-bold text-slate-300">Lab Mode</span>
              <button 
                onClick={() => setLabMode(!labMode)}
                className={`w-9 h-5 rounded-full flex items-center px-1 transition-colors duration-300 ${labMode ? 'bg-amber-500/20' : 'bg-slate-800'}`}
              >
                <div className={`w-3 h-3 rounded-full bg-white transition-transform duration-300 ${labMode ? 'translate-x-4 bg-amber-400' : 'translate-x-0 bg-slate-500'}`} />
              </button>
            </div>
          </header>

          {/* Create Post Input */}
          <div className="px-4 py-4 border-b border-white/5 flex gap-4">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-white shrink-0 mt-1">
              R
            </div>
            <div className="flex-1">
              <textarea 
                placeholder="What are you building or debugging?"
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                className="w-full bg-transparent text-lg text-slate-200 placeholder-slate-500 outline-none resize-none pt-2 overflow-hidden min-h-[60px]"
                rows={1}
              />
              
              <div className="flex items-center justify-between pt-3 border-t border-white/5 mt-2">
                <div className="flex gap-1">
                  <button className="p-2 text-indigo-400 hover:bg-indigo-500/10 rounded-full transition-colors group">
                    <ImageIcon size={18} className="group-hover:scale-110 transition-transform" />
                  </button>
                  <button className="p-2 text-indigo-400 hover:bg-indigo-500/10 rounded-full transition-colors group">
                    <Code2 size={18} className="group-hover:scale-110 transition-transform" />
                  </button>
                  <button className="p-2 text-indigo-400 hover:bg-indigo-500/10 rounded-full transition-colors group">
                    <Smile size={18} className="group-hover:scale-110 transition-transform" />
                  </button>
                </div>
                <button 
                  disabled={!postText.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-1.5 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
                >
                  Post
                </button>
              </div>
            </div>
          </div>

          {/* Filter Notice (If Lab Mode is ON) */}
          {labMode && (
            <div className="bg-amber-500/10 border-b border-white/5 px-4 py-2 flex items-center gap-2">
              <Sparkles size={16} className="text-amber-400" />
              <p className="text-sm font-medium text-amber-200/80">Showing only logic and algorithm focused posts.</p>
            </div>
          )}

          {/* Feed Stream */}
          <div>
            {DUMMY_POSTS.map((post) => (
              <article key={post.id} className="px-4 py-5 border-b border-white/5 hover:bg-white/[0.02] transition-colors cursor-pointer flex gap-3">
                {/* Avatar Left Column */}
                <div className="shrink-0 flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-indigo-900/50 border border-indigo-500/20 flex items-center justify-center font-bold text-indigo-300">
                    {post.author.avatar}
                  </div>
                  {/* Visual thread line if needed in future */}
                  <div className="w-px h-full bg-white/5 mt-2 hidden" />
                </div>

                {/* Content Right Column */}
                <div className="flex-1 min-w-0">
                  
                  {/* Post Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-bold text-slate-200 truncate hover:underline">{post.author.name}</span>
                      {post.labMode && <Sparkles size={12} className="text-amber-400 shrink-0" />}
                      <span className="text-slate-500 text-sm truncate">{post.author.handle}</span>
                      <span className="text-slate-600 text-sm">·</span>
                      <span className="text-slate-500 text-sm">{post.time}</span>
                    </div>
                    <button className="text-slate-500 hover:text-indigo-400 p-1 rounded-full hover:bg-indigo-500/10 transition-colors">
                      <MoreHorizontal size={16} />
                    </button>
                  </div>

                  {/* Post Body */}
                  <div className="mt-1 text-slate-300 leading-relaxed text-[15px] whitespace-pre-wrap">
                    {post.content}
                  </div>

                  {/* Optional Code Snippet Block */}
                  {post.codeSnippet && (
                    <div className="mt-3 bg-slate-900 border border-slate-700/50 rounded-xl overflow-hidden">
                      <div className="bg-slate-800 px-3 py-1.5 flex items-center gap-2 border-b border-slate-700/50">
                        <Code2 size={14} className="text-indigo-400" />
                        <span className="text-xs font-bold text-slate-400 tracking-wider">CODE SNIPPET</span>
                      </div>
                      <div className="p-3 overflow-x-auto custom-scrollbar">
                        <pre className="text-sm font-mono text-indigo-300/90 leading-relaxed whitespace-pre">
                          <code>{post.codeSnippet}</code>
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  {post.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {post.tags.map(tag => (
                        <span key={tag} className="text-sm text-indigo-400 hover:underline">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Actions (Interaction Bar) */}
                  <div className="flex items-center justify-between text-slate-500 mt-3 max-w-md">
                    
                    {/* Upvote / Downvote */}
                    <div className="flex items-center">
                      <button className="flex items-center gap-1 p-1.5 rounded-full hover:bg-emerald-500/10 hover:text-emerald-400 transition-colors group">
                        <ArrowBigUp size={20} className="group-hover:-translate-y-0.5 transition-transform" />
                      </button>
                      <span className="text-sm font-bold w-8 text-center">{post.upvotes - post.downvotes}</span>
                      <button className="flex items-center gap-1 p-1.5 rounded-full hover:bg-rose-500/10 hover:text-rose-400 transition-colors group">
                        <ArrowBigDown size={20} className="group-hover:translate-y-0.5 transition-transform" />
                      </button>
                    </div>

                    <button className="flex items-center gap-1.5 p-1.5 px-3 rounded-full hover:bg-indigo-500/10 hover:text-indigo-400 transition-colors group">
                      <MessageCircle size={18} className="group-hover:scale-110 transition-transform" />
                      <span className="text-sm">{post.comments}</span>
                    </button>

                    <button className="flex items-center gap-1.5 p-1.5 px-3 rounded-full hover:bg-slate-700 hover:text-white transition-colors group">
                      <Share size={18} className="group-hover:scale-110 transition-transform" />
                    </button>

                    <button className="flex items-center gap-1.5 p-1.5 px-3 rounded-full hover:bg-amber-500/10 hover:text-amber-400 transition-colors group">
                      <Bookmark size={18} className="group-hover:scale-110 transition-transform" />
                    </button>

                  </div>

                </div>
              </article>
            ))}
          </div>

        </main>

        {/* ── RIGHT SIDEBAR (Trends / Connections) ── */}
        <aside className="hidden lg:block w-[350px] sticky top-0 h-screen overflow-y-auto px-4 pt-4 pb-6 custom-scrollbar border-l border-white/5">
          
          {/* Global Search */}
          <div className="relative group mb-6">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
            <input 
              type="text" 
              placeholder="Search posts, users, tags..." 
              className="w-full bg-slate-900 border border-white/5 rounded-full py-3 pl-12 pr-4 text-slate-200 focus:outline-none focus:border-indigo-500/50 focus:bg-slate-950 transition-all font-medium placeholder-slate-500"
            />
          </div>

          {/* Trending Panel */}
          <div className="bg-slate-900 border border-white/5 rounded-2xl overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-white/5">
              <h3 className="text-xl font-extrabold text-slate-200 tracking-tight">Trending in Labs</h3>
            </div>
            <div className="flex flex-col">
              {[
                { topic: "React", posts: "12.4k", desc: "Component Architecture" },
                { topic: "DSA", posts: "8.2k", desc: "Dynamic Programming" },
                { topic: "NodeJS", posts: "4.1k", desc: "Event Loop mastery" },
              ].map((trend, i) => (
                <div key={i} className="px-5 py-3 hover:bg-white/5 transition-colors cursor-pointer">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{trend.desc}</p>
                      <p className="font-bold text-slate-200 mt-0.5">#{trend.topic}</p>
                      <p className="text-sm text-slate-500 mt-0.5">{trend.posts} posts</p>
                    </div>
                    <button className="text-slate-500 hover:text-white p-1 rounded-full"><MoreHorizontal size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Suggested Devs */}
          <div className="bg-slate-900 border border-white/5 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5">
              <h3 className="text-xl font-extrabold text-slate-200 tracking-tight">Suggested Devs</h3>
            </div>
            <div className="flex flex-col">
              {[
                { name: "John Smith", handle: "@johnsm", avatar: "J" },
                { name: "Sarah Connor", handle: "@sarah_c", avatar: "S" },
              ].map((user, i) => (
                <div key={i} className="px-5 py-3 hover:bg-white/5 transition-colors cursor-pointer flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold">
                      {user.avatar}
                    </div>
                    <div>
                      <p className="font-bold text-slate-200 text-sm leading-tight hover:underline">{user.name}</p>
                      <p className="text-slate-500 text-sm">{user.handle}</p>
                    </div>
                  </div>
                  <button className="bg-white text-slate-950 font-bold px-4 py-1.5 rounded-full text-sm hover:bg-slate-200 transition-colors">
                    Follow
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Footer links */}
          <div className="px-5 py-6 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
            <a href="#" className="hover:underline">Terms of Service</a>
            <a href="#" className="hover:underline">Privacy Policy</a>
            <a href="#" className="hover:underline">Cookie Policy</a>
            <span>© 2026 LogicLab</span>
          </div>

        </aside>

      </div>
    </div>
  );
}

export default FeedLab;

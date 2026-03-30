import React, { useState } from "react";
import { 
  Home, Hash, Bell, Mail, Bookmark, User,
  MoreHorizontal, Image as ImageIcon, Code2, Smile, ArrowBigUp, ArrowBigDown, MessageCircle, Share, 
  Search, Settings, Sparkles, Plus, FlaskConical, Menu 
} from "lucide-react";
import { NavLink, useOutletContext } from "react-router";

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
  }
];

function FeedLab() {
  const [postText, setPostText] = useState("");
  const { isCollapsed, setIsCollapsed } = useOutletContext();

  return (
        <>
        {/* ── MIDDLE (Main Feed) ── */}
        <main className="flex-1 min-w-0 w-full bg-white dark:bg-slate-950 h-screen overflow-y-auto custom-scrollbar">
          {/* Header */}
          <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-white/5 px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300"
              >
                <Menu size={24} />
              </button>
              <h1 className="logo text-xl">
                <span>FeedLab</span>
              </h1>
            </div>
          </header>

          {/* Create Post Input */}
          <div id="create-post" className="px-4 py-4 border-b border-slate-200 dark:border-white/5 flex gap-4">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-white shrink-0 mt-1">
              R
            </div>
            <div className="flex-1">
              <textarea 
                placeholder="What are you building or debugging?"
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                className="w-full bg-transparent text-lg text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none resize-none pt-2 overflow-hidden min-h-[60px]"
                rows={1}
              />
              
              <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-white/5 mt-2">
                <div className="flex gap-1">
                  <button className="p-2 text-indigo-500 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-full transition-colors group">
                    <ImageIcon size={18} className="group-hover:scale-110 transition-transform" />
                  </button>
                  <button className="p-2 text-indigo-500 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-full transition-colors group">
                    <Code2 size={18} className="group-hover:scale-110 transition-transform" />
                  </button>
                  <button className="p-2 text-indigo-500 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-full transition-colors group">
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

          <div>
            {DUMMY_POSTS.map((post) => (
              <article key={post.id} className="px-4 py-5 border-b border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer flex gap-3">
                {/* Avatar Left Column */}
                <div className="shrink-0 flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center font-bold text-indigo-600 dark:text-indigo-300">
                    {post.author.avatar}
                  </div>
                </div>

                {/* Content Right Column */}
                <div className="flex-1 min-w-0">
                  
                  {/* Post Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-bold text-slate-900 dark:text-slate-200 truncate hover:underline">{post.author.name}</span>
                      <span className="text-slate-500 text-sm truncate">{post.author.handle}</span>
                      <span className="text-slate-400 dark:text-slate-600 text-sm">·</span>
                      <span className="text-slate-500 text-sm">{post.time}</span>
                    </div>
                    <button className="text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 p-1 rounded-full hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors">
                      <MoreHorizontal size={16} />
                    </button>
                  </div>

                  {/* Post Body */}
                  <div className="mt-1 text-slate-700 dark:text-slate-300 leading-relaxed text-[15px] whitespace-pre-wrap">
                    {post.content}
                  </div>

                  {/* Optional Code Snippet Block */}
                  {post.codeSnippet && (
                    <div className="mt-3 bg-slate-900 border border-slate-700/50 rounded-xl overflow-hidden shadow-inner">
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
                        <span key={tag} className="text-sm text-indigo-500 dark:text-indigo-400 hover:underline">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Actions (Interaction Bar) */}
                  <div className="flex items-center justify-between text-slate-500 mt-3 max-w-md">
                    
                    {/* Upvote / Downvote */}
                    <div className="flex items-center">
                      <button className="flex items-center gap-1 p-1.5 rounded-full hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors group">
                        <ArrowBigUp size={20} className="group-hover:-translate-y-0.5 transition-transform" />
                      </button>
                      <span className="text-sm font-bold w-8 text-center">{post.upvotes - post.downvotes}</span>
                      <button className="flex items-center gap-1 p-1.5 rounded-full hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-500 dark:hover:text-rose-400 transition-colors group">
                        <ArrowBigDown size={20} className="group-hover:translate-y-0.5 transition-transform" />
                      </button>
                    </div>

                    <button className="flex items-center gap-1.5 p-1.5 px-3 rounded-full hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors group">
                      <MessageCircle size={18} className="group-hover:scale-110 transition-transform" />
                      <span className="text-sm">{post.comments}</span>
                    </button>

                    <button className="flex items-center gap-1.5 p-1.5 px-3 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors group">
                      <Share size={18} className="group-hover:scale-110 transition-transform" />
                    </button>

                    <button className="flex items-center gap-1.5 p-1.5 px-3 rounded-full hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:text-amber-500 dark:hover:text-amber-400 transition-colors group">
                      <Bookmark size={18} className="group-hover:scale-110 transition-transform" />
                    </button>

                  </div>

                </div>
              </article>
            ))}
          </div>

        </main>


        </>
  );
}

export default FeedLab;

import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  MoreHorizontal, Image as ImageIcon, Code2, Smile, ArrowBigUp, ArrowBigDown, MessageCircle, Share, Bookmark, Menu, Trash2, Plus, Loader2 
} from "lucide-react";
import { NavLink, useOutletContext, Link } from "react-router";
import axios from "../utility/axios";
import { useSelector } from "react-redux";
import EmojiPicker from "emoji-picker-react";
import CommentSection from "../components/CommentSection";

function FeedLab() {
  const [postText, setPostText] = useState("");
  const [posts, setPosts] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // New States
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [fullScreenImg, setFullScreenImg] = useState(null);
  const [expandedComments, setExpandedComments] = useState({});
  const [bookmarkPostIds, setBookmarkPostIds] = useState(new Set());

  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const mainRef = useRef(null);

  // Pagination States
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);
  const observer = useRef();
  
  const lastPostElementRef = useCallback(node => {
    if (loading || fetchingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, fetchingMore, hasMore]);

  const { isCollapsed, setIsCollapsed } = useOutletContext();
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    if (page === 1) {
      setLoading(true);
    } else {
      setFetchingMore(true);
    }
    
    axios.get(`/post?page=${page}&limit=10`)
      .then(res => {
        if (page === 1) {
          setPosts(res.data.posts);
        } else {
          setPosts(prev => [...prev, ...res.data.posts]);
        }
        setHasMore(res.data.hasMore);
      })
      .catch(err => console.error(err))
      .finally(() => {
        setLoading(false);
        setFetchingMore(false);
      });
  }, [page]);

  useEffect(() => {
    if (user?._id) {
       axios.get(`/post/user/${user._id}/bookmarked`)
         .then(res => {
            const ids = new Set(res.data.posts.map(p => p._id));
            setBookmarkPostIds(ids);
         })
         .catch(err => console.error("Failed to fetch bookmarked posts", err));
    }
  }, [user]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleTextareaInput = (e) => {
    setPostText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";
  };

  const onEmojiClick = (emojiObject) => {
    setPostText(prev => prev + emojiObject.emoji);
    if (textareaRef.current) {
        // Just trigger standard height reset to catch external text update
        setTimeout(() => {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
        }, 10);
    }
  };

  const handlePostSubmit = async () => {
    if (!postText.trim() && !imageFile) return;
    setLoading(true);
    try {
      const formData = new FormData();
      if (postText.trim()) formData.append("content", postText);
      if (imageFile) formData.append("image", imageFile);
      
      const res = await axios.post("/post/create", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      const newPost = {
         ...res.data.post,
         author: {
             _id: user._id,
             firstName: user.firstName,
             lastName: user.lastName,
             nickname: user.nickname,
             profilePicture: user.profilePicture
         }
      };
      setPosts([newPost, ...posts]);
      setPostText("");
      setImageFile(null);
      setImagePreview(null);
      setShowEmojiPicker(false);
      
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (textareaRef.current) textareaRef.current.style.height = "60px"; // Reset height

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this post?");
    if (!confirmDelete) return;
    try {
      await axios.delete(`/post/${id}`);
      setPosts(posts.filter(p => p._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleVote = async (postId, type) => {
    try {
      const response = await axios.post(`/post/${type}/${postId}`);
      if (response.data.success) {
        // Find the updated post and replace it in the state
        const updatedPost = {
          ...response.data.post,
          author: posts.find(p => p._id === postId).author, // Keep the populated author
          commentCount: posts.find(p => p._id === postId).commentCount // Keep the comment count
        };
        setPosts(posts.map(p => p._id === postId ? updatedPost : p));
      }
    } catch (err) {
      console.error(`Failed to ${type} post`, err);
    }
  };

  const handleToggleBookmark = async (postId) => {
    try {
      const res = await axios.post(`/post/bookmark/${postId}`);
      if (res.data.success) {
         setBookmarkPostIds(prev => {
           const newSet = new Set(prev);
           if (res.data.isBookmarked) {
             newSet.add(postId);
           } else {
             newSet.delete(postId);
           }
           return newSet;
         });
      }
    } catch(err) {
      console.error("Failed to bookmark post", err);
    }
  };

  const timeAgo = (dateStr) => {
     const date = new Date(dateStr);
     if (isNaN(date.getTime())) return "just now";
     const now = new Date();
     const diffInSeconds = Math.floor((now - date) / 1000);
     if (diffInSeconds < 60) return `${diffInSeconds}s`;
     if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
     if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
     return `${Math.floor(diffInSeconds / 86400)}d`;
  }

  // Determine Username helper
  const renderDisplayName = (author) => {
      if (!author) return "Unknown User";
      const fullName = `${author.firstName} ${author.lastName || ""}`.trim();
      return fullName || author.nickname || "User";
  };

  const renderHandle = (author) => {
      if (!author) return "";
      if (author.nickname) return `@${author.nickname}`;
      // Fallback to first name handle if no nickname
      if (author.firstName) return `@${author.firstName.toLowerCase()}`;
      return "";
  };

  return (
        <>
        {/* ── MIDDLE (Main Feed) ── */}
        <main 
          ref={mainRef}
          className="flex-1 min-w-0 w-full bg-white dark:bg-slate-950 h-screen overflow-y-auto pb-10 relative [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          
          {/* Header */}
          <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-white/5 px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300"
              >
                <Menu size={24} />
              </button>
              <button 
                onClick={() => mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
                className="logo text-xl hover:opacity-80 transition-opacity cursor-pointer"
              >
                <span>FeedLab</span>
              </button>
            </div>
          </header>

          {/* Create Post Input */}
          <div id="create-post" className="px-4 py-4 border-b border-slate-200 dark:border-white/5 flex gap-4 bg-slate-50 dark:bg-slate-950/50 relative">
            <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden flex items-center justify-center font-bold text-white shrink-0 mt-1">
              {user?.profilePicture ? <img src={user.profilePicture} alt="Avatar" className="w-full h-full object-cover"/> : (user ? user.firstName.charAt(0) : "U")}
            </div>
            
            <div className="flex-1 min-w-0">
              <textarea 
                ref={textareaRef}
                placeholder="What are you building or debugging?"
                value={postText}
                onChange={handleTextareaInput}
                className="w-full bg-transparent text-lg text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none resize-none pt-2 overflow-hidden min-h-[60px]"
                rows={1}
              />
              
              {imagePreview && (
                <div className="relative mt-3 max-w-sm rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-sm">
                   <button 
                     onClick={() => { setImagePreview(null); setImageFile(null); if(fileInputRef.current) fileInputRef.current.value = "";}} 
                     className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors"
                   >
                     <Plus size={16} className="rotate-45" />
                   </button>
                   <img src={imagePreview} alt="Preview" className="w-full h-auto object-cover max-h-64" />
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-white/5 mt-2 relative">
                <div className="flex gap-1">
                  <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageChange} />
                  
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-indigo-500 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-full transition-colors group"
                  >
                    <ImageIcon size={18} className="group-hover:scale-110 transition-transform" />
                  </button>
                  {/* Emoji Button */}
                  <div className="relative">
                    <button 
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="p-2 text-indigo-500 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-full transition-colors group"
                    >
                        <Smile size={18} className="group-hover:scale-110 transition-transform" />
                    </button>
                    {showEmojiPicker && (
                        <div className="absolute top-10 left-0 z-50 shadow-2xl">
                            <EmojiPicker onEmojiClick={onEmojiClick} theme="dark" skinTonesDisabled />
                        </div>
                    )}
                  </div>
                </div>

                <button 
                  disabled={loading || (!postText.trim() && !imageFile)}
                  onClick={handlePostSubmit}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-1.5 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md flex items-center gap-2"
                >
                  {loading ? <span className="loading loading-spinner loading-xs"></span> : null}
                  Post
                </button>
              </div>
            </div>
          </div>

          <div onClick={() => setShowEmojiPicker(false)}>
            {posts.map((post, index) => {
              const isLast = index === posts.length - 1;
              return (
              <article ref={isLast ? lastPostElementRef : null} key={post._id} className="px-4 py-5 border-b border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors flex gap-3">
                {/* Avatar Left Column */}
                <Link to={`/profile/${post.author?._id}`} className="shrink-0 flex flex-col items-center">
                  <div className="w-10 h-10 overflow-hidden rounded-full bg-indigo-100 dark:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center font-bold text-indigo-600 dark:text-indigo-300">
                    {post.author?.profilePicture ? <img src={post.author.profilePicture} alt="Avatar" className="w-full h-full object-cover"/> : (post.author?.firstName ? post.author.firstName.charAt(0) : "U")}
                  </div>
                </Link>

                {/* Content Right Column */}
                <div className="flex-1 min-w-0">
                  
                  {/* Post Header */}
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-1.5 truncate">
                        <Link to={`/profile/${post.author?._id}`} className="font-bold text-slate-900 dark:text-slate-200 truncate hover:underline">
                          {renderDisplayName(post.author)}
                        </Link>
                        <span className="text-slate-500 text-sm truncate">{renderHandle(post.author)}</span>
                        <span className="text-slate-400 dark:text-slate-600 text-sm">·</span>
                        <span className="text-slate-500 text-sm">{timeAgo(post.createdAt)}</span>
                      </div>
                      
                      {user && user._id === post.author?._id ? (
                        <button onClick={() => handleDeletePost(post._id)} className="text-slate-400 hover:text-rose-500 p-1 rounded-full hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors" title="Delete Post">
                          <Trash2 size={16} />
                        </button>
                      ) : (
                        <button className="text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 p-1 rounded-full hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors">
                          <MoreHorizontal size={16} />
                        </button>
                      )}
                  </div>

                  {/* Post Body */}
                  {post.content && (
                    <div className="mt-1 text-slate-700 dark:text-slate-300 leading-relaxed text-[15px] whitespace-pre-wrap">
                      {post.content}
                    </div>
                  )}

                  {/* Post Image viewer updated for object-contain scalable viewing */}
                  {post.image && (
                     <div 
                        onClick={() => setFullScreenImg(post.image)}
                        className="mt-3 rounded-2xl overflow-hidden border border-slate-200 dark:border-white/5 cursor-zoom-in bg-slate-100 dark:bg-slate-900 flex justify-center items-center"
                      >
                        <img 
                            src={post.image} 
                            alt="Post content" 
                            className="w-full h-auto max-h-[600px] object-contain transition-transform" 
                        />
                     </div>
                  )}

                  {/* Tags */}
                  {post.tags?.length > 0 && (
                     <div className="flex flex-wrap gap-2 mt-3">
                        {post.tags.map(tag => (
                          <span key={tag} className="text-sm text-indigo-500 dark:text-indigo-400 hover:underline">
                            #{tag.replace(/^#+/, '')}
                          </span>
                        ))}
                     </div>
                  )}

                  {/* Actions (Interaction Bar) */}
                  <div className="flex items-center justify-between text-slate-500 mt-3 max-w-md">
                    
                    {/* Upvote / Downvote */}
                    <div className="flex items-center gap-1">
                      <div className="flex items-center">
                        <button 
                          onClick={() => handleVote(post._id, "upvote")}
                          className={`flex items-center gap-1 p-1.5 rounded-full transition-colors group ${post.upvotes?.includes(user?._id) ? 'bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-400' : 'hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-500 dark:hover:text-emerald-400 text-slate-500'}`}
                        >
                          <ArrowBigUp size={20} fill={post.upvotes?.includes(user?._id) ? "currentColor" : "none"} className="group-hover:-translate-y-0.5 transition-transform" />
                        </button>
                        <span className={`text-[13px] font-bold min-w-[12px] ${post.upvotes?.includes(user?._id) ? 'text-emerald-500' : 'text-slate-500'}`}>
                          {post.upvotesCount || 0}
                        </span>
                      </div>

                      <div className="flex items-center">
                        <button 
                          onClick={() => handleVote(post._id, "downvote")}
                          className={`flex items-center gap-1.5 p-1.5 px-3 rounded-full transition-colors group ${post.downvotes?.includes(user?._id) ? 'bg-rose-50 text-rose-500 dark:bg-rose-500/10 dark:text-rose-400' : 'hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-500 dark:hover:text-rose-400 text-slate-500'}`}
                        >
                          <ArrowBigDown size={20} fill={post.downvotes?.includes(user?._id) ? "currentColor" : "none"} className="group-hover:translate-y-0.5 transition-transform" />
                        </button>
                        <span className={`text-[13px] font-bold min-w-[12px] ${post.downvotes?.includes(user?._id) ? 'text-rose-500' : 'text-slate-500'}`}>
                          {post.downvotesCount || 0}
                        </span>
                      </div>
                    </div>

                    <button 
                      onClick={() => setExpandedComments(prev => ({ ...prev, [post._id]: !prev[post._id] }))}
                      className={`flex items-center gap-1.5 p-1.5 px-3 rounded-full transition-colors group ${expandedComments[post._id] ? 'bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10 dark:text-indigo-400' : 'hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-500 dark:hover:text-indigo-400'}`}
                    >
                      <MessageCircle size={18} className="group-hover:scale-110 transition-transform" />
                      <span className="text-sm font-bold">{post.commentCount || 0}</span>
                    </button>

                    <button 
                      onClick={() => handleToggleBookmark(post._id)}
                      className={`flex items-center gap-1.5 p-1.5 px-3 rounded-full transition-colors group ${bookmarkPostIds.has(post._id) ? 'bg-amber-50 text-amber-500 dark:bg-amber-500/10 dark:text-amber-400' : 'hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:text-amber-500 dark:hover:text-amber-400 text-slate-500'}`}
                    >
                      <Bookmark size={18} fill={bookmarkPostIds.has(post._id) ? "currentColor" : "none"} className="group-hover:scale-110 transition-transform" />
                    </button>

                  </div>

                  {/* Comment Section (Collapsible) */}
                  {expandedComments[post._id] && (
                    <CommentSection postId={post._id} />
                  )}

                </div>
              </article>
            )})}
            
            {posts.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                <ImageIcon size={48} className="mb-4 opacity-50" />
                <p className="text-lg">No posts yet. Be the first to share something!</p>
              </div>
            )}
            
            {fetchingMore && (
              <div className="flex justify-center items-center py-6 pb-10">
                 <Loader2 size={24} className="animate-spin text-slate-500" />
              </div>
            )}
          </div>
          
          {/* Fullscreen Overlay Component */}
          {fullScreenImg && (
              <div 
                  onClick={() => setFullScreenImg(null)} 
                  className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out backdrop-blur-md"
              >
                  <img 
                      src={fullScreenImg} 
                      alt="Fullscreen View" 
                      className="max-w-[100vw] max-h-[100vh] object-contain rounded-md animate-in zoom-in-95 duration-200" 
                  />
              </div>
          )}

        </main>
        </>
  );
}

export default FeedLab;

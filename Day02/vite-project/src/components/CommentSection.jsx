import React, { useState, useEffect, useMemo } from "react";
import { Send, Trash2, Loader2, MessageSquare, CornerDownRight, Heart } from "lucide-react";
import axios from "../utility/axios";
import { useSelector } from "react-redux";
import { Link } from "react-router";

const CommentSection = ({ postId, onCommentAdded }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState("");
  const { user } = useSelector((state) => state.auth);

  const fetchComments = async () => {
    try {
      const response = await axios.post("/graphql", {
        query: `
          query GetComments($postId: ID!) {
            comments(postId: $postId) {
              id
              content
              createdAt
              parentComment
              upvotesCount
              upvotes
              author {
                id
                firstName
                lastName
                nickname
                profilePicture
              }
            }
          }
        `,
        variables: { postId }
      });
      if (response.data.data && response.data.data.comments) {
        setComments(response.data.data.comments);
      }
    } catch (err) {
      console.error("Failed to fetch comments", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const handleSubmit = async (content, parentCommentId = null) => {
    if (!content.trim()) return false;

    setSubmitting(true);
    try {
      const response = await axios.post(`/comment/${postId}`, {
        content: content.trim(),
        parentCommentId: parentCommentId
      });
      
      // Optimistic UI Update: the backend returns 202 and delegates to Kafka
      const tempComment = {
        id: response.data.comment?._id || `temp-${Date.now()}`,
        content: content.trim(),
        createdAt: new Date().getTime().toString(),
        parentComment: parentCommentId,
        upvotesCount: 0,
        upvotes: [],
        author: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          nickname: user.nickname,
          profilePicture: user.profilePicture
        }
      };
      setComments(prev => [...prev, tempComment]);

      if (!parentCommentId) {
        setNewComment("");
      }
      
      if (onCommentAdded) onCommentAdded();
      return true;
    } catch (err) {
      console.error("Failed to post comment", err);
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this comment?");
    if (!confirmDelete) return;

    try {
      await axios.delete(`/comment/${commentId}`);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (err) {
      console.error("Failed to delete comment", err);
    }
  };

  const handleUpvote = async (commentId) => {
    try {
      const response = await axios.post(`/comment/upvote/${commentId}`);
      if (response.data.success) {
        // Optimistic UI update or just refetch
        setComments(prev => prev.map(c => {
          if (c.id === commentId) {
             const isUpvoted = c.upvotes.includes(user?._id);
             return {
               ...c,
               upvotesCount: response.data.upvotesCount,
               upvotes: isUpvoted 
                 ? c.upvotes.filter(id => id !== user?._id) 
                 : [...c.upvotes, user?._id]
             };
          }
          return c;
        }));
      }
    } catch (err) {
      console.error("Failed to upvote comment", err);
    }
  };

  const timeAgo = (dateStr) => {
    const date = new Date(Number(dateStr));
    const validDate = isNaN(date.getTime()) ? new Date(dateStr) : date; 
    if (isNaN(validDate.getTime())) return "just now";
    
    const now = new Date();
    const diffInSeconds = Math.floor((now - validDate) / 1000);
    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    return `${Math.floor(diffInSeconds / 86400)}w`; 
  };

  const commentsByParentId = useMemo(() => {
    const group = {};
    comments.forEach(comment => {
      const parentId = comment.parentComment || "root";
      if (!group[parentId]) group[parentId] = [];
      group[parentId].push(comment);
    });
    return group;
  }, [comments]);


  // Recursive Node Component
  const CommentNode = ({ comment, depth = 0 }) => {
    const [isReplying, setIsReplying] = useState(false);
    const [replyText, setReplyText] = useState("");
    const [replyingSubmitting, setReplyingSubmitting] = useState(false);
    const [showReplies, setShowReplies] = useState(false);
    
    const children = commentsByParentId[comment.id] || [];
    const displayName = comment.author?.nickname || comment.author?.firstName || "user";
    const isLiked = comment.upvotes?.includes(user?._id);
    
    const handleReplySubmit = async (e) => {
      e.preventDefault();
      setReplyingSubmitting(true);
      const success = await handleSubmit(replyText, comment.id);
      if (success) {
        setReplyText("");
        setIsReplying(false);
        setShowReplies(true); 
      }
      setReplyingSubmitting(false);
    };

    return (
      <div className={`mt-3 ${depth > 0 ? "ml-1" : "mb-5"}`}>
        <div className="flex gap-3">
          <Link to={`/profile/${comment.author?.id}`} className="shrink-0">
            <div className={`rounded-full overflow-hidden bg-slate-800 flex items-center justify-center font-bold text-slate-400 border border-white/5 ${depth === 0 ? "w-8 h-8 text-xs" : "w-6 h-6 text-[10px]"}`}>
              {comment.author?.profilePicture ? (
                <img src={comment.author.profilePicture} alt={displayName} className="w-full h-full object-cover"/>
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
            </div>
          </Link>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-[14px] leading-tight">
                  <Link to={`/profile/${comment.author?.id}`} className="font-bold text-slate-900 dark:text-slate-100 hover:text-slate-500 mr-2">
                    {displayName}
                  </Link>
                  <span className="text-slate-800 dark:text-slate-300 break-words font-medium">
                    {comment.content}
                  </span>
                </div>

                <div className="flex items-center gap-4 mt-1">
                  <span className="text-[12px] text-slate-500 font-normal">
                    {timeAgo(comment.createdAt)}
                  </span>
                  {comment.upvotesCount > 0 && (
                    <span className="text-[12px] text-slate-500 font-bold">
                       {comment.upvotesCount} {comment.upvotesCount === 1 ? 'like' : 'likes'}
                    </span>
                  )}
                  <button 
                    onClick={() => setIsReplying(!isReplying)} 
                    className="text-[12px] font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                  >
                    Reply
                  </button>
                  {user && user._id === comment.author?.id && (
                    <button 
                      onClick={() => handleDelete(comment.id)} 
                      className="text-[12px] font-medium text-rose-500/70 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>

              {/* Heart Icon (Like) */}
              <button 
                onClick={() => handleUpvote(comment.id)}
                className={`transition-all duration-200 hover:scale-110 active:scale-95 pt-1 ${isLiked ? 'text-rose-500' : 'text-slate-400 dark:text-slate-600'}`}
              >
                <Heart size={14} fill={isLiked ? "currentColor" : "none"} />
              </button>
            </div>

            {isReplying && (
               <form onSubmit={handleReplySubmit} className="flex gap-2 mt-4 mb-2 animate-in slide-in-from-top-1 fade-in duration-200">
                  <div className="flex-1 min-w-0 relative">
                    <input
                      type="text"
                      value={replyText}
                      autoFocus
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={`Reply to ${displayName}...`}
                      disabled={replyingSubmitting}
                      className="w-full bg-transparent border-b border-slate-200 dark:border-white/10 py-1.5 px-0 text-sm focus:border-indigo-500 outline-none transition-all disabled:opacity-50"
                    />
                    <button 
                      type="submit" 
                      disabled={replyingSubmitting || !replyText.trim()}
                      className="absolute right-0 top-1/2 -translate-y-1/2 py-1 text-indigo-500 font-bold text-xs hover:text-indigo-400 disabled:opacity-30 transition-colors uppercase tracking-tight"
                    >
                      {replyingSubmitting ? "..." : "Post"}
                    </button>
                  </div>
                  <button type="button" onClick={() => setIsReplying(false)} className="text-[10px] text-slate-500 mt-2 hover:underline">Cancel</button>
               </form>
            )}

            {children.length > 0 && (
              <div className="mt-2">
                <button 
                  onClick={() => setShowReplies(!showReplies)}
                  className="flex items-center gap-3 group/btn"
                >
                   <div className="w-6 border-t border-slate-300 dark:border-slate-800 transition-all group-hover/btn:w-9" />
                   <span className="text-[12px] font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                     {showReplies ? "Hide replies" : `View replies (${children.length})`}
                   </span>
                </button>
              </div>
            )}

            {showReplies && children.length > 0 && (
              <div className="pl-2 border-l-0 mt-1 animate-in zoom-in-95 fade-in duration-200 origin-top">
                {children.map(child => (
                  <CommentNode key={child.id} comment={child} depth={depth + 1} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full mt-4 pt-4 border-t border-slate-100 dark:border-white/5 animate-in slide-in-from-top-2 duration-300">
      
      <div className="px-1 min-h-[50px] relative">
        {loading ? (
          <div className="flex justify-center py-6">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-slate-400">
            <MessageSquare size={20} className="mb-2 opacity-20" />
            <p className="text-xs font-semibold">No comments yet</p>
          </div>
        ) : (
          <div className="space-y-1">
            {commentsByParentId["root"]?.map((comment) => (
              <CommentNode key={comment.id} comment={comment} depth={0} />
            ))}
          </div>
        )}
      </div>

      <form 
        onSubmit={(e) => { e.preventDefault(); handleSubmit(newComment); }} 
        className="flex gap-3 mt-8 items-center border-t border-slate-50 dark:border-white/5 pt-4"
      >
        <div className="w-8 h-8 rounded-full overflow-hidden bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
          {user?.profilePicture ? (
             <img src={user.profilePicture} alt="Avatar" className="w-full h-full object-cover"/>
          ) : (
             user?.firstName?.charAt(0) || "U"
          )}
        </div>
        <div className="flex-1 min-w-0 relative">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            disabled={submitting}
            className="w-full bg-transparent border-none text-[14px] text-slate-900 dark:text-slate-200 placeholder-slate-500 outline-none focus:ring-0 transition-all disabled:opacity-50"
          />
          {newComment.trim() && (
            <button 
              type="submit" 
              disabled={submitting}
              className="absolute right-0 top-1/2 -translate-y-1/2 font-bold text-[14px] text-indigo-500 hover:text-indigo-600 transition-colors"
            >
              Post
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default CommentSection;

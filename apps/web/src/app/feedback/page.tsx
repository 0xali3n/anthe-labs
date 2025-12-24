"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Palanquin_Dark, Outfit } from "next/font/google";
import { useAuth } from "@/lib/useAuth";
import { createFeedback, getMyFeedbacks, type Feedback } from "@/lib/feedbackApi";
import { AbortError } from "@/lib/apiClient";
import { CheckCircle, AlertCircle, Send, MessageSquare, Clock } from "lucide-react";

const palanquinDark = Palanquin_Dark({
  weight: ["400", "700"],
  subsets: ["latin"],
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export default function FeedbackPage() {
  const router = useRouter();
  const { isSignedIn, loading: authLoading } = useAuth();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const isLoadingRef = useRef(false);

  // Redirect if not signed in
  useEffect(() => {
    if (!authLoading && !isSignedIn) {
      router.push("/");
    }
  }, [isSignedIn, authLoading, router]);

  // Load feedbacks on mount
  useEffect(() => {
    if (authLoading || !isSignedIn) return;

    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    let mounted = true;
    const abortController = new AbortController();

    async function loadFeedbacks() {
      setLoading(true);
      setError(null);

      try {
        const data = await getMyFeedbacks(abortController.signal);
        if (!mounted || abortController.signal.aborted) {
          isLoadingRef.current = false;
          return;
        }
        setFeedbacks(data || []);
        setLoading(false);
        isLoadingRef.current = false;
      } catch (error: any) {
        if (
          error instanceof AbortError ||
          error.message === "Request aborted" ||
          !mounted
        ) {
          isLoadingRef.current = false;
          return;
        }

        if (
          error.message?.includes("No session") ||
          error.message?.includes("Unauthorized")
        ) {
          router.push("/");
          return;
        }

        setFeedbacks([]);
        setLoading(false);
        isLoadingRef.current = false;
      }
    }

    loadFeedbacks();

    return () => {
      mounted = false;
      isLoadingRef.current = false;
      if (!abortController.signal.aborted) {
        abortController.abort();
      }
    };
  }, [isSignedIn, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validation checks
    const trimmedTitle = title.trim();
    const trimmedMessage = message.trim();

    if (!trimmedTitle || !trimmedMessage) {
      setError("Please fill in both title and message");
      return;
    }

    if (trimmedTitle.length < 3 || trimmedTitle.length > 200) {
      setError("Title must be between 3 and 200 characters");
      return;
    }

    if (trimmedMessage.length < 10 || trimmedMessage.length > 5000) {
      setError("Message must be between 10 and 5000 characters");
      return;
    }

    // Prevent double submission
    if (submitting) return;

    setSubmitting(true);

    try {
      const newFeedback = await createFeedback({
        title: trimmedTitle,
        message: trimmedMessage,
      });

      setFeedbacks((prev) => [newFeedback, ...prev]);
      setTitle("");
      setMessage("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      if (err.message?.includes("No session") || err.message?.includes("Unauthorized")) {
        router.push("/");
        return;
      }
      setError(err.message || "Failed to submit feedback");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  if (authLoading || !isSignedIn) {
    return (
      <div className="max-w-4xl mx-auto pt-24 pb-10 sm:pt-28 sm:pb-12 px-4">
        <div className="h-10 w-48 bg-slate-800/50 rounded-xl animate-pulse mb-3"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pt-24 pb-10 sm:pt-28 sm:pb-12 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className={`${palanquinDark.className} text-4xl sm:text-5xl font-bold text-white mb-3`}>
          Feedback
        </h1>
        <p className="text-slate-400 text-base sm:text-lg">
          Share your thoughts, suggestions, or report issues
        </p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-6 p-4 bg-green-900/20 border border-green-500/50 rounded-xl flex items-center gap-3 backdrop-blur-sm">
          <CheckCircle size={20} className="text-green-400 flex-shrink-0" />
          <p className="text-green-400 font-medium">
            Feedback submitted successfully!
          </p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-xl flex items-center gap-3 backdrop-blur-sm">
          <AlertCircle size={20} className="text-red-400 flex-shrink-0" />
          <p className="text-red-400 font-medium">{error}</p>
        </div>
      )}

      {/* Feedback Form */}
      <div
        className="relative bg-slate-900/50 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-sm mb-6"
        style={{ boxShadow: "0 6px 18px rgba(2,8,20,0.45)" }}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title Input */}
          <div>
            <label
              htmlFor="title"
              className={`block text-sm font-semibold text-slate-200 mb-2 ${outfit.className}`}
            >
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter feedback title..."
              maxLength={200}
              disabled={submitting}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-slate-500">
              {title.length}/200 characters
            </p>
          </div>

          {/* Message Input */}
          <div>
            <label
              htmlFor="message"
              className={`block text-sm font-semibold text-slate-200 mb-2 ${outfit.className}`}
            >
              Message
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your feedback message..."
              rows={6}
              maxLength={5000}
              disabled={submitting}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-slate-500">
              {message.length}/5000 characters
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={
              submitting || 
              !title.trim() || 
              !message.trim() ||
              title.trim().length < 3 ||
              message.trim().length < 10
            }
            className={`w-full sm:w-auto px-6 py-3 bg-blue-500 hover:bg-blue-400 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${outfit.className}`}
          >
            {submitting ? (
              <>
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <Send size={18} />
                <span>Submit Feedback</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Feedback History */}
      <div
        className="relative bg-slate-900/50 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-sm"
        style={{ boxShadow: "0 6px 18px rgba(2,8,20,0.45)" }}
      >
        <div className="flex items-center gap-3 mb-6">
          <MessageSquare size={20} className="text-slate-400" />
          <h2 className={`text-xl font-bold text-white ${palanquinDark.className}`}>
            Your Feedback History
          </h2>
          <span className="text-sm text-slate-500 ml-auto">
            {feedbacks.length} {feedbacks.length === 1 ? "entry" : "entries"}
          </span>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 bg-slate-800/30 rounded-xl animate-pulse"
              ></div>
            ))}
          </div>
        ) : feedbacks.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare size={48} className="text-slate-600 mx-auto mb-3 opacity-50" />
            <p className="text-slate-400 text-sm">No feedback submitted yet</p>
            <p className="text-slate-500 text-xs mt-1">Your feedback history will appear here</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {feedbacks.map((feedback) => (
              <div
                key={feedback.id}
                className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4 hover:bg-slate-800/40 transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="text-white font-semibold text-sm sm:text-base flex-1 line-clamp-1">
                    {feedback.title}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-slate-500 flex-shrink-0">
                    <Clock size={12} />
                    <span className="whitespace-nowrap">{formatDate(feedback.created_at)}</span>
                  </div>
                </div>
                <p className="text-slate-400 text-sm line-clamp-2 break-words">
                  {feedback.message}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


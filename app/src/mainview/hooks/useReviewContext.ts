import { useState, useCallback, useMemo } from 'react';
import { buildCommentMessage } from '../components/code/viewer/CommentsSummary';

export interface ReviewComment {
  id: string;
  filePath: string;
  startLine: number;
  endLine?: number;
  content: string;
  status: 'pending' | 'sent' | 'resolved' | 'dismissed';
  createdAt: string;
}

export interface UseReviewContextOptions {
  sessionId: string;
  onSendMessage?: (message: string) => void;
}

export function useReviewContext({ sessionId, onSendMessage }: UseReviewContextOptions) {
  const [reviewFiles, setReviewFiles] = useState<string[]>([]);
  const [comments, setComments] = useState<ReviewComment[]>([]);

  // Add file to review context
  const addToReview = useCallback((filePath: string) => {
    setReviewFiles(prev => {
      if (prev.includes(filePath)) return prev;
      return [...prev, filePath];
    });
  }, []);

  // Remove file from review context
  const removeFromReview = useCallback((filePath: string) => {
    setReviewFiles(prev => prev.filter(f => f !== filePath));
    // Also remove comments for this file
    setComments(prev => prev.filter(c => c.filePath !== filePath));
  }, []);

  // Add a comment
  const addComment = useCallback((
    filePath: string,
    startLine: number,
    endLine: number | undefined,
    content: string
  ) => {
    const comment: ReviewComment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      filePath,
      startLine,
      endLine,
      content,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    setComments(prev => [...prev, comment]);

    // Auto-add file to review context
    addToReview(filePath);

    return comment.id;
  }, [addToReview]);

  // Update a comment
  const updateComment = useCallback((id: string, content: string) => {
    setComments(prev => prev.map(c =>
      c.id === id ? { ...c, content } : c
    ));
  }, []);

  // Remove a comment
  const removeComment = useCallback((id: string) => {
    setComments(prev => prev.filter(c => c.id !== id));
  }, []);

  // Get comments for a specific file
  const getCommentsForFile = useCallback((filePath: string) => {
    return comments.filter(c => c.filePath === filePath);
  }, [comments]);

  // Build the final review message
  const buildReviewMessage = useCallback(() => {
    return buildCommentMessage(comments);
  }, [comments]);

  // Send all comments
  const sendComments = useCallback(() => {
    if (comments.length === 0) return;

    const message = buildReviewMessage();

    // Mark comments as sent
    setComments(prev => prev.map(c => ({ ...c, status: 'sent' as const })));

    // Call the send callback
    onSendMessage?.(message);

    // Clear after sending
    setTimeout(() => {
      setComments([]);
      setReviewFiles([]);
    }, 100);
  }, [comments, buildReviewMessage, onSendMessage]);

  // Clear all review context
  const clearReview = useCallback(() => {
    setComments([]);
    setReviewFiles([]);
  }, []);

  // Proceed without comments
  const proceed = useCallback(() => {
    if (comments.length > 0) {
      sendComments();
    } else {
      clearReview();
    }
  }, [comments.length, sendComments, clearReview]);

  // Stats
  const stats = useMemo(() => ({
    totalComments: comments.length,
    totalFiles: reviewFiles.length,
    pendingComments: comments.filter(c => c.status === 'pending').length,
  }), [comments, reviewFiles]);

  return {
    // State
    reviewFiles,
    comments,
    stats,

    // File operations
    addToReview,
    removeFromReview,

    // Comment operations
    addComment,
    updateComment,
    removeComment,
    getCommentsForFile,

    // Actions
    buildReviewMessage,
    sendComments,
    clearReview,
    proceed,
  };
}

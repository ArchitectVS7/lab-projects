import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Pencil, Trash2, Reply, CornerDownRight } from 'lucide-react';
import { commentsApi } from '../lib/api';
import { useAuthStore } from '../store/auth';
import type { Comment, ProjectMember } from '../types';
import CommentEditor from './CommentEditor';

function renderContent(content: string) {
  // Simple markdown: bold, italic, code, @mentions
  let rendered = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Bold
  rendered = rendered.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic
  rendered = rendered.replace(/_(.+?)_/g, '<em>$1</em>');
  // Inline code
  rendered = rendered.replace(/`(.+?)`/g, '<code class="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">$1</code>');
  // @mentions
  rendered = rendered.replace(
    /@(\w+(?:\.\w+)*)/g,
    '<span class="text-indigo-600 dark:text-indigo-400 font-medium">@$1</span>'
  );

  return rendered;
}

function SingleComment({
  comment,
  taskId,
  members,
  depth,
}: {
  comment: Comment;
  taskId: string;
  members: ProjectMember[];
  depth: number;
}) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const [isEditing, setIsEditing] = useState(false);
  const [isReplying, setIsReplying] = useState(false);

  const isAuthor = currentUser?.id === comment.authorId;

  const updateMutation = useMutation({
    mutationFn: (content: string) => commentsApi.update(comment.id, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
      setIsEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => commentsApi.delete(comment.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
    },
  });

  const replyMutation = useMutation({
    mutationFn: (content: string) => commentsApi.create(taskId, { content, parentId: comment.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
      setIsReplying(false);
    },
  });

  return (
    <div className={depth > 0 ? 'ml-6 border-l-2 border-gray-200 dark:border-gray-700 pl-4' : ''}>
      <div className="group py-3">
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-xs font-medium text-indigo-700 dark:text-indigo-300 flex-shrink-0">
            {comment.author.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {comment.author.name}
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
              </span>
              {comment.editedAt && (
                <span className="text-xs text-gray-400 dark:text-gray-500 italic">(edited)</span>
              )}
            </div>

            {isEditing ? (
              <div className="mt-2">
                <CommentEditor
                  members={members}
                  onSubmit={(content) => updateMutation.mutate(content)}
                  isSubmitting={updateMutation.isPending}
                  initialContent={comment.content}
                  onCancel={() => setIsEditing(false)}
                />
              </div>
            ) : (
              <div
                className="mt-1 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: renderContent(comment.content) }}
              />
            )}

            {/* Action buttons */}
            {!isEditing && (
              <div className="flex items-center gap-2 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {depth === 0 && (
                  <button
                    onClick={() => setIsReplying(!isReplying)}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                  >
                    <Reply size={12} />
                    Reply
                  </button>
                )}
                {isAuthor && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                  >
                    <Pencil size={12} />
                    Edit
                  </button>
                )}
                {isAuthor && (
                  <button
                    onClick={() => {
                      if (window.confirm('Delete this comment?')) {
                        deleteMutation.mutate();
                      }
                    }}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                  >
                    <Trash2 size={12} />
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Reply form */}
        {isReplying && (
          <div className="ml-10 mt-2">
            <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 mb-1">
              <CornerDownRight size={12} />
              Replying to {comment.author.name}
            </div>
            <CommentEditor
              members={members}
              onSubmit={(content) => replyMutation.mutate(content)}
              isSubmitting={replyMutation.isPending}
              placeholder="Write a reply..."
              onCancel={() => setIsReplying(false)}
            />
          </div>
        )}
      </div>

      {/* Render replies */}
      {comment.replies?.map((reply) => (
        <SingleComment
          key={reply.id}
          comment={reply}
          taskId={taskId}
          members={members}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

export default function CommentList({
  taskId,
  members,
}: {
  taskId: string;
  members: ProjectMember[];
}) {
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['comments', taskId],
    queryFn: () => commentsApi.getByTask(taskId),
  });

  const createMutation = useMutation({
    mutationFn: (content: string) => commentsApi.create(taskId, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600 dark:border-indigo-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Comments list */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700/50">
        {comments.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-sm text-gray-400 dark:text-gray-500">No comments yet</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Be the first to comment</p>
          </div>
        ) : (
          comments.map((comment) => (
            <SingleComment
              key={comment.id}
              comment={comment}
              taskId={taskId}
              members={members}
              depth={0}
            />
          ))
        )}
      </div>

      {/* New comment form */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
        <CommentEditor
          members={members}
          onSubmit={(content) => createMutation.mutate(content)}
          isSubmitting={createMutation.isPending}
        />
      </div>
    </div>
  );
}

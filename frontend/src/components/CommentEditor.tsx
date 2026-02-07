import { useState, useRef, useCallback } from 'react';
import { Bold, Italic, Code, Send } from 'lucide-react';
import type { ProjectMember } from '../types';
import MentionAutocomplete from './MentionAutocomplete';

interface CommentEditorProps {
  members: ProjectMember[];
  onSubmit: (content: string) => void;
  isSubmitting: boolean;
  initialContent?: string;
  placeholder?: string;
  onCancel?: () => void;
}

export default function CommentEditor({
  members,
  onSubmit,
  isSubmitting,
  initialContent = '',
  placeholder = 'Write a comment... Use @ to mention someone',
  onCancel,
}: CommentEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (!content.trim() || isSubmitting) return;
    onSubmit(content.trim());
    if (!initialContent) setContent('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setContent(value);

    // Check for @mention trigger
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
    } else {
      setMentionQuery(null);
    }
  };

  const insertMention = useCallback(
    (member: ProjectMember) => {
      if (!textareaRef.current) return;
      const textarea = textareaRef.current;
      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = content.substring(0, cursorPos);
      const textAfterCursor = content.substring(cursorPos);

      // Replace the @query with @name
      const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
      if (mentionMatch) {
        const beforeMention = textBeforeCursor.substring(0, mentionMatch.index);
        const mentionName = member.user.name.replace(/\s+/g, '.');
        const newContent = `${beforeMention}@${mentionName} ${textAfterCursor}`;
        setContent(newContent);
        setMentionQuery(null);

        // Set cursor after the mention
        setTimeout(() => {
          const newPos = (beforeMention + `@${mentionName} `).length;
          textarea.setSelectionRange(newPos, newPos);
          textarea.focus();
        }, 0);
      }
    },
    [content]
  );

  const wrapSelection = (before: string, after: string) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end);
    const newContent = content.substring(0, start) + before + selected + after + content.substring(end);
    setContent(newContent);
    setTimeout(() => {
      textarea.setSelectionRange(start + before.length, end + before.length);
      textarea.focus();
    }, 0);
  };

  return (
    <div className="relative">
      {/* Formatting toolbar */}
      <div className="flex items-center gap-1 mb-1">
        <button
          type="button"
          onClick={() => wrapSelection('**', '**')}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
          title="Bold"
        >
          <Bold size={14} />
        </button>
        <button
          type="button"
          onClick={() => wrapSelection('_', '_')}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
          title="Italic"
        >
          <Italic size={14} />
        </button>
        <button
          type="button"
          onClick={() => wrapSelection('`', '`')}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
          title="Code"
        >
          <Code size={14} />
        </button>
      </div>

      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={3}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
      />

      {/* Mention autocomplete */}
      {mentionQuery !== null && (
        <div className="relative">
          <MentionAutocomplete
            members={members}
            query={mentionQuery}
            position={{ top: 4, left: 0 }}
            onSelect={insertMention}
            onClose={() => setMentionQuery(null)}
          />
        </div>
      )}

      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-gray-400 dark:text-gray-500">
          Ctrl+Enter to submit
        </span>
        <div className="flex gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-white bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 rounded disabled:opacity-50"
          >
            <Send size={12} />
            {isSubmitting ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

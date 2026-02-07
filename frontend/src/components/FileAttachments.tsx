import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attachmentsApi } from '../lib/api';
import type { Attachment } from '../types';
import { Upload, Download, Trash2, FileText, Image, File } from 'lucide-react';

interface FileAttachmentsProps {
  taskId: string;
  canEdit: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith('image/')) return <Image size={16} className="text-blue-500" />;
  if (mimeType === 'application/pdf') return <FileText size={16} className="text-red-500" />;
  return <File size={16} className="text-gray-500" />;
}

export default function FileAttachments({ taskId, canEdit }: FileAttachmentsProps) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: attachments = [] } = useQuery({
    queryKey: ['attachments', taskId],
    queryFn: () => attachmentsApi.getByTask(taskId),
    enabled: !!taskId,
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => attachmentsApi.upload(taskId, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attachments', taskId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => attachmentsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attachments', taskId] }),
  });

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => uploadMutation.mutate(file));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-4 p-4 rounded-lg border-2" style={{ borderColor: 'var(--primary-base)', backgroundColor: 'color-mix(in srgb, var(--primary-base) 5%, transparent)' }}>
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
        <span>📎</span> Attachments {attachments.length > 0 && <span className="ml-auto bg-[var(--primary-base)] text-white text-xs px-2 py-0.5 rounded-full">{attachments.length}</span>}
      </h4>

      {canEdit && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer transition-all"
          style={{
            borderColor: dragOver ? 'var(--primary-base)' : '#d1d5db',
            backgroundColor: dragOver ? 'color-mix(in srgb, var(--primary-base) 10%, transparent)' : 'transparent'
          }}
        >
          <Upload size={16} style={{ color: dragOver ? 'var(--primary-base)' : '#9ca3af' }} />
          <span className="text-sm" style={{ color: dragOver ? 'var(--primary-base)' : '#6b7280' }}>
            {uploadMutation.isPending ? '⏳ Uploading...' : '📤 Drop files here or click to upload'}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
            multiple
          />
        </div>
      )}

      {attachments.length > 0 && (
        <div className="space-y-2 bg-white/50 dark:bg-gray-700/30 p-3 rounded-lg">
          {attachments.map((att: Attachment) => (
            <div key={att.id} className="flex items-center gap-3 p-2 rounded hover:bg-white/50 dark:hover:bg-gray-700/50 transition-colors">
              <FileIcon mimeType={att.mimeType} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{att.originalName}</p>
                <p className="text-xs text-gray-500">{formatFileSize(att.size)}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => attachmentsApi.download(att.id)}
                  className="p-1.5 text-gray-400 hover:text-[var(--primary-base)] hover:bg-white/50 dark:hover:bg-gray-700/50 rounded transition-colors"
                  title="Download"
                >
                  <Download size={16} />
                </button>
                {canEdit && (
                  <button
                    onClick={() => deleteMutation.mutate(att.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

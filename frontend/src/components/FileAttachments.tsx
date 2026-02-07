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
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Attachments {attachments.length > 0 && `(${attachments.length})`}
      </h4>

      {canEdit && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors
            ${dragOver
              ? 'border-primary bg-primary/5'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
            }`}
        >
          <Upload size={16} className="text-gray-400" />
          <span className="text-sm text-gray-500">
            {uploadMutation.isPending ? 'Uploading...' : 'Drop files here or click to upload'}
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
        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
          {attachments.map((att: Attachment) => (
            <li key={att.id} className="flex items-center gap-3 py-2">
              <FileIcon mimeType={att.mimeType} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{att.originalName}</p>
                <p className="text-xs text-gray-400">{formatFileSize(att.size)}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => attachmentsApi.download(att.id)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  title="Download"
                >
                  <Download size={14} />
                </button>
                {canEdit && (
                  <button
                    onClick={() => deleteMutation.mutate(att.id)}
                    className="p-1 text-gray-400 hover:text-red-500"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import { X } from 'lucide-react';
import clsx from 'clsx';
import { create } from 'zustand';

interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error';
}

interface ToastState {
    toasts: Toast[];
    addToast: (message: string, type: 'success' | 'error') => void;
    removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
    toasts: [],
    addToast: (message, type) => {
        const id = crypto.randomUUID();
        set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
        setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4000);
    },
    removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export default function ToastContainer() {
    const { toasts, removeToast } = useToastStore();
    return (
        <div className="fixed bottom-4 right-4 z-50 space-y-2">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={clsx(
                        'flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm text-white transition-all',
                        toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
                    )}
                >
                    <span>{toast.message}</span>
                    <button onClick={() => removeToast(toast.id)} className="hover:opacity-80">
                        <X size={14} />
                    </button>
                </div>
            ))}
        </div>
    );
}

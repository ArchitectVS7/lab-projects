import { X } from 'lucide-react';
import clsx from 'clsx';
import { useToastStore } from '../store/toast';

export default function ToastContainer() {
    const { toasts, removeToast } = useToastStore();
    return (
        <div className="fixed bottom-4 right-4 z-50 space-y-2">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={clsx(
                        'flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm text-white transition-all',
                        toast.type === 'success' ? 'bg-green-600 dark:bg-green-700' : 'bg-red-600 dark:bg-red-700'
                    )}
                >
                    <span>{toast.message}</span>
                    <button onClick={() => removeToast(toast.id)} className="hover:opacity-80 transition-opacity">
                        <X size={14} />
                    </button>
                </div>
            ))}
        </div>
    );
}

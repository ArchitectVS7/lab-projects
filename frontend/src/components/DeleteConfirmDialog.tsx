import { motion } from 'framer-motion';
import { modalOverlay, modalContent } from '../lib/animations';

export function DeleteConfirmDialog({
  taskTitle,
  onClose,
  onConfirm,
  isDeleting,
}: {
  taskTitle: string;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  return (
    <motion.div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
      {...modalOverlay}
    >
      <motion.div
        className="glass-card dark:glass-card-dark rounded-lg shadow-xl w-full max-w-sm mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
        {...modalContent}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Delete Task</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Are you sure you want to delete <span className="font-medium">"{taskTitle}"</span>?
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">Cancel</button>
          <button onClick={onConfirm} disabled={isDeleting}
            className="px-4 py-2 text-sm text-white bg-red-600 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-800 rounded-md disabled:opacity-50">
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

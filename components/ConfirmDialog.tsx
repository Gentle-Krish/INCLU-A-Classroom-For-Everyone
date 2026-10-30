import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from '../utils/translations';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'danger' | 'primary';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen, title, message,
  onConfirm, onCancel,
  confirmLabel,
  cancelLabel,
  confirmVariant = 'danger',
}) => {
  const { t } = useTranslation();
  const resolvedConfirm = confirmLabel || t('confirm', 'Confirm');
  const resolvedCancel = cancelLabel || t('cancel', 'Cancel');

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-slate-900/25 backdrop-blur-sm z-[150]"
            onClick={onCancel}
          />
          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 10 }}
            transition={{ type: 'spring', stiffness: 450, damping: 30 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[151] bg-[#FFF6EE] rounded-3xl p-6 shadow-2xl shadow-[#3F2A1D]/10 w-[340px] max-w-[calc(100vw-2rem)] border border-[#E7DDD2]"
          >
            <div className="flex items-start gap-4 mb-6">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                confirmVariant === 'danger' ? 'bg-rose-50' : 'bg-[#F4B183]/40'
              }`}>
                <AlertTriangle size={20} className={confirmVariant === 'danger' ? 'text-rose-500' : 'text-[#6B4423]'} />
              </div>
              <div>
                <h3 className="font-black text-[#3F2A1D] text-[16px] leading-tight mb-1.5">{title}</h3>
                <p className="text-[13.5px] text-[#A08B7A] font-medium leading-relaxed">{message}</p>
              </div>
            </div>
            <div className="flex gap-2.5 justify-end">
              <button
                onClick={onCancel}
                className="px-5 py-2.5 rounded-xl text-[13.5px] font-bold text-[#6B4423] bg-[#F6F0E8] hover:bg-[#E7DDD2] transition-colors active:scale-95"
              >
                {resolvedCancel}
              </button>
              <button
                onClick={onConfirm}
                className={`px-5 py-2.5 rounded-xl text-[13.5px] font-bold text-white transition-all active:scale-95 shadow-md ${
                  confirmVariant === 'danger'
                    ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-200'
                    : 'bg-[#6B4423] hover:bg-[#3F2A1D] shadow-[#6B4423]/25'
                }`}
              >
                {resolvedConfirm}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

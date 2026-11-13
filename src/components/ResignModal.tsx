import React from 'react';
import { Flag } from 'lucide-react';
import { triggerHaptic } from '../utils/telegram';

interface ResignModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ResignModal: React.FC<ResignModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="clay-card w-full max-w-sm p-6 text-center border border-rose-500/30 shadow-2xl">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
          <Flag className="w-7 h-7" />
        </div>

        <h3 className="text-xl font-bold text-white">Resign Match?</h3>
        <p className="text-xs text-slate-300 mt-2 mb-6 leading-relaxed">
          Surrendering will immediately grant victory to your opponent. Are you sure you wish to resign?
        </p>

        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="clay-button flex-1 py-2.5 text-xs text-slate-300 hover:text-white cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              triggerHaptic('heavy');
              onConfirm();
            }}
            className="clay-button-danger flex-1 py-2.5 text-xs font-bold rounded-xl cursor-pointer"
          >
            Confirm Resign
          </button>
        </div>
      </div>
    </div>
  );
};

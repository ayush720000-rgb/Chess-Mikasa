import React, { useEffect } from 'react';
import { Handshake } from 'lucide-react';
import { playDrawOfferSound } from '../utils/sound';
import { triggerHaptic } from '../utils/telegram';

interface DrawOfferModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
  offeredByName: string;
}

export const DrawOfferModal: React.FC<DrawOfferModalProps> = ({
  isOpen,
  onAccept,
  onDecline,
  offeredByName,
}) => {
  useEffect(() => {
    if (isOpen) {
      playDrawOfferSound();
      triggerHaptic('medium');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="clay-card w-full max-w-sm p-6 text-center border border-amber-500/40 shadow-2xl">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 animate-bounce">
          <Handshake className="w-7 h-7" />
        </div>

        <h3 className="text-xl font-bold text-white">Draw Offered</h3>
        <p className="text-xs text-slate-300 mt-2 mb-6 leading-relaxed">
          <span className="font-bold text-[#d4a373]">{offeredByName}</span> is proposing to end the game in a peaceful draw. Do you accept?
        </p>

        <div className="flex items-center gap-3">
          <button
            onClick={onDecline}
            className="clay-button flex-1 py-2.5 text-xs text-slate-300 hover:text-white cursor-pointer"
          >
            Decline
          </button>
          <button
            onClick={onAccept}
            className="clay-button-primary flex-1 py-2.5 text-xs font-bold rounded-xl cursor-pointer"
          >
            Accept Draw
          </button>
        </div>
      </div>
    </div>
  );
};

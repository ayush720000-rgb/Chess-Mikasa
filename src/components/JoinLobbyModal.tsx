import React, { useState } from 'react';
import { X, KeyRound, ArrowRight, Eye } from 'lucide-react';
import { triggerHaptic } from '../utils/telegram';

interface JoinLobbyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: (code: string, asSpectator?: boolean) => void;
  initialCode?: string;
}

export const JoinLobbyModal: React.FC<JoinLobbyModalProps> = ({
  isOpen,
  onClose,
  onJoin,
  initialCode = '',
}) => {
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  React.useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleJoin = (asSpectator: boolean = false) => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setError('Please enter a valid lobby code');
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);
    triggerHaptic('light');
    setError(null);
    onJoin(trimmed, asSpectator);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="clay-card w-full max-w-md p-6 sm:p-7 relative border border-[#e5b869]/35 bg-[#0d0d0d] shadow-[0_20px_60px_rgba(0,0,0,0.95)]">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-5">
          <span className="text-xs uppercase tracking-wider text-[#ffd88c] font-semibold">
            Direct Access
          </span>
          <h2 className="text-2xl font-bold font-serif text-white mt-0.5">Join Match Room</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Enter the 6-character room code shared by your opponent.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
              Room Code
            </label>
            <div className="relative">
              <input
                type="text"
                maxLength={8}
                placeholder="e.g. C7K9W2"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setError(null);
                }}
                className="w-full bg-[#141414] border-2 border-zinc-800 focus:border-[#e5b869] rounded-xl px-4 py-3 text-lg font-mono tracking-widest text-white text-center focus:outline-none uppercase placeholder:text-zinc-600 transition-colors"
                autoFocus
              />
              <KeyRound className="w-5 h-5 text-[#ffd88c] absolute left-3.5 top-3.5 pointer-events-none" />
            </div>
            {error && (
              <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1">
                {error}
              </p>
            )}
          </div>

          {/* Luxury Loading Progress Bar when Submitting */}
          {isSubmitting && (
            <div className="space-y-1.5 pt-2">
              <div className="w-full h-2 rounded-full luxury-gold-progress-track overflow-hidden p-0.5">
                <div className="h-full rounded-full luxury-gold-progress-fill animate-indeterminate-beam shadow-[0_0_10px_#ffd88c]" />
              </div>
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#ffd88c] font-medium font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ffd88c] animate-ping" />
                <span>Connecting to room server...</span>
              </div>
            </div>
          )}

          <div className="pt-2 flex flex-col gap-2.5">
            <button
              onClick={() => handleJoin(false)}
              disabled={isSubmitting}
              className="clay-button-primary w-full py-3 text-xs rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md hover:brightness-110 transition-all disabled:opacity-80"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-black border-t-transparent animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <span>Join as Player</span>
                  <ArrowRight className="w-4 h-4 stroke-[3]" />
                </>
              )}
            </button>

            <button
              onClick={() => handleJoin(true)}
              disabled={isSubmitting}
              className="clay-button w-full py-2.5 text-xs rounded-xl text-zinc-300 flex items-center justify-center gap-2 cursor-pointer hover:text-white disabled:opacity-40"
            >
              <Eye className="w-4 h-4 text-[#ffd88c]" />
              <span>Join as Spectator</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

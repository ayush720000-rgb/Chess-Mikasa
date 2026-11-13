import React, { useEffect, useState } from 'react';
import { Bot, Swords, KeyRound, Sparkles, X } from 'lucide-react';

export interface LuxuryLoadingProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  type?: 'bot' | 'room' | 'join' | 'rematch';
  onCancel?: () => void;
}

const BOT_STEPS = [
  'Initializing Staunton Atelier board...',
  'Awakening Stockfish 2,850+ engine...',
  'Carving weighted pieces & clocks...',
  'Seating opponent at royal table...',
];

const ROOM_STEPS = [
  'Establishing secure match socket...',
  'Generating 6-digit royal room code...',
  'Calibrating tournament rules & timer...',
  'Opening grandmaster waiting room...',
];

const JOIN_STEPS = [
  'Connecting to room server...',
  'Verifying match credentials...',
  'Synchronizing board state & timers...',
  'Entering match salon...',
];

const REMATCH_STEPS = [
  'Agreeing to fresh rematch...',
  'Resetting clocks & board pieces...',
  'Switching royal colors...',
  'Commencing new duel...',
];

export const LuxuryLoadingOverlay: React.FC<LuxuryLoadingProps> = ({
  isOpen,
  title,
  subtitle,
  type = 'bot',
  onCancel,
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [showCancel, setShowCancel] = useState(false);

  const steps =
    type === 'bot'
      ? BOT_STEPS
      : type === 'join'
      ? JOIN_STEPS
      : type === 'rematch'
      ? REMATCH_STEPS
      : ROOM_STEPS;

  useEffect(() => {
    if (!isOpen) {
      setStepIndex(0);
      setShowCancel(false);
      return;
    }

    // Cycle through micro-steps to give a lively, responsive feel
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % steps.length);
    }, 700);

    // After 7 seconds, provide an escape cancel button if network hung
    const cancelTimer = setTimeout(() => {
      setShowCancel(true);
    }, 7000);

    return () => {
      clearInterval(interval);
      clearTimeout(cancelTimer);
    };
  }, [isOpen, steps.length]);

  if (!isOpen) return null;

  const renderIcon = () => {
    switch (type) {
      case 'bot':
        return (
          <div className="relative">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#ffd88c] via-[#e5b869] to-[#8f651c] flex items-center justify-center text-black shadow-[0_0_30px_rgba(255,216,140,0.6)] animate-pulse border border-white/50">
              <Bot className="w-9 h-9 sm:w-11 sm:h-11 stroke-[2.2] animate-bounce" />
            </div>
            <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-black border border-[#ffd88c] text-[#ffd88c] text-xs flex items-center justify-center font-bold font-serif shadow-md">
              ♚
            </span>
          </div>
        );
      case 'join':
        return (
          <div className="relative">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#2a2a2a] via-[#1a1a1a] to-[#0d0d0d] border-2 border-[#ffd88c] flex items-center justify-center text-[#ffd88c] shadow-[0_0_25px_rgba(229,184,105,0.4)]">
              <KeyRound className="w-8 h-8 sm:w-10 sm:h-10 animate-pulse stroke-[2.2]" />
            </div>
          </div>
        );
      case 'rematch':
        return (
          <div className="relative">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#ffd88c] via-[#e5b869] to-[#c89547] flex items-center justify-center text-black shadow-[0_0_30px_rgba(255,216,140,0.6)] animate-pulse border border-white/50">
              <Swords className="w-9 h-9 sm:w-11 sm:h-11 stroke-[2.2]" />
            </div>
          </div>
        );
      default:
        return (
          <div className="relative">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#ffd88c] via-[#e5b869] to-[#8f651c] flex items-center justify-center text-black shadow-[0_0_30px_rgba(255,216,140,0.6)] border border-white/50">
              <span className="text-3xl sm:text-4xl select-none animate-pulse">♚</span>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      {/* Top 3px Gleaming Golden Laser Progress Line */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-black z-[130] overflow-hidden">
        <div className="h-full luxury-gold-progress-fill animate-indeterminate-beam" />
      </div>

      {/* Main Luxury Modal Card */}
      <div className="clay-card w-full max-w-md p-6 sm:p-8 text-center relative border-2 border-[#e5b869]/60 bg-gradient-to-b from-[#141414] via-[#0c0c0c] to-[#050505] shadow-[0_25px_70px_rgba(0,0,0,0.98)] overflow-hidden">
        {/* Brass Corner Brackets & Rivets */}
        <div className="absolute top-2.5 left-2.5 w-3.5 h-3.5 border-t-2 border-l-2 border-[#ffd88c]/80 pointer-events-none rounded-tl-sm flex items-start justify-start p-0.5">
          <div className="brass-rivet" />
        </div>
        <div className="absolute top-2.5 right-2.5 w-3.5 h-3.5 border-t-2 border-r-2 border-[#ffd88c]/80 pointer-events-none rounded-tr-sm flex items-start justify-end p-0.5">
          <div className="brass-rivet" />
        </div>
        <div className="absolute bottom-2.5 left-2.5 w-3.5 h-3.5 border-b-2 border-l-2 border-[#ffd88c]/80 pointer-events-none rounded-bl-sm flex items-end justify-start p-0.5">
          <div className="brass-rivet" />
        </div>
        <div className="absolute bottom-2.5 right-2.5 w-3.5 h-3.5 border-b-2 border-r-2 border-[#ffd88c]/80 pointer-events-none rounded-br-sm flex items-end justify-end p-0.5">
          <div className="brass-rivet" />
        </div>

        {/* Ambient Gold Halo */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#ffd88c]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Center Animated Icon */}
        <div className="flex justify-center mb-5 relative z-10">{renderIcon()}</div>

        {/* Titles */}
        <div className="relative z-10 mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1c1c1c] border border-[#e5b869]/50 text-[#ffd88c] text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest shadow-sm mb-2">
            <Sparkles className="w-3 h-3 text-[#ffd88c] animate-spin" />
            <span>Grandmaster Match Engine</span>
          </div>

          <h3 className="text-lg sm:text-xl font-black font-serif tracking-wide text-white drop-shadow-md uppercase">
            {title}
          </h3>

          {subtitle && (
            <p className="text-xs text-zinc-300 mt-1 max-w-xs mx-auto leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        {/* High-End Polished Gold Progress Bar */}
        <div className="relative z-10 my-5 px-2">
          <div className="w-full h-2.5 sm:h-3 rounded-full luxury-gold-progress-track overflow-hidden p-0.5">
            <div className="h-full rounded-full luxury-gold-progress-fill animate-indeterminate-beam shadow-[0_0_12px_#ffd88c]" />
          </div>

          {/* Dynamic Lively Micro-Step Text */}
          <div className="flex items-center justify-center gap-2 mt-2.5 min-h-[22px]">
            <span className="w-2 h-2 rounded-full bg-[#ffd88c] animate-ping shrink-0" />
            <span className="text-xs text-[#ffd88c] font-medium tracking-wide transition-all duration-300">
              {steps[stepIndex]}
            </span>
          </div>
        </div>

        {/* Cancel Button if delayed */}
        {showCancel && onCancel && (
          <div className="pt-2 relative z-10 animate-fadeIn">
            <button
              type="button"
              onClick={onCancel}
              className="clay-button px-4 py-2 text-xs text-zinc-400 hover:text-white flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel & Return</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

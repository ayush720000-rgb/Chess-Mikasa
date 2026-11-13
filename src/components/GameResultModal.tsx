import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, Home, Eye, X, Crown, ShieldAlert, Award } from 'lucide-react';
import { RoomState, UserProfile } from '../types/chess';
import { triggerHaptic } from '../utils/telegram';
import { playVictorySound, playDefeatSound } from '../utils/sound';

interface GameResultModalProps {
  isOpen: boolean;
  room: RoomState;
  currentUser: UserProfile;
  onRematch: () => void;
  onReturnToLobby: () => void;
  onDismiss: () => void;
}

export const GameResultModal: React.FC<GameResultModalProps> = ({
  isOpen,
  room,
  currentUser,
  onRematch,
  onReturnToLobby,
  onDismiss,
}) => {
  const isWinner = room.winnerUserId === currentUser.id;
  const isDraw = !room.winnerUserId || room.resolution?.startsWith('draw');
  const isDefeat = !isWinner && !isDraw;

  useEffect(() => {
    if (!isOpen) return;

    triggerHaptic(isWinner ? 'heavy' : 'medium');

    if (isWinner) {
      playVictorySound();
      try {
        // High-end dual confetti cannon with gold & champagne particles
        const count = 120;
        const defaults = {
          origin: { y: 0.65 },
          colors: ['#ffd88c', '#e5b869', '#ffffff', '#c89547', '#f5deb3'],
          zIndex: 9999,
        };

        confetti({
          ...defaults,
          particleCount: Math.floor(count * 0.6),
          spread: 80,
          origin: { x: 0.2, y: 0.65 },
        });

        confetti({
          ...defaults,
          particleCount: Math.floor(count * 0.6),
          spread: 80,
          origin: { x: 0.8, y: 0.65 },
        });
      } catch {
        // Ignore fallback
      }
    } else if (isDefeat) {
      playDefeatSound();
    }
  }, [isOpen, isWinner, isDefeat]);

  if (!isOpen) return null;

  const getResolutionTitle = (): string => {
    if (isDraw) return 'HONORABLE DRAW';
    if (isWinner) return 'VICTORY';
    return 'DEFEAT';
  };

  const getResolutionSubtitle = (): string => {
    switch (room.resolution) {
      case 'checkmate':
        return isWinner
          ? 'Checkmate! You outmaneuvered your opponent.'
          : 'Checkmate. Your King has fallen on the board.';
      case 'draw_agreement':
        return 'Both players mutually agreed to a peaceful draw.';
      case 'draw_stalemate':
        return 'Draw by stalemate (no legal moves left).';
      case 'draw_insufficient_material':
        return 'Draw by insufficient material to force checkmate.';
      case 'draw_threefold_repetition':
        return 'Draw by threefold repetition.';
      case 'resignation':
        return isWinner ? 'Opponent resigned the match.' : 'You resigned from the arena.';
      case 'timeout':
        return isWinner ? 'Opponent ran out of time on clock.' : 'Flag fell! Time expired on the clock.';
      default:
        return 'The match has concluded.';
    }
  };

  const winnerPlayer =
    room.winnerColor === 'w'
      ? room.whitePlayer
      : room.winnerColor === 'b'
      ? room.blackPlayer
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div className="clay-card w-full max-w-md p-6 sm:p-7 text-center border-2 border-[#e5b869]/60 shadow-[0_20px_60px_rgba(0,0,0,0.95)] relative overflow-hidden bg-gradient-to-b from-[#181818] via-[#0f0f0f] to-[#070707]">
        {/* Checkered Inlay Trim along top */}
        <div className="absolute top-0 left-0 right-0 h-1.5 chess-checkered-border opacity-70" />

        {/* Brass Corner Accents */}
        <div className="absolute top-2 left-2 w-3.5 h-3.5 border-t-2 border-l-2 border-[#ffd88c]/70 pointer-events-none rounded-tl-sm flex items-start justify-start p-0.5">
          <div className="brass-rivet" />
        </div>
        <div className="absolute top-2 right-2 w-3.5 h-3.5 border-t-2 border-r-2 border-[#ffd88c]/70 pointer-events-none rounded-tr-sm flex items-start justify-end p-0.5">
          <div className="brass-rivet" />
        </div>

        {/* Dismiss / Close "X" Button (Allows inspecting board, chat, notations) */}
        <button
          onClick={() => {
            triggerHaptic('light');
            onDismiss();
          }}
          title="Review Board & Chat"
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-zinc-300 hover:text-white flex items-center justify-center cursor-pointer transition-all z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Dynamic Centerpiece Animation */}
        <div className="my-2 sm:my-3">
          {isWinner && (
            <div className="relative w-24 h-24 mx-auto mb-4 flex items-center justify-center">
              {/* Golden Sunburst Glow */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#ffd88c]/30 to-[#e5b869]/20 blur-xl animate-pulse" />
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#ffd88c] via-[#e5b869] to-[#b37e29] p-0.5 shadow-[0_0_35px_rgba(229,184,105,0.7)] animate-victory-radiance flex items-center justify-center border border-white/60">
                <div className="w-full h-full rounded-2xl bg-gradient-to-br from-[#1c1c1c] to-[#0a0a0a] flex items-center justify-center">
                  <Trophy className="w-10 h-10 text-[#ffd88c] drop-shadow-[0_2px_10px_rgba(255,216,140,0.8)]" />
                </div>
              </div>
              <div className="absolute -top-1 -right-1">
                <Crown className="w-6 h-6 text-[#ffd88c] drop-shadow-md animate-bounce" />
              </div>
            </div>
          )}

          {isDefeat && (
            <div className="relative w-24 h-24 mx-auto mb-4 flex items-center justify-center">
              {/* Crimson aura pulse */}
              <div className="absolute inset-0 rounded-full bg-rose-950/40 blur-xl" />
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#2a1717] to-[#120a0a] border border-rose-500/50 shadow-[0_0_25px_rgba(225,29,72,0.35)] flex items-center justify-center relative overflow-hidden">
                {/* Carved wooden floor base */}
                <div className="absolute bottom-0 inset-x-0 h-4 bg-[#2b180d] border-t border-[#e5b869]/30" />
                {/* Toppling King piece */}
                <div className="text-4xl text-rose-300 select-none animate-defeat-topple transform drop-shadow-md pb-2">
                  ♚
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 bg-black/80 px-1.5 py-0.5 rounded-full border border-rose-500/50 flex items-center gap-1 text-[9px] text-rose-300 font-mono">
                <ShieldAlert className="w-3 h-3 text-rose-400" />
                <span>Resigned</span>
              </div>
            </div>
          )}

          {isDraw && (
            <div className="relative w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <div className="w-18 h-18 rounded-2xl bg-gradient-to-br from-[#222222] to-[#111111] border border-[#e5b869]/50 shadow-lg flex items-center justify-center text-3xl text-[#ffd88c]">
                ⚖️
              </div>
            </div>
          )}

          {/* Title & Subtitle */}
          <h2
            className={`text-2xl sm:text-3xl font-serif font-black tracking-wider ${
              isWinner
                ? 'text-gold-gradient drop-shadow-[0_2px_12px_rgba(255,216,140,0.6)]'
                : isDraw
                ? 'text-zinc-200'
                : 'text-rose-300 drop-shadow-[0_2px_10px_rgba(244,63,94,0.4)]'
            }`}
          >
            {getResolutionTitle()}
          </h2>
          <p className="text-xs sm:text-[13px] text-zinc-300 mt-1.5 max-w-xs mx-auto leading-relaxed">
            {getResolutionSubtitle()}
          </p>
        </div>

        {/* Winner presentation card */}
        {winnerPlayer && !isDraw && (
          <div className="p-3 rounded-xl bg-gradient-to-r from-[#1c1c1c] to-[#121212] border border-[#e5b869]/40 flex items-center justify-center gap-3 my-4 shadow-inner">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-zinc-900 border-2 border-[#ffd88c] shrink-0 shadow-md">
              {winnerPlayer.user.avatarUrl ? (
                <img
                  src={winnerPlayer.user.avatarUrl}
                  alt={winnerPlayer.user.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="w-full h-full flex items-center justify-center text-lg text-[#ffd88c]">♚</span>
              )}
            </div>
            <div className="text-left min-w-0">
              <div className="flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-[#ffd88c]" />
                <span className="text-[10px] uppercase font-extrabold tracking-widest text-[#ffd88c] block">
                  Champion
                </span>
              </div>
              <span className="text-sm font-bold text-white block truncate font-serif">
                {winnerPlayer.user.name}
              </span>
            </div>
          </div>
        )}

        {/* Review Final Board & Chat Button (Never locked out) */}
        <div className="my-4">
          <button
            onClick={() => {
              triggerHaptic('light');
              onDismiss();
            }}
            className="w-full py-2.5 px-3 rounded-xl bg-[#141414] hover:bg-[#1f1f1f] border border-[#e5b869]/40 text-xs font-semibold text-[#ffd88c] hover:text-white flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm group"
          >
            <Eye className="w-4 h-4 text-[#ffd88c] group-hover:scale-110 transition-transform" />
            <span>Review Final Board, Notations & Chat</span>
          </button>
        </div>

        {/* Action Buttons: Rematch & Return to Lobby */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <button
            onClick={() => {
              triggerHaptic('light');
              onReturnToLobby();
            }}
            className="clay-button w-full sm:flex-1 py-2.5 sm:py-3 text-xs flex items-center justify-center gap-2 cursor-pointer text-zinc-300 hover:text-white"
          >
            <Home className="w-4 h-4 text-zinc-400" />
            <span>Lobby</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic('medium');
              onRematch();
            }}
            className="clay-button-primary w-full sm:flex-1 py-2.5 sm:py-3 text-xs rounded-xl font-extrabold flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <RotateCcw className="w-4 h-4 text-black stroke-[2.5]" />
            <span>Play Rematch</span>
          </button>
        </div>
      </div>
    </div>
  );
};

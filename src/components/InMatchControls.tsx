import React from 'react';
import { Flag, Handshake, MessageSquare, RotateCcw } from 'lucide-react';
import { triggerHaptic } from '../utils/telegram';

interface InMatchControlsProps {
  isPlayer: boolean;
  onOpenResign: () => void;
  onOfferDraw: () => void;
  onToggleChat: () => void;
  onShowPreviousMove: () => void;
  lastMove?: { from: string; to: string; san?: string };
  isDrawPending: boolean;
  unreadChatCount: number;
  gameFinished: boolean;
}

export const InMatchControls: React.FC<InMatchControlsProps> = ({
  isPlayer,
  onOpenResign,
  onOfferDraw,
  onToggleChat,
  onShowPreviousMove,
  lastMove,
  isDrawPending,
  unreadChatCount,
  gameFinished,
}) => {
  return (
    <div className="flex items-center justify-between gap-1.5 sm:gap-2 px-1 py-1 max-w-lg mx-auto w-full">
      {/* Option 1: Resign (Player only) */}
      {isPlayer && !gameFinished ? (
        <button
          onClick={() => {
            triggerHaptic('medium');
            onOpenResign();
          }}
          title="Resign the match"
          className="clay-button px-2 sm:px-3.5 py-1.5 sm:py-2 flex items-center gap-1 text-[11px] sm:text-xs text-rose-300 hover:text-rose-200 hover:border-rose-500/40 cursor-pointer shrink-0"
        >
          <Flag className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span className="font-semibold hidden min-[360px]:inline">Resign</span>
        </button>
      ) : (
        <div />
      )}

      {/* Option 2: Draw (Player only) */}
      {isPlayer && !gameFinished ? (
        <button
          onClick={() => {
            triggerHaptic('light');
            onOfferDraw();
          }}
          disabled={isDrawPending}
          title={isDrawPending ? 'Draw offer sent...' : 'Offer a draw to your opponent'}
          className={`clay-button px-2 sm:px-3.5 py-1.5 sm:py-2 flex items-center gap-1 text-[11px] sm:text-xs cursor-pointer shrink-0 ${
            isDrawPending
              ? 'opacity-60 text-slate-400 cursor-not-allowed'
              : 'text-[#e5b869] hover:text-[#fff5e0] hover:border-[#e5b869]/50'
          }`}
        >
          <Handshake className="w-3.5 h-3.5 text-[#e5b869] shrink-0" />
          <span className="font-semibold hidden min-[360px]:inline">
            {isDrawPending ? 'Draw...' : 'Draw'}
          </span>
        </button>
      ) : (
        <div />
      )}

      {/* Option 3: Small Previous Move Button (Requirement 2) */}
      <button
        onClick={() => {
          triggerHaptic('light');
          onShowPreviousMove();
        }}
        title="Check the previous move played in this match"
        className="clay-button px-2.5 sm:px-3.5 py-1.5 sm:py-2 flex items-center gap-1.5 text-[11px] sm:text-xs text-[#e5b869] hover:text-[#fff5e0] hover:border-[#e5b869]/50 cursor-pointer shrink-0 transition-colors"
      >
        <RotateCcw className="w-3.5 h-3.5 text-[#e5b869] shrink-0" />
        <span className="font-semibold truncate">
          {lastMove?.san ? `Prev: ${lastMove.san}` : 'Prev Move'}
        </span>
      </button>

      {/* Option 4: Chat (Available to both players and spectators!) */}
      <button
        onClick={() => {
          triggerHaptic('light');
          onToggleChat();
        }}
        title="Open Match Chat"
        className="clay-button-primary px-2.5 sm:px-4 py-1.5 sm:py-2 flex items-center gap-1 text-[11px] sm:text-xs font-bold cursor-pointer relative shrink-0"
      >
        <MessageSquare className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden min-[360px]:inline">Chat</span>

        {unreadChatCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 sm:w-5 sm:h-5 bg-rose-600 text-white rounded-full text-[9px] sm:text-[10px] font-black flex items-center justify-center border-2 border-[#060c08] animate-bounce">
            {unreadChatCount > 9 ? '9+' : unreadChatCount}
          </span>
        )}
      </button>
    </div>
  );
};

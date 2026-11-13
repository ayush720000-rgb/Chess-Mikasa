import React, { useEffect, useState, useRef } from 'react';
import { Clock, Bot } from 'lucide-react';
import { PlayerState, Color } from '../types/chess';
import { generateInitialAvatar } from '../utils/telegram';

interface PlayerBarProps {
  player?: PlayerState;
  color: Color;
  isTurn: boolean;
  capturedPieces: string[];
  materialDifference: number;
  timerGoing: boolean;
  compact?: boolean;
  isTyping?: boolean;
  isAway?: boolean;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({
  player,
  color,
  isTurn,
  capturedPieces,
  materialDifference,
  timerGoing,
  compact = false,
  isTyping = false,
  isAway = false,
}) => {
  const [displayTime, setDisplayTime] = useState<number>(player?.timeLeftMs || 0);
  const baseTimeRef = useRef<number>(player?.timeLeftMs || 0);

  useEffect(() => {
    const ms = player?.timeLeftMs || 0;
    baseTimeRef.current = ms;
    setDisplayTime(ms);
  }, [player?.timeLeftMs]);

  useEffect(() => {
    if (!timerGoing || !isTurn) return;

    const startTimestamp = Date.now();
    const startMs = baseTimeRef.current;
    // When time is above 20 seconds, whole seconds are shown, so 250ms tick saves 75% CPU re-renders.
    // Under 20 seconds, 100ms interval provides tenths of second accuracy.
    const intervalMs = startMs <= 20000 ? 100 : 250;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTimestamp;
      const remaining = Math.max(0, startMs - elapsed);
      setDisplayTime(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [timerGoing, isTurn, player?.timeLeftMs]);

  const formatTime = (ms: number): string => {
    const totalSec = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSec / 60);
    const seconds = totalSec % 60;
    const paddedSec = seconds < 10 ? `0${seconds}` : `${seconds}`;

    if (minutes === 0 && totalSec < 20) {
      const tenths = Math.floor((ms % 1000) / 100);
      return `${minutes}:${paddedSec}.${tenths}`;
    }
    return `${minutes}:${paddedSec}`;
  };

  const isLowTime = displayTime > 0 && displayTime < 30000;
  const isWhite = color === 'w';

  const pieceSymbols: Record<string, string> = {
    p: isWhite ? '♟' : '♙',
    n: isWhite ? '♞' : '♘',
    b: isWhite ? '♝' : '♗',
    r: isWhite ? '♜' : '♖',
    q: isWhite ? '♛' : '♕',
  };

  return (
    <div
      className={`flex items-center justify-between gap-2 transition-all ${
        compact ? 'px-2 py-1 rounded-xl' : 'px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-2xl'
      } ${
        isTurn
          ? 'bg-gradient-to-r from-[#222222] via-[#181818] to-[#101010] border-2 border-[#e5b869] shadow-[0_4px_22px_rgba(229,184,105,0.35)] ring-1 ring-[#e5b869]/40'
          : 'bg-[#121212]/95 border border-[#e5b869]/25 shadow-md backdrop-blur-md'
      }`}
    >
      {/* Left: Avatar, Name, Telegram handle, Color badge */}
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
        <div className="relative">
          <div
            className={`${
              compact ? 'w-7 h-7' : 'w-8 h-8 sm:w-10 sm:h-10'
            } rounded-xl overflow-hidden bg-[#181818] flex items-center justify-center shrink-0 border-2 transition-all ${
              isTurn ? 'border-[#e5b869] shadow-[0_0_12px_rgba(229,184,105,0.45)]' : 'border-white/20'
            }`}
          >
            {player?.user.avatarUrl ? (
              <img
                src={player.user.avatarUrl}
                alt={player.user.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = generateInitialAvatar(player.user.name || 'GM');
                }}
              />
            ) : player?.user.isBot ? (
              <Bot className="w-5 h-5 text-[#ffd88c]" />
            ) : (
              <img
                src={generateInitialAvatar(player?.user.name || 'Player')}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            )}
          </div>
          {/* Color indicator dot & Presence badge */}
          <span
            className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#080808] shadow-md ${
              isWhite ? 'bg-gradient-to-br from-white to-slate-200' : 'bg-gradient-to-br from-slate-950 to-slate-800 border-slate-600'
            }`}
          />
          {/* Presence Ring on Avatar */}
          {isTyping ? (
            <span
              title="Player is texting in chat..."
              className="absolute -top-1 -right-1 w-3 h-3 rounded-full indicator-texting-gold animate-ping"
            />
          ) : isAway ? (
            <span
              title="Player is away (tab switched)"
              className="absolute -top-1 -right-1 w-3 h-3 rounded-full indicator-away-silver border border-zinc-500"
            />
          ) : null}
        </div>

        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="flex items-center gap-1.5 min-w-0 max-w-full">
            <span
              className={`${
                compact
                  ? 'text-[11px] max-w-[90px]'
                  : 'text-xs sm:text-sm max-w-[130px] sm:max-w-[200px]'
              } font-bold text-[#ffffff] truncate block font-serif tracking-wide shrink min-w-0`}
              title={player?.user?.name || (isWhite ? 'White' : 'Black')}
            >
              {player?.user?.name || (isWhite ? 'White' : 'Black')}
            </span>

            {/* Glowing Golden Texting or Silver Away Badge */}
            {isTyping ? (
              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-md bg-[#231b0c] text-[#ffd88c] border border-[#ffd88c]/60 shadow-[0_0_10px_rgba(255,216,140,0.7)] flex items-center gap-1 animate-pulse font-mono shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ffd88c] shadow-[0_0_6px_#ffd88c]" />
                <span>Texting</span>
              </span>
            ) : isAway ? (
              <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded-md bg-[#18181b] text-zinc-300 border border-zinc-600 shadow-[0_0_8px_rgba(212,212,216,0.4)] flex items-center gap-1 font-mono shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[#d4d4d8] shadow-[0_0_6px_rgba(212,212,216,0.8)]" />
                <span>Away</span>
              </span>
            ) : null}

            {player?.user?.username && !isTyping && !isAway && (
              <span className="text-[10px] text-[#ffd88c]/80 font-mono hidden min-[520px]:inline truncate max-w-[80px] shrink-0">
                @{player.user.username}
              </span>
            )}

            {player?.user?.isBot ? (
              isTurn ? (
                <span className="text-[9px] uppercase font-extrabold px-2 py-0.5 rounded-md bg-[#221708] text-[#ffd88c] border border-[#ffd88c]/70 shadow-[0_0_12px_rgba(255,216,140,0.5)] shrink-0 flex items-center gap-1 font-mono animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ffd88c] animate-ping" />
                  <span>Thinking...</span>
                </span>
              ) : (
                <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.2 rounded bg-[#1f1f1f] text-[#ffd88c] border border-[#e5b869]/40 shrink-0">
                  BOT
                </span>
              )
            ) : null}
          </div>

          {/* Bot Thinking Progress Bar */}
          {player?.user?.isBot && isTurn && (
            <div className="w-full max-w-[120px] h-1.5 bg-[#0a0a0a] rounded-full overflow-hidden border border-[#ffd88c]/40 my-1 relative shadow-inner">
              <div className="h-full rounded-full luxury-gold-progress-fill animate-indeterminate-beam shadow-[0_0_8px_#ffd88c]" />
            </div>
          )}

          {/* Captured pieces and token material advantage - Felt-lined wooden piece drawer */}
          {!compact ? (
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-0.5 min-w-0">
              {capturedPieces.length > 0 && (
                <div className="chess-felt-drawer px-2 py-0.5 rounded-lg flex items-center tracking-tighter text-sm opacity-95 select-none overflow-hidden max-w-[120px] sm:max-w-none shadow-inner border border-[#e5b869]/20">
                  {capturedPieces.map((p, idx) => (
                    <span key={idx} className="inline-block -mr-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] text-[#f3d082]">
                      {pieceSymbols[p] || p}
                    </span>
                  ))}
                </div>
              )}
              {materialDifference > 0 && (
                <span className="text-[11px] font-bold text-[#ffd88c] tabular-nums px-1.5 py-0.5 rounded-md bg-[#1c140e] border border-[#e5b869]/30 shrink-0 shadow-sm font-mono">
                  +{materialDifference}
                </span>
              )}
            </div>
          ) : materialDifference > 0 ? (
            <span className="text-[10px] font-bold text-[#ffd88c] tabular-nums block font-mono">
              +{materialDifference}
            </span>
          ) : null}
        </div>
      </div>

      {/* Right: Championship DGT Clock Timer */}
      {player && displayTime > 0 && (
        <div
          className={`shrink-0 ${
            compact
              ? 'px-2 py-0.5 text-[11px] rounded-lg gap-1'
              : 'px-2.5 sm:px-3.5 py-1 sm:py-1.5 text-xs sm:text-sm md:text-base rounded-xl gap-1.5'
          } font-mono font-bold tabular-nums flex items-center shadow-lg transition-all ${
            isTurn
              ? isLowTime
                ? 'bg-rose-950 text-rose-200 border border-rose-500/80 shadow-[0_0_14px_rgba(244,63,94,0.4)] animate-pulse'
                : 'bg-gradient-to-r from-[#222222] to-[#141414] text-[#ffd88c] border border-[#e5b869] shadow-[0_0_14px_rgba(229,184,105,0.4)]'
              : 'bg-[#0a0a0a] text-zinc-400 border border-white/10'
          }`}
        >
          <Clock className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} ${isTurn ? 'text-[#ffd88c]' : 'text-zinc-500'}`} />
          <span>{formatTime(displayTime)}</span>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { Copy, Check, Send, ArrowLeft, Swords, Crown, UserCheck } from 'lucide-react';
import { RoomState, UserProfile } from '../types/chess';
import { shareLobbyLink, triggerHaptic, generateInitialAvatar, getSessionToken } from '../utils/telegram';

interface WaitingRoomViewProps {
  room: RoomState;
  currentUser: UserProfile;
  onCancel: () => void;
  onStartMatch?: () => Promise<boolean> | void;
  onSwitchToBot?: () => void;
}

export const WaitingRoomView: React.FC<WaitingRoomViewProps> = ({
  room,
  currentUser,
  onCancel,
  onStartMatch,
}) => {
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const { url, telegramShareUrl } = shareLobbyLink(room.code);

  const handleCopyCode = () => {
    triggerHaptic('light');
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(room.code);
    }
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2500);
  };

  const handleCopyLink = () => {
    triggerHaptic('light');
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(url);
    }
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
  };

  const handleShareTelegram = () => {
    triggerHaptic('medium');
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(telegramShareUrl);
    } else {
      window.open(telegramShareUrl, '_blank');
    }
  };

  const handleStartGame = async () => {
    triggerHaptic('heavy');
    setIsStarting(true);
    setStartError(null);
    try {
      if (onStartMatch) {
        await onStartMatch();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to start match';
      setStartError(msg);
      setIsStarting(false);
    }
  };

  // Identify Host vs Opponent
  const myToken = getSessionToken();
  const isHost =
    String(room.hostId) === String(currentUser.id) ||
    (room.hostSessionToken && room.hostSessionToken === myToken);

  // Determine which player slot is host and which is opponent
  const whiteIsHost = room.whitePlayer && (String(room.whitePlayer.user.id) === String(room.hostId) || (room.whitePlayer.sessionToken && room.whitePlayer.sessionToken === room.hostSessionToken));
  const hostPlayer = whiteIsHost ? room.whitePlayer : (room.blackPlayer || room.whitePlayer);
  const opponentPlayer = whiteIsHost ? room.blackPlayer : room.whitePlayer;

  const bothPlayersConnected = Boolean(room.whitePlayer && room.blackPlayer);

  const preferredColorText =
    room.gameRules.preferredColor === 'w'
      ? 'White ⚪'
      : room.gameRules.preferredColor === 'b'
      ? 'Black ⚫'
      : 'Random 🎲';

  const timeText = !room.gameRules.timerEnabled
    ? 'No Timer'
    : `${Math.round(room.gameRules.initialTimeSec / 60)} min + ${room.gameRules.incrementSec}s`;

  return (
    <div className="min-h-[calc(100dvh-70px)] flex items-center justify-center p-4">
      <div className="clay-card w-full max-w-lg p-5 sm:p-7 text-center border border-[#e5b869]/30 relative shadow-2xl bg-[#0d0d0d]/98">
        <button
          onClick={onCancel}
          className="absolute top-4 left-4 text-zinc-400 hover:text-white flex items-center gap-1.5 text-xs font-semibold p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Lobby</span>
        </button>

        {/* Header status */}
        <div className="mt-3 mb-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#e5b869]/15 border border-[#e5b869]/30 flex items-center justify-center text-[#ffd88c] text-2xl animate-pulse shadow-inner">
            {bothPlayersConnected ? '⚔️' : '⏳'}
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-2 font-serif">
            {bothPlayersConnected ? 'Both Grandmasters Ready!' : 'Waiting for an Opponent'}
          </h2>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1">
            {bothPlayersConnected
              ? isHost
                ? 'Your opponent is in the salon! Starting the match...'
                : 'Connected to lobby! Getting match ready...'
              : 'Share the lobby code or link below. When your friend connects, you will enter the board automatically!'}
          </p>
        </div>

        {/* Lobby Invite Code & Copy Code Button */}
        <div className="my-4 p-3.5 sm:p-4 rounded-2xl bg-[#050505] border border-[#e5b869]/30 shadow-inner flex flex-col items-center">
          <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
            Lobby Invite Code
          </span>
          <div className="text-3xl sm:text-4xl font-mono font-black text-[#ffd88c] tracking-widest my-1 select-all drop-shadow-sm">
            {room.code}
          </div>

          <div className="flex items-center gap-2 mt-2 w-full max-w-xs">
            {/* Primary Action: Copy Code */}
            <button
              onClick={handleCopyCode}
              title="Copy the 6-character room code"
              className="clay-button-primary flex-1 py-2 px-3 text-xs flex items-center justify-center gap-1.5 font-bold cursor-pointer transition-all active:scale-95 shadow-md"
            >
              {codeCopied ? <Check className="w-3.5 h-3.5 text-zinc-900" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{codeCopied ? 'Code Copied!' : 'Copy Code'}</span>
            </button>

            {/* Secondary Action: Copy Link */}
            <button
              onClick={handleCopyLink}
              title="Copy full join URL"
              className="clay-button py-2 px-3 text-xs flex items-center justify-center gap-1 text-zinc-300 hover:text-white cursor-pointer transition-all"
            >
              {linkCopied ? <Check className="w-3.5 h-3.5 text-[#ffd88c]" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
              <span>{linkCopied ? 'Link Copied!' : 'Link'}</span>
            </button>
          </div>
        </div>

        {/* Share via Telegram Button - Luxury Gold Styling */}
        <div className="mb-4">
          <button
            onClick={handleShareTelegram}
            className="w-full py-2.5 sm:py-3 px-4 rounded-xl font-extrabold text-[#000000] clay-button-primary bg-gradient-to-r from-[#ffd88c] via-[#e5b869] to-[#c89547] hover:brightness-110 shadow-[0_6px_24px_rgba(229,184,105,0.45)] border border-white/40 flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer transition-all active:scale-[0.99]"
          >
            <Send className="w-4 h-4 text-black stroke-[2.5]" />
            <span>Share Match via Telegram</span>
          </button>
        </div>

        {/* Players Roster Display */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 my-4">
          {/* Host Card */}
          <div className="p-3 rounded-xl bg-[#141414] border border-[#e5b869]/25 flex items-center gap-2.5 text-left shadow-sm">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-800 border border-[#e5b869]/50 shrink-0 relative">
              {hostPlayer?.user.avatarUrl ? (
                <img
                  src={hostPlayer.user.avatarUrl}
                  alt={hostPlayer.user.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = generateInitialAvatar(hostPlayer.user.name);
                  }}
                />
              ) : (
                <img
                  src={generateInitialAvatar(hostPlayer?.user.name || 'Host')}
                  alt="Host"
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <Crown className="w-3 h-3 text-[#ffd88c] shrink-0" />
                <span className="text-xs font-bold text-white truncate block">
                  {hostPlayer?.user.name || 'Host'}
                </span>
              </div>
              <span className="text-[10px] text-[#ffd88c] flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ffd88c] inline-block shrink-0" />
                Host (White)
              </span>
            </div>
          </div>

          {/* Opponent Card */}
          {opponentPlayer ? (
            <div className="p-3 rounded-xl bg-[#141414] border border-[#e5b869]/35 flex items-center gap-2.5 text-left shadow-sm animate-fadeIn">
              <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-800 border border-[#e5b869]/40 shrink-0">
                {opponentPlayer.user.avatarUrl ? (
                  <img
                    src={opponentPlayer.user.avatarUrl}
                    alt={opponentPlayer.user.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = generateInitialAvatar(opponentPlayer.user.name);
                    }}
                  />
                ) : (
                  <img
                    src={generateInitialAvatar(opponentPlayer.user.name)}
                    alt="Opponent"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-[#ffd88c] shrink-0" />
                  <span className="text-xs font-bold text-white truncate block">
                    {opponentPlayer.user.name}
                  </span>
                </div>
                <span className="text-[10px] text-[#ffd88c] flex items-center gap-1 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ffd88c] animate-pulse inline-block shrink-0" />
                  Connected & Ready
                </span>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-[#141414]/70 border border-dashed border-[#e5b869]/20 flex items-center gap-2.5 text-left">
              <div className="w-9 h-9 rounded-full bg-[#1c1c1c] border border-zinc-700/40 flex items-center justify-center text-zinc-500 text-xs shrink-0">
                👤
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-semibold text-zinc-400 block truncate">
                  Opponent Slot
                </span>
                <span className="text-[10px] text-[#ffd88c]/80 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ffd88c] animate-ping inline-block shrink-0" />
                  Waiting to connect...
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Start Game Action Bar (When both players are connected) */}
        {bothPlayersConnected && (
          <div className="my-4 p-3.5 rounded-2xl bg-gradient-to-r from-[#1c1c1c] via-[#141414] to-[#0c0c0c] border border-[#e5b869]/40 shadow-xl animate-fadeIn">
            {isHost ? (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleStartGame}
                  disabled={isStarting}
                  className="w-full py-3 sm:py-3.5 px-4 rounded-xl font-black text-xs sm:text-sm text-black clay-button-primary shadow-[0_6px_20px_rgba(229,184,105,0.4)] flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-80"
                >
                  {isStarting ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
                      <span>Entering Match Salon...</span>
                    </>
                  ) : (
                    <>
                      <Swords className="w-4 h-4 text-black" />
                      <span>♚ Start Match Now</span>
                    </>
                  )}
                </button>

                {isStarting && (
                  <div className="w-full h-2 rounded-full luxury-gold-progress-track overflow-hidden p-0.5 mt-2">
                    <div className="h-full rounded-full luxury-gold-progress-fill animate-indeterminate-beam shadow-[0_0_8px_#ffd88c]" />
                  </div>
                )}

                <p className="text-[11px] text-zinc-300">
                  You are the host. Tap Start Match when both players are ready!
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 text-xs font-semibold text-[#ffd88c] py-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ffd88c] animate-ping shrink-0" />
                  <span>Waiting for the Host to press Start Match...</span>
                </div>
                <div className="w-48 h-1.5 rounded-full luxury-gold-progress-track overflow-hidden p-0.5 mt-1">
                  <div className="h-full rounded-full luxury-gold-progress-fill animate-indeterminate-beam shadow-[0_0_6px_#ffd88c]" />
                </div>
              </div>
            )}

            {startError && (
              <p className="text-[11px] text-rose-400 font-semibold mt-2">{startError}</p>
            )}
          </div>
        )}

        {/* Match Settings Snapshot */}
        <div className="grid grid-cols-2 gap-2 text-left p-3 rounded-xl bg-white/[0.02] border border-[#e5b869]/20 text-xs">
          <div>
            <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Host Color</span>
            <span className="font-semibold text-zinc-300">{preferredColorText}</span>
          </div>
          <div>
            <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Clock</span>
            <span className="font-semibold text-zinc-300">{timeText}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

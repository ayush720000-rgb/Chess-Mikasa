import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  X,
  Send,
  Smile,
  Reply,
  CornerDownRight,
  ScrollText,
  MessageSquare,
  Copy,
  Check,
  PanelRightClose,
  ChevronRight,
} from 'lucide-react';
import { ChatMessage, ChatReaction, ChatReactionUser, UserProfile } from '../types/chess';
import { playChatSound, playReactionSound } from '../utils/sound';
import { triggerHaptic } from '../utils/telegram';

export interface LiveGameInfo {
  turn: 'w' | 'b';
  myColor: 'w' | 'b';
  whiteName: string;
  blackName: string;
  isMyTurn: boolean;
  lastMove?: { from: string; to: string; san?: string };
}

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  currentUser: UserProfile;
  isSpectator: boolean;
  pgn?: string;
  onSendMessage: (text: string, replyTo?: { id: string; senderName: string; text: string } | null) => void;
  onAddReaction: (messageId: string, emoji: string) => void;
  liveGameInfo?: LiveGameInfo;
  onDragOffsetChange?: (offset: number) => void;
  onTypingChange?: (isTyping: boolean) => void;
  opponentTypingName?: string | null;
  opponentAwayName?: string | null;
}

const QUICK_REACTIONS = ['😂', '❤️', '😭', '😡', '🥀', '🙏', '🖕', '🤡'];

const EMOJI_PALETTE = ['😂', '❤️', '😭', '😡', '🥀', '🙏', '🖕', '🤡'];

interface MovePair {
  number: number;
  white: string;
  black?: string;
}

function parsePgnToMovePairs(pgn?: string): MovePair[] {
  if (!pgn) return [];
  const clean = pgn
    .replace(/\[.*?\]/g, '')
    .replace(/\{.*?\}/g, '')
    .trim();

  const tokens = clean.split(/\s+/).filter(Boolean);
  const pairs: MovePair[] = [];
  let currentPair: MovePair | null = null;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token === '1-0' || token === '0-1' || token === '1/2-1/2' || token === '*') {
      continue;
    }

    const match = token.match(/^(\d+)\./);
    if (match) {
      const num = parseInt(match[1], 10);
      const rem = token.replace(/^\d+\./, '');
      currentPair = { number: num, white: rem };
      pairs.push(currentPair);

      if (!rem && i + 1 < tokens.length) {
        const next = tokens[i + 1];
        if (!next.match(/^\d+\./)) {
          i++;
          currentPair.white = next;
        }
      }
    } else if (currentPair && !currentPair.black) {
      currentPair.black = token;
    }
  }

  return pairs;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  isOpen,
  onClose,
  messages,
  currentUser,
  isSpectator,
  pgn = '',
  onSendMessage,
  onAddReaction,
  liveGameInfo,
  onDragOffsetChange,
  onTypingChange,
  opponentTypingName,
  opponentAwayName,
}) => {
  const [subOption, setSubOption] = useState<'messages' | 'notations'>('messages');
  const [inputText, setInputText] = useState('');
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const [activeReactionPickerMessageId, setActiveReactionPickerMessageId] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [copiedPgn, setCopiedPgn] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Swipe-to-close gesture handling on mobile screens
  const [dragOffset, setDragOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);
  const touchStartTimeRef = useRef<number>(0);
  const isHorizontalGestureRef = useRef<boolean | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messageElementsRef = useRef<Record<string, HTMLDivElement | null>>({});

  const movePairs = useMemo(() => parsePgnToMovePairs(pgn), [pgn]);
  const totalMovesCount = movePairs.reduce((acc, p) => acc + (p.white ? 1 : 0) + (p.black ? 1 : 0), 0);

  const prevIsOpenRef = useRef<boolean>(isOpen);
  const prevMessagesLengthRef = useRef<number>(messages.length);

  // Auto-scroll on new messages or drawer open, avoiding jumping when reacting to older messages
  useEffect(() => {
    if (isOpen && subOption === 'messages') {
      const openedJustNow = !prevIsOpenRef.current;
      const hasNewMessage = messages.length > prevMessagesLengthRef.current;
      if (openedJustNow || hasNewMessage) {
        messagesEndRef.current?.scrollIntoView({ behavior: openedJustNow ? 'auto' : 'smooth' });
      }
    }
    prevIsOpenRef.current = isOpen;
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length, isOpen, subOption]);

  if (!isOpen) return null;

  // Resolve reactor list with DPs for Telegram-style stacking
  const getReactorsForReaction = (reaction: ChatReaction): ChatReactionUser[] => {
    if (reaction.reactors && reaction.reactors.length > 0) {
      return reaction.reactors;
    }
    return reaction.users.map((uid) => {
      if (String(uid) === String(currentUser.id)) {
        return {
          userId: currentUser.id,
          name: currentUser.name,
          avatarUrl: currentUser.avatarUrl,
        };
      }
      return {
        userId: uid,
        name: 'Player',
      };
    });
  };

  // Trigger instant, clean collapse without lag
  const handleTriggerCollapse = () => {
    triggerHaptic('light');
    setDragOffset(0);
    onDragOffsetChange?.(0);
    onClose();
  };

  // Touch gesture handlers for swipe-to-close
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1 || isDismissing) return;
    const touch = e.touches[0];
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
    touchStartTimeRef.current = Date.now();
    isHorizontalGestureRef.current = null;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartXRef.current || isDismissing) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartXRef.current;
    const deltaY = touch.clientY - touchStartYRef.current;

    // Detect gesture orientation before committing
    if (isHorizontalGestureRef.current === null) {
      if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) {
        if (deltaX > 0 && Math.abs(deltaX) > Math.abs(deltaY) * 1.1) {
          isHorizontalGestureRef.current = true;
        } else {
          isHorizontalGestureRef.current = false;
        }
      }
    }

    if (isHorizontalGestureRef.current === true) {
      const currentOffset = Math.max(0, deltaX);
      setDragOffset(currentOffset);
      onDragOffsetChange?.(currentOffset);
    }
  };

  const handleTouchEnd = () => {
    if (isHorizontalGestureRef.current === true) {
      const touchDuration = Date.now() - touchStartTimeRef.current;
      const velocity = dragOffset / Math.max(1, touchDuration);

      if (dragOffset > 60 || (velocity > 0.35 && dragOffset > 25)) {
        setIsDismissing(true);
        triggerHaptic('medium');
        setTimeout(() => {
          onClose();
          setDragOffset(0);
          setIsDismissing(false);
          setIsSwiping(false);
          onDragOffsetChange?.(0);
        }, 180);
      } else {
        setDragOffset(0);
        setIsSwiping(false);
        onDragOffsetChange?.(0);
      }
    } else {
      setIsSwiping(false);
      setDragOffset(0);
      onDragOffsetChange?.(0);
    }
    touchStartXRef.current = 0;
    touchStartYRef.current = 0;
    isHorizontalGestureRef.current = null;
  };

  const handleHandleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    const touch = e.touches[0];
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
    touchStartTimeRef.current = Date.now();
    isHorizontalGestureRef.current = true;
    setIsSwiping(true);
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text) return;

    triggerHaptic('light');
    playChatSound();

    const replyRef = replyTarget
      ? {
          id: replyTarget.id,
          senderName: replyTarget.senderName,
          text: replyTarget.text.slice(0, 60),
        }
      : null;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    onTypingChange?.(false);

    onSendMessage(text, replyRef);
    setInputText('');
    setReplyTarget(null);
    setShowEmojiPicker(false);
  };

  const handlePickReaction = (messageId: string, emoji: string) => {
    triggerHaptic('light');
    playReactionSound();
    onAddReaction(messageId, emoji);
    setActiveReactionPickerMessageId(null);
  };

  const handleAddEmojiToInput = (emoji: string) => {
    setInputText((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  const handleCopyPgn = () => {
    triggerHaptic('light');
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(pgn || 'No moves yet.');
    }
    setCopiedPgn(true);
    setTimeout(() => setCopiedPgn(false), 2000);
  };

  const handleJumpToReply = (targetId: string) => {
    const el = messageElementsRef.current[targetId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessageId(targetId);
      setTimeout(() => setHighlightedMessageId(null), 2000);
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      style={{
        transform: dragOffset > 0 ? `translateX(${dragOffset}px)` : undefined,
        transition: isSwiping ? 'none' : 'transform 0.15s ease-out',
      }}
      className="w-full h-full flex flex-col justify-between border-l border-[#e5b869]/25 shadow-2xl relative z-40 bg-[#080808] select-none min-w-0 max-w-full overflow-hidden"
    >
      {/* Mobile Swipe-to-Close Drag Handle / Pull Tab on the Left Edge */}
      <div
        className="sm:hidden absolute -left-6 top-1/2 -translate-y-1/2 w-6 h-28 bg-[#141414] border-y border-l border-[#e5b869]/40 rounded-l-2xl flex flex-col items-center justify-center cursor-grab active:cursor-grabbing shadow-[-6px_0_16px_rgba(0,0,0,0.85)] touch-none select-none z-50 text-[#e5b869] hover:text-[#ffffff] transition-colors"
        onTouchStart={handleHandleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => {
          e.stopPropagation();
          handleTriggerCollapse();
        }}
        title="Swipe right or tap to collapse to board"
        aria-label="Collapse chat panel"
      >
        <div className="w-1 h-7 bg-[#e5b869]/80 rounded-full mb-1 shadow-[0_0_6px_rgba(229,184,105,0.4)]" />
        <ChevronRight className="w-4 h-4 text-[#ffd88c] animate-pulse" />
        <span className="text-[7px] font-black uppercase tracking-widest text-zinc-400 rotate-90 mt-2 pointer-events-none">
          PULL
        </span>
      </div>

      {/* Live Match Bar (Black & Gold) */}
      {liveGameInfo && (
        <div className="sm:hidden px-3 py-2 bg-gradient-to-r from-[#141414] via-[#0d0d0d] to-[#050505] border-b border-[#e5b869]/20 flex items-center justify-between shrink-0 shadow-inner">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                liveGameInfo.isMyTurn
                  ? 'bg-[#ffd88c] animate-pulse shadow-[0_0_8px_rgba(255,216,140,0.9)]'
                  : 'bg-zinc-500'
              }`}
            />
            <div className="truncate">
              <span className="text-[11px] font-bold text-white block truncate font-serif">
                {liveGameInfo.isMyTurn ? 'Your turn to move!' : `${liveGameInfo.turn === 'w' ? liveGameInfo.whiteName : liveGameInfo.blackName}'s turn`}
              </span>
              {liveGameInfo.lastMove && (
                <span className="text-[10px] font-mono text-[#ffd88c] block truncate opacity-90">
                  Last: {liveGameInfo.lastMove.from} → {liveGameInfo.lastMove.to}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleTriggerCollapse}
            title="Collapse chat and return to board"
            className="clay-button-primary px-2.5 py-1 text-[11px] font-bold flex items-center gap-1 shrink-0 rounded-lg shadow-md cursor-pointer hover:brightness-110 active:scale-95 transition-all"
          >
            <span>Board</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header with Navigation Tabs (Messages vs Notations) - Flush with top, zero gap */}
      <div className="p-2 sm:p-3 border-b border-[#e5b869]/20 bg-[#0c0c0c]/98 shrink-0">
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs sm:text-sm font-bold text-white tracking-wide truncate font-serif">
              Match Chat
            </span>
            {isSpectator && (
              <span className="text-[9px] sm:text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-[#ffd88c] border border-[#e5b869]/30 shrink-0">
                Spectating
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleTriggerCollapse}
              title="Collapse chat panel"
              className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 cursor-pointer shrink-0 transition-colors flex items-center gap-1 text-xs"
            >
              <PanelRightClose className="w-4 h-4 hidden sm:block" />
              <ChevronRight className="w-4 h-4 sm:hidden text-[#ffd88c]" />
            </button>
          </div>
        </div>

        {/* Sub-option segmented selector */}
        <div className="flex items-center p-1 bg-[#050505] rounded-xl border border-white/10 text-xs">
          <button
            onClick={() => {
              triggerHaptic('light');
              setSubOption('messages');
            }}
            className={`flex-1 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              subOption === 'messages'
                ? 'bg-gradient-to-r from-[#242424] to-[#161616] text-white shadow-sm font-bold border border-[#e5b869]/40'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#ffd88c]" />
            <span>Chat ({messages.length})</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic('light');
              setSubOption('notations');
            }}
            className={`flex-1 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              subOption === 'notations'
                ? 'bg-gradient-to-r from-[#242424] to-[#161616] text-white shadow-sm font-bold border border-[#e5b869]/40'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ScrollText className="w-3.5 h-3.5 text-[#ffd88c]" />
            <span>Moves ({totalMovesCount})</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Messages Stream */}
      {subOption === 'messages' && (
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 min-h-0 bg-[#050505]/80">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-zinc-400 text-xs px-4">
              <span className="text-3xl mb-2">♟️</span>
              <span className="font-semibold text-white">No chat messages yet</span>
              <p className="text-[11px] text-zinc-500 mt-1">
                Say hello or react with Telegram-style stacked emojis!
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = String(msg.senderId) === String(currentUser.id);
              const isSystem = msg.senderId === 'system';
              const isHighlighted = highlightedMessageId === msg.id;

              if (isSystem) {
                return (
                  <div key={msg.id} className="text-center my-2">
                    <span className="text-[10px] sm:text-[11px] text-[#ffd88c] bg-[#141414]/95 px-3 py-1 rounded-full border border-[#e5b869]/30 inline-block max-w-[90%] break-words font-serif italic shadow-sm">
                      {msg.text}
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  ref={(el) => {
                    messageElementsRef.current[msg.id] = el;
                  }}
                  className={`flex gap-2.5 transition-all duration-300 ${isMine ? 'flex-row-reverse' : 'flex-row'} ${
                    isHighlighted ? 'bg-[#e5b869]/20 p-2 rounded-2xl ring-2 ring-[#e5b869]' : ''
                  }`}
                >
                  {/* Sender Avatar */}
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden shrink-0 bg-[#141414] border border-[#e5b869]/40 mt-1 shadow-sm">
                    {msg.senderAvatar ? (
                      <img
                        src={msg.senderAvatar}
                        alt={msg.senderName}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-[#050505] bg-gradient-to-br from-[#ffd88c] to-[#c89547]">
                        {msg.senderName.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Message Bubble Column */}
                  <div className={`flex flex-col max-w-[78%] group relative ${isMine ? 'items-end' : 'items-start'}`}>
                    {/* Sender Name */}
                    <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-zinc-400">
                      <span className="font-semibold text-white truncate max-w-[140px]">
                        {isMine ? 'You' : msg.senderName}
                      </span>
                      {msg.isSpectator && (
                        <span className="text-[9px] text-[#ffd88c] font-mono">[Spectator]</span>
                      )}
                    </div>

                    {/* Quoted Reply Preview */}
                    {msg.replyTo && (
                      <button
                        type="button"
                        onClick={() => handleJumpToReply(msg.replyTo!.id)}
                        className="mb-1 p-1.5 rounded-lg bg-[#141414]/90 border-l-2 border-[#e5b869] text-[10px] text-zinc-200 flex items-start gap-1 text-left cursor-pointer hover:bg-[#1f1f1f] transition-colors max-w-full truncate shadow-inner"
                      >
                        <CornerDownRight className="w-3 h-3 text-[#ffd88c] shrink-0 mt-0.5" />
                        <div className="truncate">
                          <span className="font-bold text-[#ffd88c] mr-1">
                            {msg.replyTo.senderName}:
                          </span>
                          <span className="opacity-80">{msg.replyTo.text}</span>
                        </div>
                      </button>
                    )}

                    {/* Text Bubble - Black / Gold Luxury */}
                    <div
                      className={`p-2.5 sm:p-3 rounded-2xl text-xs sm:text-sm leading-relaxed relative ${
                        isMine
                          ? 'bg-gradient-to-br from-[#242424] via-[#1a1a1a] to-[#121212] text-white font-medium rounded-tr-sm border border-[#e5b869]/40 shadow-[0_4px_16px_rgba(0,0,0,0.6)]'
                          : 'bg-[#141414] text-white rounded-tl-sm border border-zinc-800 shadow-[0_3px_12px_rgba(0,0,0,0.5)]'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                    </div>

                    {/* Telegram-style Reactions Display Strip with Stacked DP Avatars */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {msg.reactions.map((r) => {
                          const hasReacted = r.users.some(
                            (u) => String(u) === String(currentUser.id)
                          );
                          const reactorsList = getReactorsForReaction(r);

                          return (
                            <button
                              key={r.emoji}
                              type="button"
                              onClick={() => handlePickReaction(msg.id, r.emoji)}
                              className={`inline-flex items-center gap-1.5 py-0.5 px-2 rounded-full text-xs transition-all active:scale-95 cursor-pointer select-none ${
                                hasReacted
                                  ? 'bg-gradient-to-r from-[#242424] to-[#161616] border border-[#e5b869] text-white shadow-[0_0_10px_rgba(229,184,105,0.3)] ring-1 ring-[#e5b869]/50 font-bold'
                                  : 'bg-[#121212] hover:bg-[#1c1c1c] border border-zinc-800 hover:border-[#e5b869]/50 text-zinc-200'
                              }`}
                            >
                              <span className="text-sm leading-none">{r.emoji}</span>

                              {/* Stacked DP Avatars (Telegram style) */}
                              {reactorsList.length > 0 && (
                                <div className="flex items-center -space-x-1.5 pl-0.5">
                                  {reactorsList.slice(0, 3).map((reactor, idx) => (
                                    <div
                                      key={`${reactor.userId}-${idx}`}
                                      className="w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full overflow-hidden border border-[#080808] shadow-sm shrink-0 bg-[#1c1c1c]"
                                      title={reactor.name}
                                    >
                                      {reactor.avatarUrl ? (
                                        <img
                                          src={reactor.avatarUrl}
                                          alt={reactor.name}
                                          referrerPolicy="no-referrer"
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            (e.target as HTMLElement).style.display = 'none';
                                          }}
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[7.5px] font-bold text-[#ffd88c] bg-[#222222]">
                                          {reactor.name.slice(0, 1).toUpperCase()}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}

                              <span className="text-[11px] font-bold font-mono tabular-nums text-[#ffd88c]">
                                {r.count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Quick Reaction & Reply Toolbar */}
                    <div
                      className={`flex items-center gap-1 mt-1 opacity-80 group-hover:opacity-100 transition-opacity ${
                        isMine ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setActiveReactionPickerMessageId(
                            activeReactionPickerMessageId === msg.id ? null : msg.id
                          )
                        }
                        title="React to message"
                        className="p-1 hover:text-[#ffd88c] text-zinc-400 hover:bg-white/10 rounded cursor-pointer transition-colors"
                      >
                        <Smile className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setReplyTarget(msg);
                          inputRef.current?.focus();
                        }}
                        title="Reply to message"
                        className="p-1 hover:text-[#ffd88c] text-zinc-400 hover:bg-white/10 rounded cursor-pointer transition-colors"
                      >
                        <Reply className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Quick Reactions Picker Dropdown */}
                    {activeReactionPickerMessageId === msg.id && (
                      <>
                        <div
                          className="fixed inset-0 z-20 cursor-default"
                          onClick={() => setActiveReactionPickerMessageId(null)}
                        />
                        <div
                          className={`absolute bottom-full mb-1.5 ${
                            isMine ? 'right-0' : 'left-0'
                          } z-30 flex items-center gap-1 p-1 sm:p-1.5 rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.95)] border border-[#e5b869]/70 bg-[#141414] max-w-[calc(100vw-36px)] sm:max-w-[280px] overflow-x-auto no-scrollbar animate-fadeIn`}
                        >
                          {QUICK_REACTIONS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handlePickReaction(msg.id, emoji)}
                              className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center hover:scale-125 active:scale-95 transition-transform text-base sm:text-lg cursor-pointer shrink-0 rounded-lg hover:bg-white/10"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Tab 2: Move Notations Stream */}
      {subOption === 'notations' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 bg-[#050505]/80">
          <div className="flex items-center justify-between pb-2 border-b border-[#e5b869]/20">
            <span className="text-xs font-semibold text-white tracking-wide font-serif">PGN Move History</span>
            <button
              type="button"
              onClick={handleCopyPgn}
              className="clay-button px-2.5 py-1 text-[11px] flex items-center gap-1 cursor-pointer"
            >
              {copiedPgn ? <Check className="w-3 h-3 text-[#ffd88c]" /> : <Copy className="w-3 h-3 text-[#ffd88c]" />}
              <span>{copiedPgn ? 'Copied' : 'Copy PGN'}</span>
            </button>
          </div>

          {movePairs.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center text-zinc-400 text-xs">
              <ScrollText className="w-8 h-8 text-zinc-600 mb-2" />
              <span>No moves recorded yet.</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              {movePairs.map((pair) => (
                <div
                  key={pair.number}
                  className="p-2 rounded-xl bg-[#121212] border border-zinc-800 flex items-center justify-between shadow-sm"
                >
                  <span className="text-zinc-500 font-bold w-6">{pair.number}.</span>
                  <span className="text-[#ffd88c] font-bold flex-1 text-center">{pair.white}</span>
                  <span className="text-white font-semibold flex-1 text-right">
                    {pair.black || '...'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reply Banner if set */}
      {replyTarget && subOption === 'messages' && (
        <div className="px-3 py-1.5 bg-[#141414] border-t border-[#e5b869]/25 flex items-center justify-between text-xs text-white shrink-0">
          <div className="flex items-center gap-1.5 truncate">
            <CornerDownRight className="w-3.5 h-3.5 text-[#ffd88c] shrink-0" />
            <span className="text-[#ffd88c] font-bold shrink-0">{replyTarget.senderName}:</span>
            <span className="opacity-80 truncate">{replyTarget.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setReplyTarget(null)}
            className="p-1 text-zinc-400 hover:text-white cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Emoji Picker Drawer */}
      {showEmojiPicker && subOption === 'messages' && (
        <div className="px-2 py-2 bg-[#0c0c0c] border-t border-[#e5b869]/25 flex items-center justify-between sm:justify-center sm:gap-3 shrink-0 animate-fadeIn overflow-x-auto no-scrollbar">
          {EMOJI_PALETTE.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleAddEmojiToInput(emoji)}
              className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-lg sm:text-xl hover:bg-white/15 active:scale-90 rounded-xl cursor-pointer transition-all shrink-0"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Opponent Live Typing / Away Banner */}
      {subOption === 'messages' && (opponentTypingName || opponentAwayName) && (
        <div className="px-3 py-1 bg-[#121212] border-t border-[#e5b869]/20 flex items-center justify-between text-[11px] shrink-0">
          {opponentTypingName ? (
            <div className="flex items-center gap-2 text-[#ffd88c] animate-pulse">
              <span className="w-2 h-2 rounded-full indicator-texting-gold animate-ping" />
              <span className="font-semibold">{opponentTypingName} is typing...</span>
            </div>
          ) : opponentAwayName ? (
            <div className="flex items-center gap-2 text-zinc-400">
              <span className="w-2 h-2 rounded-full indicator-away-silver" />
              <span>{opponentAwayName} is away</span>
            </div>
          ) : null}
        </div>
      )}

      {/* Message Input Footer - Fixed for Mobile Viewport with guaranteed Send Button visibility */}
      {subOption === 'messages' && (
        <form
          onSubmit={handleSend}
          className="w-full max-w-full box-border p-2 sm:p-2.5 pb-[max(0.6rem,env(safe-area-inset-bottom))] border-t border-[#e5b869]/25 bg-[#0a0a0a] flex items-center gap-1.5 sm:gap-2 shrink-0 min-w-0"
        >
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            title="Emoji Keyboard"
            className="w-8 h-8 sm:w-9 sm:h-9 p-0 flex items-center justify-center text-zinc-400 hover:text-[#ffd88c] rounded-xl hover:bg-white/10 cursor-pointer transition-colors shrink-0"
          >
            <Smile className="w-4 h-4" />
          </button>

          <input
            ref={inputRef}
            type="text"
            placeholder={isSpectator ? 'Chat as spectator...' : 'Type a message...'}
            value={inputText}
            onChange={(e) => {
              const val = e.target.value;
              setInputText(val);
              if (onTypingChange) {
                onTypingChange(true);
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => {
                  onTypingChange(false);
                }, 2200);
              }
            }}
            maxLength={250}
            className="flex-1 min-w-0 w-0 bg-[#141414] border border-zinc-800 focus:border-[#e5b869] rounded-xl px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none transition-colors"
          />

          <button
            type="submit"
            disabled={!inputText.trim()}
            title="Send Message"
            className="clay-button-primary w-8 sm:w-9 h-8 sm:h-9 sm:px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shrink-0 shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      )}
    </div>
  );
};

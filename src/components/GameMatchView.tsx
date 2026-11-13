import React, { useState, useMemo } from 'react';
import { Chess } from 'chess.js';
import { RoomState, UserProfile, Color } from '../types/chess';
import { BoardView } from './BoardView';
import { PlayerBar } from './PlayerBar';
import { SpectatorIndicator } from './SpectatorIndicator';
import { InMatchControls } from './InMatchControls';
import { ChatDrawer } from './ChatDrawer';
import { DrawOfferModal } from './DrawOfferModal';
import { ResignModal } from './ResignModal';
import { GameResultModal } from './GameResultModal';
import { recordMatch } from '../utils/playerStats';
import { triggerHaptic } from '../utils/telegram';

interface GameMatchViewProps {
  room: RoomState;
  currentUser: UserProfile;
  userRole: 'white' | 'black' | 'spectator' | null;
  unreadChatCount: number;
  onSetChatOpen: (open: boolean) => void;
  onMakeMove: (move: { from: string; to: string; promotion?: string }) => void;
  onOfferDraw: () => void;
  onRespondDraw: (accept: boolean) => void;
  onResign: () => void;
  onSendMessage: (text: string, replyTo?: { id: string; senderName: string; text: string } | null) => void;
  onAddReaction: (messageId: string, emoji: string) => void;
  onReturnToLobby: () => void;
  onRematch: () => void;
  typingUsers?: Record<string, boolean>;
  awayUsers?: Record<string, boolean>;
  onSetTyping?: (isTyping: boolean) => void;
}

export const GameMatchView: React.FC<GameMatchViewProps> = ({
  room,
  currentUser,
  userRole,
  unreadChatCount,
  onSetChatOpen,
  onMakeMove,
  onOfferDraw,
  onRespondDraw,
  onResign,
  onSendMessage,
  onAddReaction,
  onReturnToLobby,
  onRematch,
  typingUsers = {},
  awayUsers = {},
  onSetTyping,
}) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isResignModalOpen, setIsResignModalOpen] = useState(false);
  const [isResultDismissed, setIsResultDismissed] = useState(false);
  const recordedMatchRef = React.useRef<string | null>(null);

  // If a new game or rematch starts, reset dismissal
  React.useEffect(() => {
    if (room.status !== 'finished') {
      setIsResultDismissed(false);
    }
  }, [room.status, room.code]);

  const isSpectator = userRole === 'spectator';
  const isPlayer = !isSpectator;

  // Determine top and bottom players based on user perspective
  const myColor: Color = userRole === 'black' ? 'b' : 'w';
  const bottomPlayer = myColor === 'w' ? room.whitePlayer : room.blackPlayer;
  const topPlayer = myColor === 'w' ? room.blackPlayer : room.whitePlayer;

  const topUserId = topPlayer?.user.id ? String(topPlayer.user.id) : '';
  const bottomUserId = bottomPlayer?.user.id ? String(bottomPlayer.user.id) : '';

  const isTopTyping = Boolean(topUserId && typingUsers[topUserId]);
  const isTopAway = Boolean(topUserId && awayUsers[topUserId]);

  const isBottomTyping = Boolean(bottomUserId && typingUsers[bottomUserId]);
  const isBottomAway = Boolean(bottomUserId && awayUsers[bottomUserId]);

  const topColor: Color = myColor === 'w' ? 'b' : 'w';
  const bottomColor: Color = myColor;

  // Record game in player statistics upon finish
  React.useEffect(() => {
    if (room.status === 'finished' && isPlayer && recordedMatchRef.current !== room.code) {
      recordedMatchRef.current = room.code;
      const isWinner = room.winnerUserId === currentUser.id;
      const isDraw = !room.winnerUserId || room.resolution?.startsWith('draw');
      const result: 'win' | 'loss' | 'draw' = isDraw ? 'draw' : isWinner ? 'win' : 'loss';

      const opponent =
        currentUser.id === room.whitePlayer?.user.id ? room.blackPlayer : room.whitePlayer;

      const durationSec = Math.max(15, Math.floor((Date.now() - room.createdTimestamp) / 1000));
      const movesCount = (room.pgn.match(/\d+\./g) || []).length;
      const totalMoves = Math.max(1, movesCount);
      const avgMoveTime = Math.max(1.5, Math.round((durationSec / (totalMoves * 2)) * 10) / 10);

      recordMatch({
        opponentName: opponent?.user.name || 'Opponent',
        opponentAvatar: opponent?.user.avatarUrl,
        isBot: Boolean(opponent?.user.isBot),
        botDifficulty: room.gameRules.botDifficulty,
        result,
        resolution: room.resolution || 'finished',
        playerColor: myColor,
        totalMoves,
        avgMoveTimeSec: avgMoveTime,
        durationSec,
      });
    }
  }, [room.status, room.code, isPlayer, room.winnerUserId, room.resolution, room.createdTimestamp, room.pgn, currentUser.id, room.whitePlayer, room.blackPlayer, room.gameRules.botDifficulty, myColor]);

  const canMove =
    isPlayer &&
    room.status === 'in_progress' &&
    room.turn === myColor;

  // Calculate captured pieces and material score
  const { whiteCaptured, blackCaptured, whiteAdvantage, blackAdvantage } = useMemo(() => {
    const startCounts: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };
    const currentCountsWhite: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };
    const currentCountsBlack: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };

    try {
      const chess = new Chess(room.fen);
      const board = chess.board();

      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const piece = board[r][c];
          if (!piece || piece.type === 'k') continue;
          if (piece.color === 'w') {
            currentCountsWhite[piece.type] = (currentCountsWhite[piece.type] || 0) + 1;
          } else {
            currentCountsBlack[piece.type] = (currentCountsBlack[piece.type] || 0) + 1;
          }
        }
      }
    } catch {
      // ignore
    }

    const PIECE_VALS: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
    let whiteScore = 0;
    let blackScore = 0;

    const wCaptured: string[] = [];
    const bCaptured: string[] = [];

    for (const [type, start] of Object.entries(startCounts)) {
      const lostByBlack = Math.max(0, start - (currentCountsBlack[type] || 0));
      for (let i = 0; i < lostByBlack; i++) wCaptured.push(type);

      const lostByWhite = Math.max(0, start - (currentCountsWhite[type] || 0));
      for (let i = 0; i < lostByWhite; i++) bCaptured.push(type);

      whiteScore += (currentCountsWhite[type] || 0) * PIECE_VALS[type];
      blackScore += (currentCountsBlack[type] || 0) * PIECE_VALS[type];
    }

    return {
      whiteCaptured: wCaptured,
      blackCaptured: bCaptured,
      whiteAdvantage: Math.max(0, whiteScore - blackScore),
      blackAdvantage: Math.max(0, blackScore - whiteScore),
    };
  }, [room.fen]);

  const topCaptured = topColor === 'w' ? whiteCaptured : blackCaptured;
  const topAdvantage = topColor === 'w' ? whiteAdvantage : blackAdvantage;

  const bottomCaptured = bottomColor === 'w' ? whiteCaptured : blackCaptured;
  const bottomAdvantage = bottomColor === 'w' ? whiteAdvantage : blackAdvantage;

  const [mobileDragOffset, setMobileDragOffset] = useState(0);
  const [lastMovePulseTrigger, setLastMovePulseTrigger] = useState(0);

  const handleShowPreviousMove = () => {
    triggerHaptic('medium');
    setLastMovePulseTrigger((prev) => prev + 1);
  };

  const handleToggleChat = () => {
    const next = !isChatOpen;
    setIsChatOpen(next);
    onSetChatOpen(next);
    if (!next) setMobileDragOffset(0);
  };

  const handleCloseChat = () => {
    setIsChatOpen(false);
    onSetChatOpen(false);
    setMobileDragOffset(0);
  };

  const isDrawOfferedToMe =
    Boolean(room.drawOffer) &&
    room.drawOffer?.offeredByUserId !== currentUser.id &&
    isPlayer &&
    room.status === 'in_progress';

  const isMyDrawPending =
    Boolean(room.drawOffer) &&
    room.drawOffer?.offeredByUserId === currentUser.id &&
    room.status === 'in_progress';

  const opponentPlayer =
    currentUser.id === room.whitePlayer?.user.id ? room.blackPlayer : room.whitePlayer;

  return (
    <div className="w-full flex-1 flex flex-row items-stretch justify-center relative overflow-hidden h-full min-h-0">
      {/* Primary Chess Match Column (Board, Players, Clocks, Controls) */}
      <div
        className={`min-w-0 flex flex-col items-center justify-between h-full overflow-y-auto overflow-x-hidden transition-all duration-300 ${
          isChatOpen
            ? 'w-full sm:w-[33.333vw] px-2 sm:px-3 py-1.5'
            : 'flex-1 max-w-3xl mx-auto px-2 sm:px-4 py-1.5 sm:py-3'
        }`}
      >
        {/* Top Bar with Match Header & Spectator Eye Button */}
        <div className="w-full flex items-center justify-between px-1.5 mb-1 shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="font-mono text-[10px] sm:text-xs uppercase px-2 py-0.5 rounded-lg bg-[#0a160e] border border-[#e5b869]/30 text-[#e6ede7] shadow-sm">
              Room: <strong className="text-[#ffd88c]">{room.code}</strong>
            </span>
            {isSpectator && (
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg bg-[#e5b869]/20 text-[#ffd88c] border border-[#e5b869]/40">
                Spectating
              </span>
            )}
          </div>

          <SpectatorIndicator spectators={room.spectators} />
        </div>

        {/* Top Player (Opponent) */}
        <div className="w-full shrink-0">
          <PlayerBar
            player={topPlayer}
            color={topColor}
            isTurn={room.turn === topColor}
            capturedPieces={topCaptured}
            materialDifference={topAdvantage}
            timerGoing={room.status === 'in_progress' && room.gameRules.timerEnabled}
            compact={isChatOpen}
            isTyping={isTopTyping}
            isAway={isTopAway}
          />
        </div>

        {/* The Authentic Board */}
        <div className="w-full flex justify-center items-center my-auto py-1">
          <BoardView
            fen={room.fen}
            turn={room.turn}
            myColor={myColor}
            canMove={canMove}
            onMakeMove={onMakeMove}
            lastMove={room.lastMove}
            isSpectator={isSpectator}
            pulseLastMoveTrigger={lastMovePulseTrigger}
          />
        </div>

        {/* Bottom Player (Self) */}
        <div className="w-full shrink-0">
          <PlayerBar
            player={bottomPlayer}
            color={bottomColor}
            isTurn={room.turn === bottomColor}
            capturedPieces={bottomCaptured}
            materialDifference={bottomAdvantage}
            timerGoing={room.status === 'in_progress' && room.gameRules.timerEnabled}
            compact={isChatOpen}
            isTyping={isBottomTyping}
            isAway={isBottomAway}
          />
        </div>

        {/* In-Match Option Controls */}
        <div className="w-full mt-1.5 shrink-0">
          <InMatchControls
            isPlayer={isPlayer}
            onOpenResign={() => setIsResignModalOpen(true)}
            onOfferDraw={onOfferDraw}
            onToggleChat={handleToggleChat}
            onShowPreviousMove={handleShowPreviousMove}
            lastMove={room.lastMove}
            isDrawPending={isMyDrawPending}
            unreadChatCount={unreadChatCount}
            gameFinished={room.status === 'finished'}
          />
        </div>
      </div>

      {/* Side-Opening Chat Panel: COVERS 2/3 OF SPACE WHEN OPENED, ZERO GAP ABOVE */}
      {isChatOpen && (
        <>
          {/* Mobile backdrop - instant and zero lag */}
          <div
            onClick={handleCloseChat}
            className="sm:hidden fixed inset-0 z-40 bg-black/70 cursor-pointer"
          />

          {/* Chat Container: Takes 2/3 space (w-[66.666vw]), starts strictly at top-0 (no gap above) */}
          <div className="fixed sm:relative inset-y-0 sm:inset-y-auto sm:top-0 right-0 bottom-0 z-50 sm:z-30 w-[72vw] sm:w-[66.666vw] md:w-[66.666vw] max-w-[80vw] sm:max-w-[66.666vw] shrink-0 h-full max-h-[100dvh] flex flex-col border-l border-[#e5b869]/25 shadow-2xl overflow-hidden bg-[#080808]">
            <ChatDrawer
              isOpen={isChatOpen}
              onClose={handleCloseChat}
              messages={room.chatMessages || []}
              currentUser={currentUser}
              isSpectator={isSpectator}
              pgn={room.pgn}
              onSendMessage={onSendMessage}
              onAddReaction={onAddReaction}
              onDragOffsetChange={setMobileDragOffset}
              onTypingChange={onSetTyping}
              opponentTypingName={isTopTyping ? (topPlayer?.user.name || 'Opponent') : null}
              opponentAwayName={isTopAway ? (topPlayer?.user.name || 'Opponent') : null}
              liveGameInfo={{
                turn: room.turn,
                myColor,
                whiteName: room.whitePlayer?.user.name || 'White',
                blackName: room.blackPlayer?.user.name || 'Black',
                isMyTurn: canMove,
                lastMove: room.lastMove,
              }}
            />
          </div>
        </>
      )}

      {/* Draw Offer Dialog */}
      <DrawOfferModal
        isOpen={isDrawOfferedToMe}
        onAccept={() => onRespondDraw(true)}
        onDecline={() => onRespondDraw(false)}
        offeredByName={opponentPlayer?.user.name || 'Opponent'}
      />

      {/* Resignation Confirmation Dialog */}
      <ResignModal
        isOpen={isResignModalOpen}
        onConfirm={() => {
          setIsResignModalOpen(false);
          onResign();
        }}
        onCancel={() => setIsResignModalOpen(false)}
      />

      {/* Game End Result Modal (Dismissible to inspect final board, chat, and notations) */}
      <GameResultModal
        isOpen={room.status === 'finished' && !isResultDismissed}
        room={room}
        currentUser={currentUser}
        onRematch={onRematch}
        onReturnToLobby={onReturnToLobby}
        onDismiss={() => setIsResultDismissed(true)}
      />

      {/* Persistent Floating Match Review Banner when Result Modal is dismissed */}
      {room.status === 'finished' && isResultDismissed && (
        <div className="fixed bottom-3 inset-x-3 sm:inset-x-auto sm:right-6 sm:bottom-6 z-40 bg-gradient-to-r from-[#181818] via-[#101010] to-[#080808] border-2 border-[#e5b869] rounded-2xl p-3 sm:px-5 sm:py-3.5 shadow-[0_12px_40px_rgba(0,0,0,0.95)] flex items-center justify-between gap-3 backdrop-blur-md animate-fadeIn">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xl sm:text-2xl text-[#ffd88c] shrink-0 font-serif">
              {room.winnerUserId === currentUser.id ? '👑' : room.winnerUserId ? '♟' : '⚖️'}
            </span>
            <div className="min-w-0">
              <span className="text-xs sm:text-sm font-bold text-white block truncate font-serif">
                Match Finished ·{' '}
                <span className="text-[#ffd88c]">
                  {room.winnerUserId === currentUser.id
                    ? 'Victory!'
                    : room.winnerUserId
                    ? 'Defeat'
                    : 'Draw'}
                </span>
              </span>
              <span className="text-[10px] text-zinc-400 block truncate">
                Board & moves reviewable. Chat is active.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsResultDismissed(false)}
              className="clay-button py-1.5 px-3 text-xs text-[#ffd88c] font-bold cursor-pointer"
            >
              Summary
            </button>
            <button
              onClick={onRematch}
              className="clay-button-primary py-1.5 px-3 text-xs font-black cursor-pointer shadow-sm"
            >
              Rematch
            </button>
            <button
              onClick={onReturnToLobby}
              className="clay-button py-1.5 px-2.5 text-xs text-zinc-400 hover:text-white cursor-pointer"
              title="Return to Lobby"
            >
              Exit
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

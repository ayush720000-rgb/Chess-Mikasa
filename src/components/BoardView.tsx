import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess, Square } from 'chess.js';
import { Color } from '../types/chess';
import { BoardTheme, getActiveBoardTheme } from '../utils/boardThemes';

interface BoardViewProps {
  fen: string;
  turn: Color;
  myColor?: Color;
  canMove: boolean;
  onMakeMove: (move: { from: string; to: string; promotion?: string }) => void;
  lastMove?: { from: string; to: string };
  isSpectator?: boolean;
  compact?: boolean;
  pulseLastMoveTrigger?: number;
}

const MOVE_FROM_SQUARE_STYLE: React.CSSProperties = {
  background: 'rgba(246, 207, 131, 0.45)',
  boxShadow: 'inset 0 0 10px rgba(246, 207, 131, 0.6)',
};

const OPTION_SQUARE_STYLE: React.CSSProperties = {
  background: 'radial-gradient(circle, rgba(229, 184, 105, 0.42) 25%, transparent 25%)',
};

const OPTION_BEAT_SQUARE_STYLE: React.CSSProperties = {
  background: 'radial-gradient(circle, rgba(239, 68, 68, 0.55) 65%, transparent 65%)',
};

// Distinct Source Square (Where the piece departed from)
const LAST_MOVE_FROM_STYLE: React.CSSProperties = {
  background: 'radial-gradient(circle at center, rgba(229, 184, 105, 0.42) 25%, rgba(180, 130, 50, 0.25) 90%)',
  boxShadow: 'inset 0 0 0 2px rgba(255, 216, 140, 0.9), inset 0 0 12px rgba(229, 184, 105, 0.65)',
};

// Distinct Destination Square (Where the piece landed)
const LAST_MOVE_TO_STYLE: React.CSSProperties = {
  background: 'radial-gradient(circle at center, rgba(255, 225, 160, 0.65) 30%, rgba(229, 184, 105, 0.45) 85%)',
  boxShadow: 'inset 0 0 0 2.5px #ffffff, 0 0 16px rgba(255, 216, 140, 0.9), inset 0 0 14px rgba(255, 216, 140, 0.85)',
};

// Pulsing Source Square (Triggered on 'Previous Move' click)
const PULSE_LAST_MOVE_FROM_STYLE: React.CSSProperties = {
  background: 'radial-gradient(circle at center, rgba(255, 216, 140, 0.75) 35%, rgba(229, 184, 105, 0.5) 85%)',
  boxShadow: 'inset 0 0 0 3px #ffd88c, 0 0 22px rgba(255, 216, 140, 1), inset 0 0 18px rgba(255, 216, 140, 0.95)',
  transition: 'all 0.25s ease-in-out',
};

// Pulsing Destination Square (Triggered on 'Previous Move' click)
const PULSE_LAST_MOVE_TO_STYLE: React.CSSProperties = {
  background: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.9) 25%, rgba(255, 216, 140, 0.75) 80%)',
  boxShadow: 'inset 0 0 0 3.5px #ffffff, 0 0 28px rgba(255, 216, 140, 1), inset 0 0 22px rgba(255, 216, 140, 1)',
  transition: 'all 0.25s ease-in-out',
};

const CHECK_SQUARE_STYLE: React.CSSProperties = {
  background: 'radial-gradient(circle, rgba(239, 68, 68, 0.95) 25%, rgba(220, 38, 38, 0.4) 65%, transparent 75%)',
  boxShadow: 'inset 0 0 14px rgba(239, 68, 68, 0.8)',
};

export const BoardView: React.FC<BoardViewProps> = ({
  fen,
  turn,
  myColor,
  canMove,
  onMakeMove,
  lastMove,
  isSpectator = false,
  compact = false,
  pulseLastMoveTrigger,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [boardWidth, setBoardWidth] = useState<number>(440);
  const [currentTheme, setCurrentTheme] = useState<BoardTheme>(() => getActiveBoardTheme());

  const [moveFrom, setMoveFrom] = useState<Square | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<Square[]>([]);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);
  const [isPulsing, setIsPulsing] = useState<boolean>(false);

  useEffect(() => {
    if (pulseLastMoveTrigger && pulseLastMoveTrigger > 0) {
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [pulseLastMoveTrigger]);

  // Subscribe to theme updates
  useEffect(() => {
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<BoardTheme>;
      if (customEvent.detail) {
        setCurrentTheme(customEvent.detail);
      }
    };
    window.addEventListener('board_theme_changed', handleThemeChange);
    return () => window.removeEventListener('board_theme_changed', handleThemeChange);
  }, []);

  // ResizeObserver to keep board perfectly sized without distortion or vertical overflow on mobile
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const parentWidth = containerRef.current.clientWidth;
        const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        const isMobile = window.innerWidth < 640;
        // On mobile, reserve space for player bars, clocks, and action controls so board fits cleanly in viewport without page scroll
        const reservedHeight = isMobile ? (compact ? 160 : 210) : 160;
        const availableHeight = Math.max(240, vh - reservedHeight);
        const maxDim = Math.min(parentWidth - 8, availableHeight, 640);
        setBoardWidth(Math.max(240, Math.floor(maxDim)));
      }
    };

    updateSize();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      ro = new ResizeObserver(() => {
        updateSize();
      });
      ro.observe(containerRef.current);
    }

    window.addEventListener('resize', updateSize);
    window.visualViewport?.addEventListener('resize', updateSize);
    return () => {
      window.removeEventListener('resize', updateSize);
      window.visualViewport?.removeEventListener('resize', updateSize);
      if (ro) ro.disconnect();
    };
  }, [compact]);

  const getLegalMoves = (sq: Square): Square[] => {
    try {
      const chess = new Chess(fen);
      const moves = chess.moves({ square: sq, verbose: true });
      return moves.map((m) => m.to as Square);
    } catch {
      return [];
    }
  };

  const checkSquare = useMemo<Square | null>(() => {
    try {
      const chess = new Chess(fen);
      if (chess.inCheck()) {
        const board = chess.board();
        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece && piece.type === 'k' && piece.color === chess.turn()) {
              const file = String.fromCharCode('a'.charCodeAt(0) + c);
              const rank = (8 - r).toString();
              return (file + rank) as Square;
            }
          }
        }
      }
    } catch {
      // ignore
    }
    return null;
  }, [fen]);

  const handleSquareClick = ({ square }: { square: string }) => {
    const sq = square as Square;
    if (!canMove || isSpectator) return;

    try {
      const chess = new Chess(fen);
      const piece = chess.get(sq);

      if (moveFrom) {
        if (possibleMoves.includes(sq)) {
          const movingPiece = chess.get(moveFrom);
          const isPawn = movingPiece && movingPiece.type === 'p';
          const isPromotionRank = sq.endsWith('8') || sq.endsWith('1');

          if (isPawn && isPromotionRank) {
            setPendingPromotion({ from: moveFrom, to: sq });
            return;
          }

          onMakeMove({
            from: moveFrom.toLowerCase(),
            to: sq.toLowerCase(),
          });
          setMoveFrom(null);
          setPossibleMoves([]);
          return;
        }

        if (piece && piece.color === myColor) {
          setMoveFrom(sq);
          setPossibleMoves(getLegalMoves(sq));
          return;
        }

        setMoveFrom(null);
        setPossibleMoves([]);
      } else {
        if (piece && piece.color === myColor) {
          setMoveFrom(sq);
          setPossibleMoves(getLegalMoves(sq));
        }
      }
    } catch {
      setMoveFrom(null);
      setPossibleMoves([]);
    }
  };

  const handlePieceDrop = ({
    sourceSquare,
    targetSquare,
  }: {
    sourceSquare: string;
    targetSquare: string | null;
  }): boolean => {
    if (!targetSquare || !canMove || isSpectator) return false;

    try {
      const chess = new Chess(fen);
      const piece = chess.get(sourceSquare as Square);

      const isPawn = piece && piece.type === 'p';
      const isPromotionRank = targetSquare.endsWith('8') || targetSquare.endsWith('1');

      if (isPawn && isPromotionRank) {
        setPendingPromotion({ from: sourceSquare as Square, to: targetSquare as Square });
        return true;
      }

      const move = chess.move({
        from: sourceSquare.toLowerCase(),
        to: targetSquare.toLowerCase(),
        promotion: 'q',
      });

      if (move) {
        onMakeMove({
          from: sourceSquare.toLowerCase(),
          to: targetSquare.toLowerCase(),
          promotion: isPawn && isPromotionRank ? 'q' : undefined,
        });
        setMoveFrom(null);
        setPossibleMoves([]);
        return true;
      }
    } catch {
      return false;
    }

    return false;
  };

  const handleSelectPromotionPiece = (pieceSymbol: 'q' | 'r' | 'b' | 'n') => {
    if (pendingPromotion) {
      onMakeMove({
        from: pendingPromotion.from.toLowerCase(),
        to: pendingPromotion.to.toLowerCase(),
        promotion: pieceSymbol.toLowerCase(),
      });
      setPendingPromotion(null);
      setMoveFrom(null);
      setPossibleMoves([]);
    }
  };

  // Build custom square styles matching exact original theme (memoized to eliminate 64-square canvas rerender thrashing)
  const customSquareStyles = useMemo<Record<string, React.CSSProperties>>(() => {
    const styles: Record<string, React.CSSProperties> = {};

    if (lastMove?.from && lastMove?.to) {
      styles[lastMove.from] = isPulsing ? PULSE_LAST_MOVE_FROM_STYLE : LAST_MOVE_FROM_STYLE;
      styles[lastMove.to] = isPulsing ? PULSE_LAST_MOVE_TO_STYLE : LAST_MOVE_TO_STYLE;
    }

    if (checkSquare) {
      styles[checkSquare] = CHECK_SQUARE_STYLE;
    }

    if (moveFrom) {
      styles[moveFrom] = MOVE_FROM_SQUARE_STYLE;
    }

    if (possibleMoves.length > 0) {
      try {
        const chess = new Chess(fen);
        for (const sq of possibleMoves) {
          const pieceOnSquare = chess.get(sq);
          if (pieceOnSquare) {
            styles[sq] = OPTION_BEAT_SQUARE_STYLE;
          } else {
            styles[sq] = OPTION_SQUARE_STYLE;
          }
        }
      } catch {
        // ignore
      }
    }

    return styles;
  }, [fen, lastMove?.from, lastMove?.to, isPulsing, checkSquare, moveFrom, possibleMoves]);

  const orientation = myColor === 'b' ? 'black' : 'white';

  const darkSquareStyle = useMemo(() => ({ backgroundColor: currentTheme.darkSquare }), [currentTheme.darkSquare]);
  const lightSquareStyle = useMemo(() => ({ backgroundColor: currentTheme.lightSquare }), [currentTheme.lightSquare]);

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center justify-center w-full my-0.5 sm:my-1 relative select-none"
    >
      {/* Handcrafted Master Tournament Table Bezel */}
      <div
        style={{
          width: boardWidth + 12,
        }}
        className="p-1.5 sm:p-2 rounded-2xl bg-gradient-to-br from-[#241309] via-[#150b05] to-[#0a0502] border border-[#e5b869]/45 shadow-[0_18px_50px_rgba(0,0,0,0.95)] relative group transition-all duration-300"
      >
        {/* Brass L-Bracket Corners with Screw Rivets */}
        <div className="absolute top-1 left-1 w-3.5 h-3.5 border-t-2 border-l-2 border-[#ffd88c] pointer-events-none rounded-tl-sm flex items-start justify-start p-0.5">
          <div className="brass-rivet" />
        </div>
        <div className="absolute top-1 right-1 w-3.5 h-3.5 border-t-2 border-r-2 border-[#ffd88c] pointer-events-none rounded-tr-sm flex items-start justify-end p-0.5">
          <div className="brass-rivet" />
        </div>
        <div className="absolute bottom-1 left-1 w-3.5 h-3.5 border-b-2 border-l-2 border-[#ffd88c] pointer-events-none rounded-bl-sm flex items-end justify-start p-0.5">
          <div className="brass-rivet" />
        </div>
        <div className="absolute bottom-1 right-1 w-3.5 h-3.5 border-b-2 border-r-2 border-[#ffd88c] pointer-events-none rounded-br-sm flex items-end justify-end p-0.5">
          <div className="brass-rivet" />
        </div>

        {/* The Inner Playing Field */}
        <div
          style={{
            width: boardWidth,
            height: boardWidth,
            borderColor: currentTheme.borderColor,
            boxShadow: `inset 0 0 10px rgba(0,0,0,0.7), 0 0 0 1px ${currentTheme.ringColor}`,
          }}
          className="rounded-xl overflow-hidden border-2 relative transition-all duration-300 mx-auto"
        >
          <Chessboard
            options={{
              position: fen,
              boardOrientation: orientation,
              allowDragging: canMove && !isSpectator,
              onPieceDrop: handlePieceDrop,
              onSquareClick: handleSquareClick,
              squareStyles: customSquareStyles,
              darkSquareStyle,
              lightSquareStyle,
              animationDurationInMs: 200,
            }}
          />

          {/* Promotion Dialog */}
          {pendingPromotion && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-30 flex items-center justify-center">
              <div className="clay-card p-4 text-center border border-white/20 shadow-2xl">
                <span className="text-xs font-bold text-white mb-2 block uppercase tracking-wider">
                  Pawn Promotion
                </span>
                <div className="flex items-center gap-2">
                  {[
                    { symbol: 'q', name: 'Queen', icon: myColor === 'b' ? '♛' : '♕' },
                    { symbol: 'r', name: 'Rook', icon: myColor === 'b' ? '♜' : '♖' },
                    { symbol: 'b', name: 'Bishop', icon: myColor === 'b' ? '♝' : '♗' },
                    { symbol: 'n', name: 'Knight', icon: myColor === 'b' ? '♞' : '♘' },
                  ].map((item) => (
                    <button
                      key={item.symbol}
                      onClick={() => handleSelectPromotionPiece(item.symbol as 'q' | 'r' | 'b' | 'n')}
                      className="w-12 h-12 rounded-xl bg-white/10 hover:bg-[#d4a373] text-2xl flex items-center justify-center cursor-pointer transition-colors shadow-md text-white hover:text-black"
                      title={item.name}
                    >
                      {item.icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Engraved Brass Maker's Mark Plaque */}
        <div className="mt-1 flex items-center justify-between px-2 text-[9px] font-mono text-zinc-400 select-none">
          <div className="flex items-center gap-1 opacity-75">
            <span className="text-[#ffd88c] font-serif">♚</span>
            <span className="tracking-widest uppercase text-[8px] text-[#ffd88c]">Staunton Master</span>
          </div>
          <div className="wood-inlay-strip mx-3 flex-1" />
          <div className="text-[8px] text-zinc-400 font-serif tracking-wider uppercase opacity-85">
            {currentTheme.name.split(' ')[0]} Edition
          </div>
        </div>
      </div>
    </div>
  );
};

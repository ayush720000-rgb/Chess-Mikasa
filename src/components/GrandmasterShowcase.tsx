import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Chess } from 'chess.js';
import { BookOpen, ChevronLeft, ChevronRight, Play, Pause, Swords, Sparkles, Crown } from 'lucide-react';
import { triggerHaptic } from '../utils/telegram';

interface OpeningDef {
  id: string;
  name: string;
  eco: string;
  moves: string[];
  description: string;
  keyIdea: string;
  whiteWinRate: number;
  blackWinRate: number;
  drawRate: number;
}

const FAMOUS_OPENINGS: OpeningDef[] = [
  {
    id: 'sicilian',
    name: 'Sicilian Defense: Najdorf',
    eco: 'B90',
    moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'],
    description: 'The weapon of world champions Garry Kasparov and Bobby Fischer. Highly dynamic and aggressive counter-attacking chess.',
    keyIdea: 'Fights for central initiative from move one with the c-pawn, creating asymmetric imbalances.',
    whiteWinRate: 38,
    drawRate: 32,
    blackWinRate: 30,
  },
  {
    id: 'queens_gambit',
    name: "Queen's Gambit Declined",
    eco: 'D30',
    moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e3', 'O-O'],
    description: 'The pinnacle of classical chess solidity. Battle for control of central squares with pawn structures.',
    keyIdea: 'White offers the c4 wing pawn to gain superior central control; Black resolutely defends the d5 bastion.',
    whiteWinRate: 40,
    drawRate: 36,
    blackWinRate: 24,
  },
  {
    id: 'ruy_lopez',
    name: 'Ruy Lopez: Berlin Defense',
    eco: 'C65',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6', 'O-O', 'Nxe4', 'd4', 'Nd6'],
    description: 'Known as the "Berlin Wall" which Kramnik used to dethrone Kasparov. Legendary endgame toughness.',
    keyIdea: 'Black neutralizes White’s opening pressure, transitioning to an impenetrable fortress.',
    whiteWinRate: 34,
    drawRate: 45,
    blackWinRate: 21,
  },
  {
    id: 'kings_indian',
    name: "King's Indian Defense",
    eco: 'E60',
    moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O'],
    description: 'A fierce hypermodern counter-strike. Black concedes space early to launch a devastating kingside pawn storm.',
    keyIdea: 'Fianchettoed bishop controls the long diagonal while Black readies an explosive ...e5 and ...f5 break.',
    whiteWinRate: 42,
    drawRate: 28,
    blackWinRate: 30,
  },
];

const PIECE_UNICODE: Record<string, string> = {
  p: '♟',
  r: '♜',
  n: '♞',
  b: '♝',
  q: '♛',
  k: '♚',
  P: '♙',
  R: '♖',
  N: '♘',
  B: '♗',
  Q: '♕',
  K: '♔',
};

interface GrandmasterShowcaseProps {
  onPlayBotMatch?: () => void;
}

export const GrandmasterShowcase: React.FC<GrandmasterShowcaseProps> = ({ onPlayBotMatch }) => {
  const [selectedOpeningIndex, setSelectedOpeningIndex] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const activeOpening = FAMOUS_OPENINGS[selectedOpeningIndex];

  // Compute chess board state at current step
  const { board, lastMoveSAN } = useMemo(() => {
    const chess = new Chess();
    let lastSAN = '';
    for (let i = 0; i < currentStep && i < activeOpening.moves.length; i++) {
      const san = activeOpening.moves[i];
      try {
        chess.move(san);
        lastSAN = san;
      } catch {
        // ignore
      }
    }
    return {
      board: chess.board(),
      lastMoveSAN: lastSAN,
    };
  }, [selectedOpeningIndex, currentStep, activeOpening.moves]);

  // Auto-play timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying) {
      timer = setTimeout(() => {
        if (currentStep < activeOpening.moves.length) {
          setCurrentStep((prev) => prev + 1);
        } else {
          setIsPlaying(false);
        }
      }, 950);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentStep, activeOpening.moves.length]);

  const handleSelectOpening = (idx: number) => {
    triggerHaptic('light');
    setSelectedOpeningIndex(idx);
    setCurrentStep(0);
    setIsPlaying(false);
  };

  const handlePrevStep = () => {
    triggerHaptic('light');
    setIsPlaying(false);
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  const handleNextStep = () => {
    triggerHaptic('light');
    setIsPlaying(false);
    setCurrentStep((prev) => Math.min(activeOpening.moves.length, prev + 1));
  };

  const toggleAutoPlay = () => {
    triggerHaptic('medium');
    if (currentStep >= activeOpening.moves.length) {
      setCurrentStep(0);
    }
    setIsPlaying((prev) => !prev);
  };

  return (
    <div className="w-full rounded-2xl bg-gradient-to-br from-[#161616] via-[#0f0f0f] to-[#070707] border-2 border-[#e5b869]/40 p-4 sm:p-6 shadow-[0_12px_45px_rgba(0,0,0,0.95)] relative overflow-hidden">
      {/* Checkered Inlay Trim */}
      <div className="absolute top-0 inset-x-0 h-1.5 chess-checkered-border opacity-70" />

      {/* Brass Corner Accents */}
      <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-[#ffd88c]/70 pointer-events-none rounded-tl-sm flex items-start justify-start p-0.5">
        <div className="brass-rivet" />
      </div>
      <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-[#ffd88c]/70 pointer-events-none rounded-tr-sm flex items-start justify-end p-0.5">
        <div className="brass-rivet" />
      </div>

      {/* Header with Staunton Seal */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2a1b0c] to-[#120a04] border border-[#e5b869]/50 flex items-center justify-center text-lg text-[#ffd88c] shadow-md">
            ♟
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-serif font-black tracking-wide text-white">
                Grandmaster Theory & Opening Atelier
              </h3>
              <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-[#1e1e1e] text-[#ffd88c] border border-[#e5b869]/40">
                ECO {activeOpening.eco}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Interactive grandmaster masterclass · Review tactical setups and opening lines
            </p>
          </div>
        </div>

        {/* Staunton Pattern Inlay Badge */}
        <div className="wood-plaque px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-[10px] text-[#ffd88c] font-serif shadow-sm shrink-0 border border-[#e5b869]/40">
          <Crown className="w-3 h-3 text-[#ffd88c]" />
          <span>FIDE Staunton No. 5</span>
        </div>
      </div>

      {/* Opening Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {FAMOUS_OPENINGS.map((op, idx) => {
          const isSelected = idx === selectedOpeningIndex;
          return (
            <button
              key={op.id}
              onClick={() => handleSelectOpening(idx)}
              className={`p-2 rounded-xl text-left transition-all cursor-pointer border ${
                isSelected
                  ? 'bg-gradient-to-br from-[#291e10] to-[#140e06] border-[#ffd88c] shadow-[0_0_12px_rgba(229,184,105,0.4)] text-white'
                  : 'bg-[#111111] hover:bg-[#1a1a1a] border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-[#ffd88c]">{op.eco}</span>
                {isSelected && <Sparkles className="w-3 h-3 text-[#ffd88c]" />}
              </div>
              <span className="text-xs font-serif font-bold truncate block mt-0.5">
                {op.name.split(':')[0]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Showcase Layout: Board on left, Theory on right */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        {/* Left Column: Interactive Mini Board with Coordinate Inlays */}
        <div className="md:col-span-6 lg:col-span-5 flex flex-col items-center">
          {/* Wood Bezel Border with Brass Rivets */}
          <div className="p-2 sm:p-2.5 rounded-2xl bg-gradient-to-b from-[#251509] via-[#1a0e06] to-[#0d0703] border-2 border-[#e5b869]/50 shadow-[0_8px_30px_rgba(0,0,0,0.95)] relative">
            {/* 8x8 Mini Chessboard */}
            <div className="w-[240px] h-[240px] sm:w-[260px] sm:h-[260px] grid grid-cols-8 grid-rows-8 border border-[#3d2410] rounded-lg overflow-hidden shadow-inner">
              {board.map((row, r) =>
                row.map((sq, c) => {
                  const isLight = (r + c) % 2 === 0;
                  const isDarkSquare = !isLight;
                  return (
                    <div
                      key={`${r}-${c}`}
                      className={`w-full h-full flex items-center justify-center relative select-none ${
                        isLight ? 'bg-[#d8c29d]' : 'bg-[#85582b]'
                      }`}
                    >
                      {/* Piece display */}
                      {sq && (
                        <span
                          className={`text-xl sm:text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] transition-all ${
                            sq.color === 'w' ? 'text-[#fff8ec]' : 'text-[#1a130f]'
                          }`}
                        >
                          {PIECE_UNICODE[sq.color === 'w' ? sq.type.toUpperCase() : sq.type]}
                        </span>
                      )}

                      {/* Rank / File notations on edges */}
                      {c === 0 && (
                        <span
                          className={`absolute top-0.5 left-0.5 text-[8px] font-mono font-bold leading-none select-none opacity-60 ${
                            isLight ? 'text-[#85582b]' : 'text-[#d8c29d]'
                          }`}
                        >
                          {8 - r}
                        </span>
                      )}
                      {r === 7 && (
                        <span
                          className={`absolute bottom-0.5 right-0.5 text-[8px] font-mono font-bold leading-none select-none opacity-60 ${
                            isLight ? 'text-[#85582b]' : 'text-[#d8c29d]'
                          }`}
                        >
                          {String.fromCharCode(97 + c)}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Step Controls underneath Board */}
            <div className="flex items-center justify-between mt-2.5 px-1 text-xs text-zinc-300">
              <button
                onClick={handlePrevStep}
                disabled={currentStep === 0}
                className="clay-button p-1.5 text-xs rounded-lg disabled:opacity-30 cursor-pointer text-[#ffd88c]"
                title="Previous Move"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={toggleAutoPlay}
                className="clay-button-primary px-3 py-1 text-xs rounded-lg flex items-center gap-1 font-bold cursor-pointer"
              >
                {isPlaying ? <Pause className="w-3 h-3 text-black" /> : <Play className="w-3 h-3 text-black" />}
                <span>{isPlaying ? 'Pause' : 'Play Moves'}</span>
              </button>

              <button
                onClick={handleNextStep}
                disabled={currentStep >= activeOpening.moves.length}
                className="clay-button p-1.5 text-xs rounded-lg disabled:opacity-30 cursor-pointer text-[#ffd88c]"
                title="Next Move"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Move List, Theory Notes & Bot Practice */}
        <div className="md:col-span-6 lg:col-span-7 flex flex-col justify-between h-full gap-3 text-left">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="w-4 h-4 text-[#ffd88c]" />
              <h4 className="text-base font-serif font-bold text-white">
                {activeOpening.name}
              </h4>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              {activeOpening.description}
            </p>
          </div>

          {/* Moves Strip */}
          <div>
            <div className="text-[10px] font-mono uppercase text-[#ffd88c] font-bold mb-1.5">
              Opening Sequence ({currentStep} / {activeOpening.moves.length} moves)
            </div>
            <div className="flex flex-wrap gap-1.5 font-mono text-xs">
              {activeOpening.moves.map((mv, idx) => {
                const moveNum = Math.floor(idx / 2) + 1;
                const isWhiteMove = idx % 2 === 0;
                const isCurrent = idx + 1 === currentStep;
                const isPast = idx < currentStep;

                return (
                  <button
                    key={idx}
                    onClick={() => {
                      triggerHaptic('light');
                      setIsPlaying(false);
                      setCurrentStep(idx + 1);
                    }}
                    className={`px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-[#ffd88c] text-black font-extrabold border-white shadow-[0_0_8px_#ffd88c]'
                        : isPast
                        ? 'bg-[#1c1c1c] text-[#ffd88c] border-[#e5b869]/30'
                        : 'bg-[#0f0f0f] text-zinc-500 border-zinc-800'
                    }`}
                  >
                    {isWhiteMove && <span className="opacity-60 mr-1">{moveNum}.</span>}
                    <span>{mv}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Master Tactical Idea Card */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-[#141414] to-[#0a0a0a] border border-[#e5b869]/30">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#ffd88c] block font-mono">
              ★ Grandmaster Strategy
            </span>
            <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
              {activeOpening.keyIdea}
            </p>
            {/* Winrate stats bar */}
            <div className="mt-2.5">
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mb-1">
                <span>White Win: {activeOpening.whiteWinRate}%</span>
                <span>Draw: {activeOpening.drawRate}%</span>
                <span>Black Win: {activeOpening.blackWinRate}%</span>
              </div>
              <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden flex">
                <div style={{ width: `${activeOpening.whiteWinRate}%` }} className="bg-white" />
                <div style={{ width: `${activeOpening.drawRate}%` }} className="bg-zinc-500" />
                <div style={{ width: `${activeOpening.blackWinRate}%` }} className="bg-[#ffd88c]" />
              </div>
            </div>
          </div>

          {/* Practice Against Bot CTA */}
          {onPlayBotMatch && (
            <div className="pt-1">
              <button
                onClick={() => {
                  triggerHaptic('medium');
                  onPlayBotMatch();
                }}
                className="w-full clay-button-primary py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-md hover:brightness-110"
              >
                <Swords className="w-4 h-4 text-black stroke-[2.5]" />
                <span>Practice Opening vs 2,850+ Stockfish Bot</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

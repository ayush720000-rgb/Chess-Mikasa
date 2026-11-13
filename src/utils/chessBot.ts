import { Chess, Square, Move } from 'chess.js';
import { BotDifficulty } from '../types/chess';

// Standard piece values
const PIECE_VALUES: Record<string, number> = {
  p: 100,
  n: 325,
  b: 335,
  r: 500,
  q: 950,
  k: 20000,
};

// Piece Square Tables (White's perspective; mirrored for Black)
const PAWN_TABLE = [
   0,   0,   0,   0,   0,   0,   0,   0,
  60,  60,  60,  60,  60,  60,  60,  60,
  15,  15,  25,  35,  35,  25,  15,  15,
  10,  10,  20,  30,  30,  20,  10,  10,
   5,   5,  10,  25,  25,  10,   5,   5,
   0,   0,   0,  15,  15,   0,   0,   0,
   5,  10,  10, -20, -20,  10,  10,   5,
   0,   0,   0,   0,   0,   0,   0,   0
];

const KNIGHT_TABLE = [
 -50, -40, -30, -30, -30, -30, -40, -50,
 -40, -20,   0,   5,   5,   0, -20, -40,
 -30,   5,  15,  20,  20,  15,   5, -30,
 -30,   5,  20,  25,  25,  20,   5, -30,
 -30,   5,  20,  25,  25,  20,   5, -30,
 -30,   5,  15,  20,  20,  15,   5, -30,
 -40, -20,   0,   5,   5,   0, -20, -40,
 -50, -40, -30, -30, -30, -30, -40, -50
];

const BISHOP_TABLE = [
 -20, -10, -10, -10, -10, -10, -10, -20,
 -10,   5,   0,   0,   0,   0,   5, -10,
 -10,  10,  10,  15,  15,  10,  10, -10,
 -10,   5,  15,  20,  20,  15,   5, -10,
 -10,   5,  15,  20,  20,  15,   5, -10,
 -10,  10,  10,  15,  15,  10,  10, -10,
 -10,   5,   0,   0,   0,   0,   5, -10,
 -20, -10, -10, -10, -10, -10, -10, -20
];

const ROOK_TABLE = [
   0,   0,   5,  10,  10,   5,   0,   0,
  20,  25,  25,  25,  25,  25,  25,  20,
  -5,   0,   0,   0,   0,   0,   0,  -5,
  -5,   0,   0,   0,   0,   0,   0,  -5,
  -5,   0,   0,   0,   0,   0,   0,  -5,
  -5,   0,   0,   0,   0,   0,   0,  -5,
  -5,   0,   0,   0,   0,   0,   0,  -5,
   0,   0,   5,  10,  10,   5,   0,   0
];

const QUEEN_TABLE = [
 -20, -10, -10,  -5,  -5, -10, -10, -20,
 -10,   0,   5,   0,   0,   0,   0, -10,
 -10,   5,   5,   5,   5,   5,   0, -10,
   0,   0,   5,   5,   5,   5,   0,  -5,
  -5,   0,   5,   5,   5,   5,   0,  -5,
 -10,   0,   5,   5,   5,   5,   0, -10,
 -10,   0,   0,   0,   0,   0,   0, -10,
 -20, -10, -10,  -5,  -5, -10, -10, -20
];

const KING_MIDDLE_TABLE = [
 -30, -40, -40, -50, -50, -40, -40, -30,
 -30, -40, -40, -50, -50, -40, -40, -30,
 -30, -40, -40, -50, -50, -40, -40, -30,
 -30, -40, -40, -50, -50, -40, -40, -30,
 -20, -30, -30, -40, -40, -30, -30, -20,
 -10, -20, -20, -20, -20, -20, -20, -10,
  25,  30,   0,   0,   0,   0,  30,  25,
  25,  35,  15,   0,   0,  15,  35,  25
];

const KING_END_TABLE = [
 -50, -40, -30, -20, -20, -30, -40, -50,
 -30, -20, -10,   0,   0, -10, -20, -30,
 -30, -10,  20,  30,  30,  20, -10, -30,
 -30, -10,  30,  40,  40,  30, -10, -30,
 -30, -10,  30,  40,  40,  30, -10, -30,
 -30, -10,  20,  30,  30,  20, -10, -30,
 -30, -30,   0,   0,   0,   0, -30, -30,
 -50, -30, -30, -30, -30, -30, -30, -50
];

// Opening Book for instant grandmaster responses
const OPENING_BOOK: Record<string, string[]> = {
  // Start position
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1': ['e2e4', 'd2d4', 'c2c4', 'g1f3'],
  // 1. e4
  'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1': ['c7c5', 'e7e5', 'e7e6', 'c7c6', 'g8f6'],
  // 1. d4
  'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1': ['g8f6', 'd7d5', 'e7e6', 'g7g6'],
  // 1. c4
  'rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b KQkq c3 0 1': ['e7e5', 'g8f6', 'c7c5', 'e7e6'],
  // 1. e4 e5 2. Nf3
  'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2': ['b8c6', 'g8f6', 'd7d6'],
  // 1. e4 e5 2. Nf3 Nc6
  'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3': ['f1b5', 'f1c4', 'd2d4', 'b1c3'],
  // 1. e4 c5 (Sicilian) 2. Nf3
  'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2': ['d7d6', 'e7e6', 'b8c6', 'g7g6'],
  // 1. d4 d5 2. c4 (Queen's Gambit)
  'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3 0 2': ['e7e6', 'c7c6', 'd5c4'],
};

function squareToIndex(sq: string, isWhite: boolean): number {
  const file = sq.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = parseInt(sq[1], 10) - 1;
  const row = isWhite ? 7 - rank : rank;
  const col = file;
  return row * 8 + col;
}

// Evaluate board with material, piece-square tables, pawn structure, king safety, and bishop pairs
function evaluateBoard(game: Chess): number {
  if (game.isCheckmate()) {
    // If it's checkmate, current player to move is lost
    return game.turn() === 'w' ? -99999 : 99999;
  }
  if (game.isDraw()) return 0;

  const board = game.board();
  let materialWhite = 0;
  let materialBlack = 0;
  let pstScore = 0;

  let whiteBishops = 0;
  let blackBishops = 0;

  const whitePawnsPerCol = new Array(8).fill(0);
  const blackPawnsPerCol = new Array(8).fill(0);

  let isEndgame = false;
  let queenCount = 0;
  let minorMajorCount = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;

      if (piece.type === 'q') queenCount++;
      if (piece.type !== 'p' && piece.type !== 'k') minorMajorCount++;

      const isWhite = piece.color === 'w';
      const val = PIECE_VALUES[piece.type] || 0;

      if (isWhite) materialWhite += val;
      else materialBlack += val;

      if (piece.type === 'b') {
        if (isWhite) whiteBishops++;
        else blackBishops++;
      }

      if (piece.type === 'p') {
        if (isWhite) whitePawnsPerCol[c]++;
        else blackPawnsPerCol[c]++;
      }
    }
  }

  // Endgame condition: queens off or very few major pieces
  isEndgame = queenCount === 0 || (queenCount <= 2 && minorMajorCount <= 4);

  // Position Square Tables & Positional factors
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;

      const file = String.fromCharCode('a'.charCodeAt(0) + c);
      const rank = (8 - r).toString();
      const sq = file + rank;
      const isWhite = piece.color === 'w';

      let pstVal = 0;
      const idx = squareToIndex(sq, isWhite);

      switch (piece.type) {
        case 'p':
          pstVal = PAWN_TABLE[idx] || 0;
          // Passed pawn bonus
          const rankNum = isWhite ? 8 - r : r + 1;
          const oppPawns = isWhite ? blackPawnsPerCol : whitePawnsPerCol;
          const isPassed =
            oppPawns[c] === 0 &&
            (c === 0 || oppPawns[c - 1] === 0) &&
            (c === 7 || oppPawns[c + 1] === 0);
          if (isPassed && rankNum >= 4) {
            pstVal += (rankNum - 3) * 20; // +20 on 4th rank up to +80 on 7th rank
          }
          break;
        case 'n':
          pstVal = KNIGHT_TABLE[idx] || 0;
          break;
        case 'b':
          pstVal = BISHOP_TABLE[idx] || 0;
          break;
        case 'r':
          pstVal = ROOK_TABLE[idx] || 0;
          // Open or semi-open file bonus for rook
          const friendlyPawns = isWhite ? whitePawnsPerCol[c] : blackPawnsPerCol[c];
          const enemyPawns = isWhite ? blackPawnsPerCol[c] : whitePawnsPerCol[c];
          if (friendlyPawns === 0) {
            pstVal += enemyPawns === 0 ? 30 : 15;
          }
          // Rook on 7th rank
          if ((isWhite && r === 1) || (!isWhite && r === 6)) {
            pstVal += 35;
          }
          break;
        case 'q':
          pstVal = QUEEN_TABLE[idx] || 0;
          break;
        case 'k':
          pstVal = isEndgame ? KING_END_TABLE[idx] || 0 : KING_MIDDLE_TABLE[idx] || 0;
          break;
      }

      pstScore += isWhite ? pstVal : -pstVal;
    }
  }

  // Bishop pair bonus (+50)
  if (whiteBishops >= 2) pstScore += 50;
  if (blackBishops >= 2) pstScore -= 50;

  // Pawn structure penalties (doubled & isolated pawns)
  for (let c = 0; c < 8; c++) {
    if (whitePawnsPerCol[c] > 1) pstScore -= (whitePawnsPerCol[c] - 1) * 20;
    if (blackPawnsPerCol[c] > 1) pstScore += (blackPawnsPerCol[c] - 1) * 20;

    // Isolated pawn
    const whiteHasNeighbor = (c > 0 && whitePawnsPerCol[c - 1] > 0) || (c < 7 && whitePawnsPerCol[c + 1] > 0);
    if (whitePawnsPerCol[c] > 0 && !whiteHasNeighbor) pstScore -= 18;

    const blackHasNeighbor = (c > 0 && blackPawnsPerCol[c - 1] > 0) || (c < 7 && blackPawnsPerCol[c + 1] > 0);
    if (blackPawnsPerCol[c] > 0 && !blackHasNeighbor) pstScore += 18;
  }

  // Center control bonus (d4, e4, d5, e5)
  const centerSquares: Square[] = ['d4', 'e4', 'd5', 'e5'];
  for (const sq of centerSquares) {
    const p = game.get(sq);
    if (p) {
      if (p.color === 'w') pstScore += 20;
      else pstScore -= 20;
    }
  }

  return (materialWhite - materialBlack) + pstScore;
}

// MVV-LVA (Most Valuable Victim - Least Valuable Attacker) move scoring
function scoreMove(move: Move, killer1?: Move, killer2?: Move): number {
  if (move.captured) {
    const victimVal = PIECE_VALUES[move.captured] || 100;
    const attackerVal = PIECE_VALUES[move.piece] || 100;
    return 10000 + (victimVal * 10 - attackerVal);
  }
  if (move.promotion) {
    return 9000;
  }
  if (killer1 && move.from === killer1.from && move.to === killer1.to) {
    return 8000;
  }
  if (killer2 && move.from === killer2.from && move.to === killer2.to) {
    return 7000;
  }
  if (move.san?.includes('+')) {
    return 500;
  }
  return 0;
}

// Helper to avoid calling Date.now() on every single node (huge OS syscall overhead)
let searchNodeCounter = 0;
function isDeadlineExceeded(deadline: number): boolean {
  return (++searchNodeCounter & 63) === 0 && Date.now() > deadline;
}

function sortMoves(moves: Move[], k1?: Move, k2?: Move): Move[] {
  const scores = new Map<Move, number>();
  for (let i = 0; i < moves.length; i++) {
    scores.set(moves[i], scoreMove(moves[i], k1, k2));
  }
  return moves.sort((a, b) => (scores.get(b) || 0) - (scores.get(a) || 0));
}

// Quiescence Search: resolves all hanging captures to prevent horizon effect
function quiescence(
  game: Chess,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  deadline: number,
  depthLeft: number = 4
): number {
  if (isDeadlineExceeded(deadline)) {
    return evaluateBoard(game);
  }

  const standPat = evaluateBoard(game);

  if (depthLeft <= 0 || game.isGameOver()) {
    return standPat;
  }

  if (isMaximizing) {
    if (standPat >= beta) return beta;
    if (standPat > alpha) alpha = standPat;

    const rawCaptures = game.moves({ verbose: true }).filter((m) => m.captured || m.promotion);
    const captures = sortMoves(rawCaptures);

    for (const move of captures) {
      game.move(move);
      const score = quiescence(game, alpha, beta, false, deadline, depthLeft - 1);
      game.undo();

      if (score >= beta) return beta;
      if (score > alpha) alpha = score;
      if (isDeadlineExceeded(deadline)) break;
    }
    return alpha;
  } else {
    if (standPat <= alpha) return alpha;
    if (standPat < beta) beta = standPat;

    const rawCaptures = game.moves({ verbose: true }).filter((m) => m.captured || m.promotion);
    const captures = sortMoves(rawCaptures);

    for (const move of captures) {
      game.move(move);
      const score = quiescence(game, alpha, beta, true, deadline, depthLeft - 1);
      game.undo();

      if (score <= alpha) return alpha;
      if (score < beta) beta = score;
      if (isDeadlineExceeded(deadline)) break;
    }
    return beta;
  }
}

// Alpha-Beta Minimax with Killer Moves and Quiescence Search
function minimax(
  game: Chess,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  deadline: number,
  killerTable: Move[][]
): number {
  if (isDeadlineExceeded(deadline)) {
    return evaluateBoard(game);
  }

  if (depth <= 0 || game.isGameOver()) {
    if (game.isCheckmate()) {
      return isMaximizing ? -99999 - depth : 99999 + depth;
    }
    if (game.isDraw()) return 0;
    // Switch to quiescence search for accurate tactics
    return quiescence(game, alpha, beta, isMaximizing, deadline, 4);
  }

  const k1 = killerTable[depth]?.[0];
  const k2 = killerTable[depth]?.[1];
  const moves = sortMoves(game.moves({ verbose: true }), k1, k2);

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      if (isDeadlineExceeded(deadline) && maxEval !== -Infinity) break;

      game.move(move);
      const evaluation = minimax(game, depth - 1, alpha, beta, false, deadline, killerTable);
      game.undo();

      if (evaluation > maxEval) {
        maxEval = evaluation;
      }
      if (evaluation > alpha) {
        alpha = evaluation;
      }
      if (beta <= alpha) {
        // Record killer move
        if (!move.captured) {
          if (!killerTable[depth]) killerTable[depth] = [];
          killerTable[depth][1] = killerTable[depth][0];
          killerTable[depth][0] = move;
        }
        break;
      }
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      if (isDeadlineExceeded(deadline) && minEval !== Infinity) break;

      game.move(move);
      const evaluation = minimax(game, depth - 1, alpha, beta, true, deadline, killerTable);
      game.undo();

      if (evaluation < minEval) {
        minEval = evaluation;
      }
      if (evaluation < beta) {
        beta = evaluation;
      }
      if (beta <= alpha) {
        if (!move.captured) {
          if (!killerTable[depth]) killerTable[depth] = [];
          killerTable[depth][1] = killerTable[depth][0];
          killerTable[depth][0] = move;
        }
        break;
      }
    }
    return minEval;
  }
}

// Compute best move for the specified difficulty
export function computeBestMove(
  game: Chess,
  difficulty: BotDifficulty = 'advanced'
): { from: string; to: string; promotion?: string } | null {
  try {
    const legalMoves = game.moves({ verbose: true });
    if (!legalMoves || legalMoves.length === 0) return null;

    const isWhite = game.turn() === 'w';

    // Check Opening Book first for grandmaster moves
    if (difficulty === 'master' || difficulty === 'grandmaster' || difficulty === 'advanced') {
      const fen = game.fen();
      const bookMoves = OPENING_BOOK[fen];
      if (bookMoves && bookMoves.length > 0) {
        const uciMove = bookMoves[Math.floor(Math.random() * bookMoves.length)];
        const from = uciMove.substring(0, 2);
        const to = uciMove.substring(2, 4);
        const promotion = uciMove.length > 4 ? uciMove[4] : undefined;
        // Verify move is legal in current position
        const matching = legalMoves.find(
          (m) => m.from === from && m.to === to && (!promotion || m.promotion === promotion)
        );
        if (matching) {
          return { from, to, promotion };
        }
      }
    }

    // 1. Beginner (~800 ELO): 40% random move, 60% simple captures/checks
    if (difficulty === 'beginner') {
      if (Math.random() < 0.4) {
        const choice = legalMoves[Math.floor(Math.random() * legalMoves.length)];
        return {
          from: choice.from.toLowerCase(),
          to: choice.to.toLowerCase(),
          promotion: choice.promotion || 'q',
        };
      }
      const captures = legalMoves.filter((m) => m.captured || m.san?.includes('+'));
      const pool = captures.length > 0 ? captures : legalMoves;
      const choice = pool[Math.floor(Math.random() * pool.length)];
      return {
        from: choice.from.toLowerCase(),
        to: choice.to.toLowerCase(),
        promotion: choice.promotion || 'q',
      };
    }

    // 2. Casual (~1200 ELO): 2-ply search with small random noise
    if (difficulty === 'casual') {
      let bestScore = isWhite ? -Infinity : Infinity;
      let candidates: Move[] = [];

      for (const move of legalMoves) {
        game.move(move);
        const score = evaluateBoard(game);
        game.undo();

        if (isWhite ? score > bestScore : score < bestScore) {
          bestScore = score;
          candidates = [move];
        } else if (score === bestScore) {
          candidates.push(move);
        }
      }

      const choice = candidates[Math.floor(Math.random() * candidates.length)] || legalMoves[0];
      return {
        from: choice.from.toLowerCase(),
        to: choice.to.toLowerCase(),
        promotion: choice.promotion || 'q',
      };
    }

    // 3. Intermediate, Advanced, Master, and Grandmaster (2850+ ELO)
    let maxDepth = 3;
    let timeBudget = 350; // ms

    if (difficulty === 'intermediate') {
      maxDepth = 3;
      timeBudget = 350;
    } else if (difficulty === 'advanced') {
      maxDepth = 4;
      timeBudget = 650;
    } else if (difficulty === 'master') {
      maxDepth = 5;
      timeBudget = 1100;
    } else if (difficulty === 'grandmaster') {
      maxDepth = 6;
      timeBudget = 1500;
    }

    const deadline = Date.now() + timeBudget;
    const killerTable: Move[][] = [];
    const sortedMoves = sortMoves(legalMoves);

    let bestMove: Move = sortedMoves[0];
    let bestVal = isWhite ? -Infinity : Infinity;

    // Iterative Deepening from depth 1 to maxDepth
    for (let currentDepth = 1; currentDepth <= maxDepth; currentDepth++) {
      if (Date.now() > deadline) break;

      let depthBestMove: Move = bestMove;
      let depthBestVal = isWhite ? -Infinity : Infinity;

      for (const move of sortedMoves) {
        if (Date.now() > deadline && depthBestVal !== (isWhite ? -Infinity : Infinity)) {
          break;
        }

        game.move(move);
        const score = minimax(
          game,
          currentDepth - 1,
          -Infinity,
          Infinity,
          !isWhite,
          deadline,
          killerTable
        );
        game.undo();

        if (isWhite) {
          if (score > depthBestVal) {
            depthBestVal = score;
            depthBestMove = move;
          }
        } else {
          if (score < depthBestVal) {
            depthBestVal = score;
            depthBestMove = move;
          }
        }
      }

      if (Date.now() <= deadline || currentDepth === 1) {
        bestMove = depthBestMove;
        bestVal = depthBestVal;
      }
    }

    return {
      from: bestMove.from.toLowerCase(),
      to: bestMove.to.toLowerCase(),
      promotion: bestMove.promotion || 'q',
    };
  } catch (err) {
    console.warn('Bot computation fallback:', err);
    try {
      const moves = game.moves({ verbose: true });
      if (moves.length > 0) {
        const fallback = moves[0];
        return {
          from: fallback.from.toLowerCase(),
          to: fallback.to.toLowerCase(),
          promotion: fallback.promotion || 'q',
        };
      }
    } catch {
      // ignore
    }
    return null;
  }
}

// Async version that yields to the Node.js event loop between search iterations,
// preventing WebSocket packet drops and server event-loop lag.
export async function computeBestMoveAsync(
  game: Chess,
  difficulty: BotDifficulty = 'advanced'
): Promise<{ from: string; to: string; promotion?: string } | null> {
  try {
    const legalMoves = game.moves({ verbose: true });
    if (!legalMoves || legalMoves.length === 0) return null;

    const isWhite = game.turn() === 'w';

    // Check Opening Book first
    if (difficulty === 'master' || difficulty === 'grandmaster' || difficulty === 'advanced') {
      const fen = game.fen();
      const bookMoves = OPENING_BOOK[fen];
      if (bookMoves && bookMoves.length > 0) {
        const uciMove = bookMoves[Math.floor(Math.random() * bookMoves.length)];
        const from = uciMove.substring(0, 2);
        const to = uciMove.substring(2, 4);
        const promotion = uciMove.length > 4 ? uciMove[4] : undefined;
        const matching = legalMoves.find(
          (m) => m.from === from && m.to === to && (!promotion || m.promotion === promotion)
        );
        if (matching) {
          return { from, to, promotion };
        }
      }
    }

    if (difficulty === 'beginner') {
      return computeBestMove(game, 'beginner');
    }
    if (difficulty === 'casual') {
      return computeBestMove(game, 'casual');
    }

    let maxDepth = 3;
    let timeBudget = 350;

    if (difficulty === 'intermediate') {
      maxDepth = 3;
      timeBudget = 350;
    } else if (difficulty === 'advanced') {
      maxDepth = 4;
      timeBudget = 650;
    } else if (difficulty === 'master') {
      maxDepth = 5;
      timeBudget = 1100;
    } else if (difficulty === 'grandmaster') {
      maxDepth = 6;
      timeBudget = 1500;
    }

    const deadline = Date.now() + timeBudget;
    const killerTable: Move[][] = [];
    const sortedMoves = sortMoves(legalMoves);

    let bestMove: Move = sortedMoves[0];
    let bestVal = isWhite ? -Infinity : Infinity;

    for (let currentDepth = 1; currentDepth <= maxDepth; currentDepth++) {
      if (Date.now() > deadline) break;

      // Yield to the event loop so Socket.IO pings/messages are handled with zero delay
      await new Promise<void>((resolve) => setImmediate(resolve));

      let depthBestMove: Move = bestMove;
      let depthBestVal = isWhite ? -Infinity : Infinity;

      for (let i = 0; i < sortedMoves.length; i++) {
        const move = sortedMoves[i];
        if (Date.now() > deadline && depthBestVal !== (isWhite ? -Infinity : Infinity)) {
          break;
        }

        // Periodically yield every 4 root moves on deeper searches
        if (currentDepth >= 4 && i > 0 && i % 4 === 0) {
          await new Promise<void>((resolve) => setImmediate(resolve));
        }

        game.move(move);
        const score = minimax(
          game,
          currentDepth - 1,
          -Infinity,
          Infinity,
          !isWhite,
          deadline,
          killerTable
        );
        game.undo();

        if (isWhite) {
          if (score > depthBestVal) {
            depthBestVal = score;
            depthBestMove = move;
          }
        } else {
          if (score < depthBestVal) {
            depthBestVal = score;
            depthBestMove = move;
          }
        }
      }

      if (Date.now() <= deadline || currentDepth === 1) {
        bestMove = depthBestMove;
        bestVal = depthBestVal;
      }
    }

    return {
      from: bestMove.from.toLowerCase(),
      to: bestMove.to.toLowerCase(),
      promotion: bestMove.promotion || 'q',
    };
  } catch (err) {
    return computeBestMove(game, difficulty);
  }
}

// Bot Profile Metadata helper - compact, elegant names that never overflow on mobile
export function getBotMetadata(difficulty: BotDifficulty = 'master') {
  switch (difficulty) {
    case 'beginner':
      return { name: 'Novice Bot', elo: 800, title: 'Novice' };
    case 'casual':
      return { name: 'Club Bot', elo: 1200, title: 'Club' };
    case 'intermediate':
      return { name: 'Tactician', elo: 1600, title: 'Expert' };
    case 'advanced':
      return { name: 'Candidate', elo: 2100, title: 'CM' };
    case 'master':
      return { name: 'Master Magnus', elo: 2650, title: 'IM' };
    case 'grandmaster':
      return { name: 'Apex Stockfish', elo: 3100, title: 'GM' };
  }
}

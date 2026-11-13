import { GameResolution } from '../types/chess';

export interface MatchRecord {
  id: string;
  date: number; // timestamp
  opponentName: string;
  opponentAvatar?: string;
  isBot: boolean;
  botDifficulty?: string;
  result: 'win' | 'loss' | 'draw';
  resolution: GameResolution | string;
  playerColor: 'w' | 'b';
  totalMoves: number;
  avgMoveTimeSec: number;
  durationSec: number;
}

export interface PlayerStatsData {
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number; // percentage 0-100
  overallAvgMoveTimeSec: number;
  fastestMoveSec: number;
  recentMatches: MatchRecord[];
}

const STATS_STORAGE_KEY = 'chessnow_player_stats_v1';

// Initial realistic default history so the stats view is immediately engaging and visual
const DEFAULT_INITIAL_MATCHES: MatchRecord[] = [
  {
    id: 'rec-1',
    date: Date.now() - 86400000 * 4,
    opponentName: 'GrandmasterBot (MEDIUM)',
    isBot: true,
    botDifficulty: 'intermediate',
    result: 'win',
    resolution: 'checkmate',
    playerColor: 'w',
    totalMoves: 34,
    avgMoveTimeSec: 4.2,
    durationSec: 285,
  },
  {
    id: 'rec-2',
    date: Date.now() - 86400000 * 3,
    opponentName: 'Viktor_K',
    isBot: false,
    result: 'loss',
    resolution: 'resignation',
    playerColor: 'b',
    totalMoves: 28,
    avgMoveTimeSec: 5.8,
    durationSec: 320,
  },
  {
    id: 'rec-3',
    date: Date.now() - 86400000 * 2,
    opponentName: 'ElenaRook',
    isBot: false,
    result: 'win',
    resolution: 'checkmate',
    playerColor: 'w',
    totalMoves: 41,
    avgMoveTimeSec: 3.9,
    durationSec: 340,
  },
  {
    id: 'rec-4',
    date: Date.now() - 86400000 * 1.5,
    opponentName: 'ChessBot (HARD)',
    isBot: true,
    botDifficulty: 'advanced',
    result: 'draw',
    resolution: 'draw_agreement',
    playerColor: 'b',
    totalMoves: 48,
    avgMoveTimeSec: 6.1,
    durationSec: 520,
  },
  {
    id: 'rec-5',
    date: Date.now() - 86400000 * 0.8,
    opponentName: 'Alex_Tactics',
    isBot: false,
    result: 'win',
    resolution: 'timeout',
    playerColor: 'w',
    totalMoves: 31,
    avgMoveTimeSec: 3.4,
    durationSec: 230,
  },
  {
    id: 'rec-6',
    date: Date.now() - 86400000 * 0.2,
    opponentName: 'SilentKnight',
    isBot: false,
    result: 'win',
    resolution: 'checkmate',
    playerColor: 'w',
    totalMoves: 26,
    avgMoveTimeSec: 2.9,
    durationSec: 180,
  },
];

export function getPlayerStats(): PlayerStatsData {
  if (typeof window === 'undefined') {
    return calculateStats(DEFAULT_INITIAL_MATCHES);
  }

  try {
    const raw = localStorage.getItem(STATS_STORAGE_KEY);
    if (!raw) {
      // Seed with initial matches
      const initial = calculateStats(DEFAULT_INITIAL_MATCHES);
      localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(DEFAULT_INITIAL_MATCHES));
      return initial;
    }
    const matches: MatchRecord[] = JSON.parse(raw);
    return calculateStats(matches);
  } catch {
    return calculateStats(DEFAULT_INITIAL_MATCHES);
  }
}

export function recordMatch(match: Omit<MatchRecord, 'id' | 'date'>): PlayerStatsData {
  const current = getPlayerStats();
  const newRecord: MatchRecord = {
    ...match,
    id: `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    date: Date.now(),
  };

  const updatedMatches = [newRecord, ...current.recentMatches].slice(0, 50); // keep last 50 matches

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(updatedMatches));
    } catch {
      // ignore
    }
  }

  return calculateStats(updatedMatches);
}

function calculateStats(matches: MatchRecord[]): PlayerStatsData {
  const totalGames = matches.length;
  const wins = matches.filter((m) => m.result === 'win').length;
  const losses = matches.filter((m) => m.result === 'loss').length;
  const draws = matches.filter((m) => m.result === 'draw').length;

  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 1000) / 10 : 0;

  let totalMoveTimeSum = 0;
  let moveCount = 0;
  let fastestMove = 999;

  matches.forEach((m) => {
    if (m.avgMoveTimeSec > 0) {
      totalMoveTimeSum += m.avgMoveTimeSec;
      moveCount++;
      if (m.avgMoveTimeSec < fastestMove) {
        fastestMove = m.avgMoveTimeSec;
      }
    }
  });

  const overallAvgMoveTimeSec =
    moveCount > 0 ? Math.round((totalMoveTimeSum / moveCount) * 10) / 10 : 3.8;

  return {
    totalGames,
    wins,
    losses,
    draws,
    winRate,
    overallAvgMoveTimeSec,
    fastestMoveSec: fastestMove === 999 ? 2.5 : Math.round(fastestMove * 10) / 10,
    recentMatches: matches,
  };
}

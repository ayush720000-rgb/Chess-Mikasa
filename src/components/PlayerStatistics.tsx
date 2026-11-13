import React, { useState } from 'react';
import {
  Trophy,
  Zap,
  TrendingUp,
  PieChart as PieIcon,
  ChevronDown,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { getPlayerStats } from '../utils/playerStats';

export const PlayerStatistics: React.FC = () => {
  const [stats] = useState(() => getPlayerStats());
  const [chartTab, setChartTab] = useState<'moveTime' | 'winLoss' | 'trend'>('moveTime');
  const [expandedHistory, setExpandedHistory] = useState(false);

  // Prepare data for move time chart
  const moveTimeChartData = [...stats.recentMatches]
    .reverse()
    .slice(-8)
    .map((m, idx) => ({
      match: `G${idx + 1}`,
      opponent: m.opponentName.split(' ')[0],
      seconds: m.avgMoveTimeSec,
      result: m.result,
      moves: m.totalMoves,
    }));

  // Prepare data for win/loss/draw pie chart
  const ratioPieData = [
    { name: 'Wins', value: stats.wins, color: '#ffd88c' },
    { name: 'Losses', value: stats.losses, color: '#e11d48' },
    { name: 'Draws', value: stats.draws, color: '#71717a' },
  ].filter((d) => d.value > 0);

  // Prepare cumulative wins progression trend data
  let runningWins = 0;
  const trendData = [...stats.recentMatches]
    .reverse()
    .slice(-8)
    .map((m, idx) => {
      if (m.result === 'win') runningWins++;
      return {
        match: `G${idx + 1}`,
        opponent: m.opponentName.split(' ')[0],
        wins: runningWins,
        rate: Math.round((runningWins / (idx + 1)) * 100),
      };
    });

  return (
    <div className="clay-card p-4 sm:p-6 border border-[#e5b869]/30 bg-[#0d0d0d] my-4 sm:my-5 w-full max-w-full overflow-hidden shadow-xl select-none">
      {/* Header with Title and Chart Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#e5b869]/20 w-full">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-[#ffd88c] shrink-0" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#ffd88c] truncate font-serif">
              Grandmaster Analytics
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-extrabold text-white mt-0.5 truncate font-serif">
            Performance & Match History
          </h3>
        </div>

        {/* Chart View Selector Buttons */}
        <div className="flex items-center gap-1 p-1 bg-[#080808] rounded-xl border border-zinc-800 text-xs self-start sm:self-auto shrink-0">
          <button
            onClick={() => setChartTab('moveTime')}
            className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              chartTab === 'moveTime'
                ? 'bg-gradient-to-r from-[#242424] to-[#141414] text-[#ffd88c] shadow-sm font-bold border border-[#e5b869]/40'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Speed</span>
          </button>

          <button
            onClick={() => setChartTab('trend')}
            className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              chartTab === 'trend'
                ? 'bg-gradient-to-r from-[#242424] to-[#141414] text-[#ffd88c] shadow-sm font-bold border border-[#e5b869]/40'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Trend</span>
          </button>

          <button
            onClick={() => setChartTab('winLoss')}
            className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              chartTab === 'winLoss'
                ? 'bg-gradient-to-r from-[#242424] to-[#141414] text-[#ffd88c] shadow-sm font-bold border border-[#e5b869]/40'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <PieIcon className="w-3.5 h-3.5" />
            <span>Ratio</span>
          </button>
        </div>
      </div>

      {/* Key Metric Highlights Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 my-4 sm:my-5 w-full">
        <div className="p-3 rounded-xl bg-[#080808] border border-zinc-800 shadow-inner min-w-0 overflow-hidden">
          <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium block truncate">
            Win / Loss Ratio
          </span>
          <div className="flex items-baseline gap-1 mt-1 flex-wrap min-w-0">
            <span className="text-lg sm:text-xl font-black text-white tabular-nums truncate">
              {stats.wins}W - {stats.losses}L
            </span>
            {stats.draws > 0 && (
              <span className="text-[11px] text-zinc-400 tabular-nums font-mono">
                ({stats.draws}D)
              </span>
            )}
          </div>
          <span className="text-[10px] text-[#ffd88c] font-semibold mt-0.5 block truncate">
            {stats.winRate}% Win Rate
          </span>
        </div>

        <div className="p-3 rounded-xl bg-[#080808] border border-zinc-800 shadow-inner min-w-0 overflow-hidden">
          <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium block truncate">
            Avg Move Time
          </span>
          <div className="flex items-baseline gap-1 mt-1 min-w-0">
            <span className="text-lg sm:text-xl font-black text-[#ffd88c] tabular-nums truncate">
              {stats.overallAvgMoveTimeSec}s
            </span>
            <span className="text-[11px] text-zinc-400 truncate">/ move</span>
          </div>
          <span className="text-[10px] text-zinc-400 mt-0.5 block truncate">
            Fastest: {stats.fastestMoveSec}s
          </span>
        </div>

        <div className="p-3 rounded-xl bg-[#080808] border border-zinc-800 shadow-inner min-w-0 overflow-hidden">
          <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium block truncate">
            Total Matches
          </span>
          <div className="text-lg sm:text-xl font-black text-white tabular-nums mt-1 truncate">
            {stats.totalGames}
          </div>
          <span className="text-[10px] text-zinc-400 mt-0.5 block truncate">
            Recorded in session
          </span>
        </div>

        <div className="p-3 rounded-xl bg-[#080808] border border-zinc-800 shadow-inner min-w-0 overflow-hidden">
          <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium block truncate">
            Tempo Style
          </span>
          <div className="text-sm sm:text-base font-bold text-[#ffd88c] mt-1 truncate">
            {stats.overallAvgMoveTimeSec < 4 ? 'Lightning Blitz' : stats.overallAvgMoveTimeSec < 7 ? 'Rapid Strategic' : 'Classical Deep'}
          </div>
          <span className="text-[10px] text-zinc-400 mt-0.5 block truncate">
            Speed profile
          </span>
        </div>
      </div>

      {/* Recharts Chart Visualization Section */}
      <div className="p-3 sm:p-4 rounded-2xl bg-[#080808] border border-zinc-800 my-4 sm:my-5 w-full min-w-0 overflow-hidden">
        <div className="flex items-center justify-between mb-3 px-1 gap-2 flex-wrap">
          <span className="text-xs font-semibold text-zinc-200 truncate">
            {chartTab === 'moveTime' && 'Average Move Time per Match (Seconds)'}
            {chartTab === 'trend' && 'Cumulative Win Rate Progression (%)'}
            {chartTab === 'winLoss' && 'Match Outcome Distribution'}
          </span>
          <span className="text-[10px] sm:text-[11px] text-[#ffd88c] font-mono shrink-0">
            Last {Math.min(8, stats.recentMatches.length)} Games
          </span>
        </div>

        <div className="h-44 sm:h-48 w-full min-w-0 overflow-hidden">
          {chartTab === 'moveTime' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={moveTimeChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="match" stroke="#71717a" fontSize={10} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={10} tickLine={false} unit="s" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="glass-panel p-2 rounded-xl text-xs border border-[#e5b869]/30 shadow-xl bg-[#0d0d0d]/98">
                          <p className="font-bold text-white mb-0.5">
                            Match {data.match}: vs {data.opponent}
                          </p>
                          <p className="text-[#ffd88c] font-mono">
                            Avg Move: <span className="font-bold">{data.seconds}s</span>
                          </p>
                          <p className="text-zinc-400 text-[10px]">
                            Result: <span className="uppercase font-semibold">{data.result}</span> · {data.moves} moves
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="seconds" radius={[6, 6, 0, 0]}>
                  {moveTimeChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.result === 'win' ? '#ffd88c' : entry.result === 'loss' ? '#f43f5e' : '#52525b'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}

          {chartTab === 'trend' && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorWins" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffd88c" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ffd88c" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="match" stroke="#71717a" fontSize={10} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={10} tickLine={false} unit="%" domain={[0, 100]} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="glass-panel p-2 rounded-xl text-xs border border-[#e5b869]/30 shadow-xl bg-[#0d0d0d]/98">
                          <p className="font-bold text-white mb-0.5">
                            Match {data.match}: vs {data.opponent}
                          </p>
                          <p className="text-[#ffd88c] font-mono">
                            Win Rate: <span className="font-bold">{data.rate}%</span>
                          </p>
                          <p className="text-zinc-400 text-[10px]">
                            Total Wins: {data.wins}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="rate"
                  stroke="#ffd88c"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorWins)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}

          {chartTab === 'winLoss' && (
            <div className="h-full w-full flex items-center justify-center min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="glass-panel p-2 rounded-xl text-xs border border-[#e5b869]/30 shadow-xl bg-[#0d0d0d]/98">
                            <span className="font-bold text-white">
                              {data.name}: {data.value} matches
                            </span>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Pie
                    data={ratioPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={65}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {ratioPieData.map((entry, index) => (
                      <Cell key={`slice-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Match History Breakdown List */}
      <div className="w-full">
        <div className="flex items-center justify-between mb-2.5 px-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
            Recent Matches
          </span>
          <button
            onClick={() => setExpandedHistory(!expandedHistory)}
            className="text-xs text-[#ffd88c] hover:underline flex items-center gap-1 cursor-pointer shrink-0"
          >
            <span>{expandedHistory ? 'Show Less' : `Show All (${stats.recentMatches.length})`}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandedHistory ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <div className="space-y-2 w-full">
          {(expandedHistory ? stats.recentMatches : stats.recentMatches.slice(0, 4)).map((match) => (
            <div
              key={match.id}
              className="p-2.5 sm:p-3 rounded-xl bg-[#080808] hover:bg-[#141414] transition-colors border border-zinc-800 flex items-center justify-between gap-2.5 text-xs w-full overflow-hidden"
            >
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <span
                  className={`w-12 sm:w-14 py-0.5 sm:py-1 text-center font-bold text-[9px] sm:text-[10px] rounded uppercase shrink-0 ${
                    match.result === 'win'
                      ? 'bg-[#1c1c1c] text-[#ffd88c] border border-[#e5b869]/40'
                      : match.result === 'loss'
                      ? 'bg-rose-950/60 text-rose-300 border border-rose-500/30'
                      : 'bg-[#181818] text-zinc-400 border border-white/10'
                  }`}
                >
                  {match.result}
                </span>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-white truncate max-w-[120px] sm:max-w-none">
                      {match.opponentName}
                    </span>
                    <span className="text-[10px] text-zinc-400 shrink-0">
                      as {match.playerColor === 'w' ? 'White ⚪' : 'Black ⚫'}
                    </span>
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-zinc-400 mt-0.5 truncate">
                    {match.totalMoves} moves · {match.resolution.replace('_', ' ')}
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="font-mono text-[11px] sm:text-xs text-white tabular-nums">
                  {match.avgMoveTimeSec}s <span className="text-zinc-500 text-[10px]">/mv</span>
                </div>
                <div className="text-[10px] text-zinc-500">
                  {new Date(match.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

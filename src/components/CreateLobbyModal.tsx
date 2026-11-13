import React, { useState } from 'react';
import { X, Users, Bot, Clock } from 'lucide-react';
import { BotDifficulty, GameRules } from '../types/chess';
import { triggerHaptic } from '../utils/telegram';

interface CreateLobbyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (rules: GameRules) => void;
}

export const CreateLobbyModal: React.FC<CreateLobbyModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [matchType, setMatchType] = useState<'human' | 'bot'>('human');
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>('intermediate');
  const [color, setColor] = useState<'w' | 'b' | 'random'>('random');

  const [timePreset, setTimePreset] = useState<'none' | '1+1' | '3+2' | '5+3' | '10+0' | 'custom'>('10+0');
  const [customMinutes, setCustomMinutes] = useState<number>(10);
  const [customIncrement, setCustomIncrement] = useState<number>(3);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  React.useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    triggerHaptic('medium');

    let timerEnabled = true;
    let initialTimeSec = 600;
    let incrementSec = 0;

    switch (timePreset) {
      case 'none':
        timerEnabled = false;
        initialTimeSec = 0;
        incrementSec = 0;
        break;
      case '1+1':
        timerEnabled = true;
        initialTimeSec = 60;
        incrementSec = 1;
        break;
      case '3+2':
        timerEnabled = true;
        initialTimeSec = 180;
        incrementSec = 2;
        break;
      case '5+3':
        timerEnabled = true;
        initialTimeSec = 300;
        incrementSec = 3;
        break;
      case '10+0':
        timerEnabled = true;
        initialTimeSec = 600;
        incrementSec = 0;
        break;
      case 'custom':
        timerEnabled = true;
        initialTimeSec = Math.max(1, customMinutes) * 60;
        incrementSec = Math.max(0, customIncrement);
        break;
    }

    onCreate({
      timerEnabled,
      initialTimeSec,
      incrementSec,
      preferredColor: color,
      isBotGame: matchType === 'bot',
      botDifficulty: matchType === 'bot' ? botDifficulty : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="clay-card w-full max-w-lg p-6 sm:p-7 relative max-h-[92dvh] overflow-y-auto border border-[#e5b869]/35 bg-[#0d0d0d] shadow-[0_20px_60px_rgba(0,0,0,0.95)]">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <span className="text-xs uppercase tracking-wider text-[#ffd88c] font-semibold">
            Match Settings
          </span>
          <h2 className="text-2xl font-bold font-serif text-white mt-0.5">Host New Match</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Opponent Selection */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-2">
              Match Opponent
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMatchType('human')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  matchType === 'human'
                    ? 'bg-gradient-to-r from-[#242424] to-[#141414] border-[#e5b869] shadow-[0_0_15px_rgba(229,184,105,0.25)]'
                    : 'bg-[#141414] border-white/10 hover:border-white/20 text-zinc-400'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Users className={`w-4 h-4 ${matchType === 'human' ? 'text-[#ffd88c]' : 'text-zinc-500'}`} />
                  <span className={`text-sm font-bold ${matchType === 'human' ? 'text-white' : 'text-zinc-300'}`}>
                    Multiplayer
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Share match room code or Telegram link
                </p>
              </button>

              <button
                type="button"
                onClick={() => setMatchType('bot')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  matchType === 'bot'
                    ? 'bg-gradient-to-r from-[#242424] to-[#141414] border-[#e5b869] shadow-[0_0_15px_rgba(229,184,105,0.25)]'
                    : 'bg-[#141414] border-white/10 hover:border-white/20 text-zinc-400'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Bot className={`w-4 h-4 ${matchType === 'bot' ? 'text-[#ffd88c]' : 'text-zinc-500'}`} />
                  <span className={`text-sm font-bold ${matchType === 'bot' ? 'text-white' : 'text-zinc-300'}`}>
                    Chess Bot
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Play instantly against Stockfish engine
                </p>
              </button>
            </div>
          </div>

          {/* Bot Difficulty */}
          {matchType === 'bot' && (
            <div className="p-4 rounded-xl bg-[#080808] border border-[#e5b869]/30">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-[#ffd88c]">
                  Bot Difficulty Rating
                </label>
                <span className="text-[10px] text-[#ffd88c] font-mono font-bold">
                  2,850+ Stockfish AI
                </span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {(
                  [
                    { id: 'beginner', label: 'Novice', elo: '800' },
                    { id: 'casual', label: 'Club', elo: '1200' },
                    { id: 'intermediate', label: 'Expert', elo: '1600' },
                    { id: 'advanced', label: 'CM', elo: '2100' },
                    { id: 'master', label: 'Master', elo: '2650' },
                    { id: 'grandmaster', label: 'Apex', elo: '3100' },
                  ] as const
                ).map((level) => (
                  <button
                    key={level.id}
                    type="button"
                    onClick={() => setBotDifficulty(level.id)}
                    className={`py-2 px-1 text-center rounded-lg border text-xs cursor-pointer transition-colors ${
                      botDifficulty === level.id
                        ? 'bg-gradient-to-br from-[#ffd88c] to-[#c89547] text-[#000000] font-extrabold border-[#ffd88c] shadow-md'
                        : 'bg-[#141414] border-white/10 text-zinc-300 hover:bg-[#1f1f1f]'
                    }`}
                  >
                    <div className="truncate font-semibold">{level.label}</div>
                    <div className="text-[10px] opacity-80 font-mono">{level.elo}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Choose Color */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-2">
              Choose Your Color
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setColor('w')}
                className={`py-3 px-3 rounded-xl border flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  color === 'w'
                    ? 'bg-white text-zinc-900 font-bold border-white shadow-md'
                    : 'bg-[#141414] border-white/10 text-zinc-300 hover:border-white/20'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white border border-zinc-300 shadow-inner" />
                <span className="text-xs">White</span>
              </button>

              <button
                type="button"
                onClick={() => setColor('random')}
                className={`py-3 px-3 rounded-xl border flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  color === 'random'
                    ? 'clay-button-primary'
                    : 'bg-[#141414] border-white/10 text-zinc-300 hover:border-white/20'
                }`}
              >
                <span className="text-xs">🎲</span>
                <span className="text-xs font-semibold">Random</span>
              </button>

              <button
                type="button"
                onClick={() => setColor('b')}
                className={`py-3 px-3 rounded-xl border flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  color === 'b'
                    ? 'bg-[#000000] text-white font-bold border-[#e5b869] shadow-md'
                    : 'bg-[#141414] border-white/10 text-zinc-300 hover:border-white/20'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-zinc-950 border border-zinc-700 shadow-inner" />
                <span className="text-xs">Black</span>
              </button>
            </div>
          </div>

          {/* Time Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#ffd88c]" />
                Time Control
              </label>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
              {[
                { id: 'none', label: 'No Timer' },
                { id: '1+1', label: '1 | 1s' },
                { id: '3+2', label: '3 | 2s' },
                { id: '5+3', label: '5 | 3s' },
                { id: '10+0', label: '10 min' },
                { id: 'custom', label: 'Custom' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setTimePreset(p.id as typeof timePreset)}
                  className={`py-2 px-1 text-center rounded-lg border text-xs cursor-pointer transition-all ${
                    timePreset === p.id
                      ? 'bg-gradient-to-r from-[#262626] to-[#141414] border-[#e5b869] text-white font-bold shadow-sm'
                      : 'bg-[#141414] border-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {timePreset === 'custom' && (
              <div className="p-3.5 rounded-xl bg-[#080808] border border-white/10 grid grid-cols-2 gap-3 mt-2">
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">
                    Minutes per player
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(parseInt(e.target.value) || 1)}
                    className="w-full bg-[#141414] border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#e5b869]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">
                    Increment (seconds)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={customIncrement}
                    onChange={(e) => setCustomIncrement(parseInt(e.target.value) || 0)}
                    className="w-full bg-[#141414] border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#e5b869]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Luxury Loading Progress Bar when Submitting */}
          {isSubmitting && (
            <div className="space-y-1.5 pt-2">
              <div className="w-full h-2 rounded-full luxury-gold-progress-track overflow-hidden p-0.5">
                <div className="h-full rounded-full luxury-gold-progress-fill animate-indeterminate-beam shadow-[0_0_10px_#ffd88c]" />
              </div>
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#ffd88c] font-medium font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ffd88c] animate-ping" />
                <span>{matchType === 'bot' ? 'Initializing Stockfish 2,850+ engine...' : 'Creating match room...'}</span>
              </div>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="clay-button px-4 py-2.5 text-xs cursor-pointer disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="clay-button-primary px-6 py-2.5 text-xs rounded-xl font-bold cursor-pointer disabled:opacity-80 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-black border-t-transparent animate-spin" />
                  <span>{matchType === 'bot' ? 'Starting Match...' : 'Creating...'}</span>
                </>
              ) : (
                <span>{matchType === 'bot' ? 'Start Match Against Bot' : 'Create Room'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { X, Palette, Check, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { BOARD_THEMES, BoardTheme, getActiveBoardTheme, setActiveBoardTheme } from '../utils/boardThemes';
import { isSoundEnabled, setSoundEnabled, playSound } from '../utils/sound';
import { triggerHaptic } from '../utils/telegram';

interface BoardSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onThemeChanged?: (theme: BoardTheme) => void;
}

export const BoardSettingsModal: React.FC<BoardSettingsModalProps> = ({
  isOpen,
  onClose,
  onThemeChanged,
}) => {
  const [currentTheme, setCurrentTheme] = useState<BoardTheme>(() => getActiveBoardTheme());
  const [soundActive, setSoundActive] = useState<boolean>(() => isSoundEnabled());

  useEffect(() => {
    if (isOpen) {
      setCurrentTheme(getActiveBoardTheme());
      setSoundActive(isSoundEnabled());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectTheme = (theme: BoardTheme) => {
    triggerHaptic('light');
    const updated = setActiveBoardTheme(theme.id);
    setCurrentTheme(updated);
    if (onThemeChanged) onThemeChanged(updated);
    playSound('move');
  };

  const handleToggleSound = () => {
    triggerHaptic('light');
    const next = !soundActive;
    setSoundEnabled(next);
    setSoundActive(next);
    if (next) playSound('move');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="clay-card w-full max-w-lg p-5 sm:p-7 relative max-h-[92dvh] overflow-y-auto border border-[#e5b869]/40 bg-[#0d0d0d] shadow-[0_20px_60px_rgba(0,0,0,0.95)]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-5 pr-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1c1c1c] border border-[#e5b869]/40 text-[#ffd88c] text-[11px] font-bold uppercase tracking-wider mb-2">
            <Palette className="w-3.5 h-3.5" />
            <span>Royal Atelier</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-extrabold text-[#ffffff]">
            Board Themes & Settings
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Select your handcrafted tournament board aesthetic.
          </p>
        </div>

        {/* Board Style Switcher */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-[#ffd88c]">
              Select Board Style ({BOARD_THEMES.length} Available)
            </label>
            <span className="text-[11px] text-[#ffd88c] font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Live preview applied
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {BOARD_THEMES.map((theme) => {
              const isSelected = currentTheme.id === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => handleSelectTheme(theme)}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3.5 relative group ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#242424] via-[#1a1a1a] to-[#121212] border-[#e5b869] shadow-[0_4px_25px_rgba(229,184,105,0.25)] ring-1 ring-[#e5b869]/40'
                      : 'bg-[#141414]/95 border-white/10 hover:border-[#e5b869]/50 hover:bg-[#1c1c1c]'
                  }`}
                >
                  {/* Mini Chessboard Swatch Grid */}
                  <div
                    className="w-13 h-13 rounded-xl overflow-hidden shrink-0 grid grid-cols-2 grid-rows-2 shadow-md border-2"
                    style={{ borderColor: theme.borderColor }}
                  >
                    <div style={{ backgroundColor: theme.lightSquare }} />
                    <div style={{ backgroundColor: theme.darkSquare }} />
                    <div style={{ backgroundColor: theme.darkSquare }} />
                    <div style={{ backgroundColor: theme.lightSquare }} />
                  </div>

                  {/* Theme info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-bold font-serif ${
                          isSelected ? 'text-[#ffffff]' : 'text-zinc-200 group-hover:text-white'
                        }`}
                      >
                        {theme.name}
                      </span>
                      {theme.tag && (
                        <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-[#1c1c1c] text-[#ffd88c] border border-[#e5b869]/40">
                          {theme.tag}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">
                      {theme.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[9px] text-[#ffd88c]/80 font-mono">
                      <span>♚ 3.75" King</span>
                      <span>·</span>
                      <span>Weighted Staunton Pieces</span>
                      <span>·</span>
                      <span>Billiard Felt Base</span>
                    </div>
                  </div>

                  {/* Check Indicator */}
                  {isSelected ? (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#ffd88c] to-[#c89547] flex items-center justify-center text-[#000000] shrink-0 shadow-md">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full border border-white/20 group-hover:border-[#e5b869]/50 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Audio / Haptic Settings */}
        <div className="p-4 rounded-2xl bg-[#080808] border border-white/10 flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1c1c1c] border border-[#e5b869]/40 flex items-center justify-center text-[#ffd88c] shrink-0">
              {soundActive ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-white">Audio & Haptic Feedback</div>
              <div className="text-[11px] text-zinc-400">
                Tactile feedback for moves, captures, checkmates
              </div>
            </div>
          </div>

          <button
            onClick={handleToggleSound}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              soundActive
                ? 'clay-button-primary'
                : 'bg-white/10 text-zinc-400 hover:text-white'
            }`}
          >
            {soundActive ? 'ENABLED' : 'MUTED'}
          </button>
        </div>

        {/* Done / Apply Button */}
        <button
          onClick={onClose}
          className="w-full clay-button-primary py-3 rounded-xl font-bold text-sm tracking-wide shadow-lg cursor-pointer flex items-center justify-center gap-2"
        >
          <span>Done</span>
        </button>
      </div>
    </div>
  );
};

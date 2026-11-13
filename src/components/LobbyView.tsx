import React from 'react';
import {
  PlusCircle,
  KeyRound,
  Volume2,
  VolumeX,
  Palette,
  Crown,
  ChevronRight,
  Flame,
} from 'lucide-react';
import { UserProfile } from '../types/chess';
import { isSoundEnabled, toggleSound } from '../utils/sound';
import { isTelegramWebApp, generateInitialAvatar, triggerHaptic } from '../utils/telegram';
import { getActiveBoardTheme } from '../utils/boardThemes';
import { PlayerStatistics } from './PlayerStatistics';
import { GrandmasterShowcase } from './GrandmasterShowcase';

interface LobbyViewProps {
  user: UserProfile;
  onCreateLobby: () => void;
  onJoinLobby: () => void;
  onEditProfile: () => void;
  onOpenSettings?: () => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  user,
  onCreateLobby,
  onJoinLobby,
  onEditProfile,
  onOpenSettings,
}) => {
  const [soundOn, setSoundOn] = React.useState(isSoundEnabled());
  const [activeBoardTheme, setActiveBoardThemeState] = React.useState(getActiveBoardTheme);
  const isTg = isTelegramWebApp();

  React.useEffect(() => {
    const handleThemeChange = () => {
      setActiveBoardThemeState(getActiveBoardTheme());
    };
    window.addEventListener('board_theme_changed', handleThemeChange);
    return () => window.removeEventListener('board_theme_changed', handleThemeChange);
  }, []);

  const handleToggleSound = () => {
    triggerHaptic('light');
    const next = toggleSound();
    setSoundOn(next);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6 flex flex-col gap-5 sm:gap-7 relative select-none">
      {/* Background Floating Luxury Chess Pieces (Animated Ambiance) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none -z-10">
        <span className="absolute top-10 left-[6%] text-6xl sm:text-7xl opacity-[0.06] text-[#ffd88c] animate-float-slow font-serif">
          ♚
        </span>
        <span className="absolute top-28 right-[8%] text-7xl sm:text-8xl opacity-[0.05] text-[#ffd88c] animate-float-reverse font-serif">
          ♛
        </span>
        <span className="absolute bottom-24 left-[10%] text-5xl sm:text-6xl opacity-[0.045] text-[#ffd88c] animate-float-slow font-serif">
          ♞
        </span>
        <span className="absolute bottom-12 right-[12%] text-6xl opacity-[0.055] text-[#ffd88c] animate-float-reverse font-serif">
          ♜
        </span>
      </div>

      {/* Member Royalty Card with Handcrafted Staunton Inlay */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#141414] via-[#0c0c0c] to-[#050505] border border-[#e5b869]/35 shadow-[0_10px_35px_rgba(0,0,0,0.9)] w-full relative overflow-hidden backdrop-blur-md">
        {/* Brass Corner Craftsmanship Accents */}
        <div className="absolute top-1.5 left-1.5 w-3 h-3 border-t-2 border-l-2 border-[#ffd88c]/70 pointer-events-none rounded-tl-sm flex items-start justify-start p-0.5">
          <div className="brass-rivet" />
        </div>
        <div className="absolute top-1.5 right-1.5 w-3 h-3 border-t-2 border-r-2 border-[#ffd88c]/70 pointer-events-none rounded-tr-sm flex items-start justify-end p-0.5">
          <div className="brass-rivet" />
        </div>
        <div className="absolute -top-12 -right-12 w-44 h-44 bg-[#e5b869]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center gap-3.5 min-w-0">
          <div
            onClick={() => {
              triggerHaptic('light');
              onEditProfile();
            }}
            className="relative cursor-pointer group shrink-0"
            title="Edit profile"
          >
            <div className="w-13 h-13 sm:w-15 sm:h-15 rounded-2xl overflow-hidden bg-[#141414] border-2 border-[#e5b869] shadow-[0_0_16px_rgba(229,184,105,0.35)] flex items-center justify-center transition-all group-hover:scale-105">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = generateInitialAvatar(user.name);
                  }}
                />
              ) : (
                <img
                  src={generateInitialAvatar(user.name)}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#ffd88c] rounded-full border-2 border-[#0c0c0c] shadow-sm animate-pulse" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-[#ffffff] truncate max-w-[200px] sm:max-w-xs font-serif tracking-wide">
                {user.name}
              </h2>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#ffd88c] bg-[#1c1c1c] px-2.5 py-0.5 rounded-full border border-[#e5b869]/40 flex items-center gap-1 shadow-inner">
                <Crown className="w-3 h-3 text-[#ffd88c]" />
                Royal Salon
              </span>
              <div className="wood-plaque px-2 py-0.5 rounded-md flex items-center gap-1 text-[9px] font-mono tracking-wider text-[#ffd88c] uppercase border border-[#e5b869]/40 shadow-xs">
                <span>♚ Staunton No. 5</span>
              </div>
              {user.username && (
                <span className="text-[11px] text-[#ffd88c]/80 font-mono truncate">
                  @{user.username}
                </span>
              )}
            </div>
            <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5 truncate">
              {isTg
                ? 'Telegram Certified · 2,850+ Stockfish AI Engine'
                : 'Grandmaster Arena · Live PvP & 2,850+ Stockfish AI Engine'}
            </p>
          </div>
        </div>

        {/* Quick Actions (Theme & Audio) */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          {onOpenSettings && (
            <button
              onClick={() => {
                triggerHaptic('light');
                onOpenSettings();
              }}
              className="clay-button px-3 py-1.5 sm:px-3.5 sm:py-2 flex items-center gap-1.5 text-xs text-[#ffd88c] hover:text-[#ffffff] hover:border-[#e5b869]/60 cursor-pointer shadow-sm"
              title="Change Board Style"
            >
              <Palette className="w-3.5 h-3.5 text-[#ffd88c]" />
              <span className="font-semibold hidden sm:inline">Theme:</span>
              <span className="font-bold text-[11px]">{activeBoardTheme.name.split(' ')[0]}</span>
            </button>
          )}

          <button
            onClick={handleToggleSound}
            className={`clay-button px-3 py-1.5 sm:px-3.5 sm:py-2 flex items-center gap-1.5 text-xs cursor-pointer ${
              soundOn ? 'text-[#ffd88c]' : 'text-zinc-500'
            }`}
          >
            {soundOn ? <Volume2 className="w-3.5 h-3.5 text-[#ffd88c]" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="font-semibold hidden min-[380px]:inline">{soundOn ? 'Sound' : 'Muted'}</span>
          </button>
        </div>
      </div>

      {/* Main Title Banner with Subtle Wooden Marquetry Accent */}
      <div className="w-full text-center">
        <div className="flex items-center justify-center gap-3 mb-2 max-w-xs mx-auto opacity-70">
          <div className="wood-inlay-strip flex-1" />
          <span className="text-xs text-[#ffd88c] font-serif">♔ ♕ ♚</span>
          <div className="wood-inlay-strip flex-1" />
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-black tracking-tight text-gold-gradient drop-shadow-md">
          GRANDMASTER ARENA
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1.5 max-w-md mx-auto leading-relaxed">
          Challenge friends in real-time or face our ruthless 2,850+ Stockfish engine.
        </p>
      </div>

      {/* Interactive Animated Claymorphic Cards with Brass & Wood Craftsmanship Inlays */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full">
        {/* Card 1: Host Arena / Play AI Bot */}
        <div
          onClick={() => {
            triggerHaptic('medium');
            onCreateLobby();
          }}
          className="clay-card clay-card-interactive p-5 sm:p-7 flex flex-col justify-between group cursor-pointer border border-[#e5b869]/40 hover:border-[#ffd88c] relative overflow-hidden bg-gradient-to-br from-[#181818] via-[#0f0f0f] to-[#050505] shadow-[0_14px_40px_rgba(0,0,0,0.9)] transition-all hover:scale-[1.015]"
        >
          {/* Brass Corner Brackets */}
          <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-[#ffd88c]/60 pointer-events-none rounded-tl-sm flex items-start justify-start p-0.5">
            <div className="brass-rivet" />
          </div>
          <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-[#ffd88c]/60 pointer-events-none rounded-tr-sm flex items-start justify-end p-0.5">
            <div className="brass-rivet" />
          </div>

          {/* Animated Metallic Gold Ray on Hover */}
          <div className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none transform -skew-x-12 -translate-x-full group-hover:translate-x-[400%] transition-transform duration-1000 ease-in-out" />
          
          <span className="absolute -bottom-4 -right-4 text-8xl sm:text-9xl select-none pointer-events-none opacity-[0.05] text-[#ffd88c] font-serif group-hover:opacity-[0.09] transition-opacity">
            ♚
          </span>

          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#ffd88c] via-[#e5b869] to-[#b37e29] flex items-center justify-center text-[#000000] shadow-[0_4px_22px_rgba(229,184,105,0.45)] group-hover:scale-110 group-hover:rotate-3 transition-transform border border-white/40">
                <PlusCircle className="w-6 h-6 stroke-[2.5]" />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#ffd88c] bg-[#1c1c1c] px-2.5 py-1 rounded-xl border border-[#e5b869]/40 shadow-sm flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-400" />
                2,850+ Engine
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-bold font-serif text-[#ffffff] group-hover:text-[#ffd88c] transition-colors">
              Host Match & Bot
            </h3>
            <p className="text-xs sm:text-[13px] text-zinc-400 mt-2.5 leading-relaxed">
              Create a custom room to duel friends via link or code, or test your skills against our Grandmaster Stockfish AI.
            </p>
          </div>

          <div>
            <div className="wood-inlay-strip mt-6 mb-3" />
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] sm:text-xs font-semibold text-zinc-400 group-hover:text-white flex items-center gap-1">
                <span>♔</span>
                <span>Instant Room Creation</span>
              </span>
              <button
                type="button"
                className="clay-button-primary px-4 py-2 text-xs rounded-xl font-black whitespace-nowrap shadow-md group-hover:brightness-110 group-hover:shadow-[0_0_20px_rgba(229,184,105,0.5)] flex items-center gap-1 transition-all"
              >
                <span>Host Match</span>
                <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
              </button>
            </div>
          </div>
        </div>

        {/* Card 2: Join Lobby with Code */}
        <div
          onClick={() => {
            triggerHaptic('medium');
            onJoinLobby();
          }}
          className="clay-card clay-card-interactive p-5 sm:p-7 flex flex-col justify-between group cursor-pointer border border-[#e5b869]/30 hover:border-[#ffd88c] relative overflow-hidden bg-gradient-to-br from-[#161616] via-[#0d0d0d] to-[#050505] shadow-[0_14px_40px_rgba(0,0,0,0.9)] transition-all hover:scale-[1.015]"
        >
          {/* Brass Corner Brackets */}
          <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-[#ffd88c]/60 pointer-events-none rounded-tl-sm flex items-start justify-start p-0.5">
            <div className="brass-rivet" />
          </div>
          <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-[#ffd88c]/60 pointer-events-none rounded-tr-sm flex items-start justify-end p-0.5">
            <div className="brass-rivet" />
          </div>

          {/* Animated Metallic Gold Ray on Hover */}
          <div className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none transform -skew-x-12 -translate-x-full group-hover:translate-x-[400%] transition-transform duration-1000 ease-in-out" />

          <span className="absolute -bottom-4 -right-4 text-8xl sm:text-9xl select-none pointer-events-none opacity-[0.05] text-[#ffd88c] font-serif group-hover:opacity-[0.09] transition-opacity">
            ♞
          </span>

          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#242424] to-[#121212] border border-[#e5b869]/40 flex items-center justify-center text-[#ffd88c] shadow-[0_4px_20px_rgba(0,0,0,0.7)] group-hover:scale-110 group-hover:-rotate-3 transition-transform">
                <KeyRound className="w-6 h-6 stroke-[2.5]" />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 bg-[#141414] px-2.5 py-1 rounded-xl border border-white/15">
                6-Digit Key
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-bold font-serif text-[#ffffff] group-hover:text-[#ffd88c] transition-colors">
              Join with Code
            </h3>
            <p className="text-xs sm:text-[13px] text-zinc-400 mt-2.5 leading-relaxed">
              Enter a 6-digit match code to play your opponent or join as a spectator in live match view.
            </p>
          </div>

          <div>
            <div className="wood-inlay-strip mt-6 mb-3" />
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] sm:text-xs font-semibold text-zinc-400 group-hover:text-white flex items-center gap-1">
                <span>♞</span>
                <span>Connect to Friend</span>
              </span>
              <button
                type="button"
                className="clay-button px-4 py-2 text-xs rounded-xl font-bold whitespace-nowrap text-[#ffd88c] hover:text-white hover:border-[#ffd88c]/70 flex items-center gap-1 transition-all"
              >
                <span>Enter Code</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grandmaster Opening & Tactical Showcase (Interactive Chessboard) */}
      <div className="w-full">
        <GrandmasterShowcase onPlayBotMatch={onCreateLobby} />
      </div>

      {/* Board Atelier / Theme Switcher Banner */}
      {onOpenSettings && (
        <div
          onClick={() => {
            triggerHaptic('light');
            onOpenSettings();
          }}
          className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#141414] via-[#0c0c0c] to-[#050505] border border-[#e5b869]/30 hover:border-[#e5b869] shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer group transition-all"
        >
          <div className="flex items-center gap-3.5">
            {/* Active Theme Mini Swatch */}
            <div
              className="w-11 h-11 rounded-xl overflow-hidden shrink-0 grid grid-cols-2 grid-rows-2 border-2 shadow-md group-hover:rotate-6 transition-transform"
              style={{ borderColor: activeBoardTheme.borderColor }}
            >
              <div style={{ backgroundColor: activeBoardTheme.lightSquare }} />
              <div style={{ backgroundColor: activeBoardTheme.darkSquare }} />
              <div style={{ backgroundColor: activeBoardTheme.darkSquare }} />
              <div style={{ backgroundColor: activeBoardTheme.lightSquare }} />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold font-serif text-[#ffffff] group-hover:text-[#ffd88c] transition-colors">
                  Board Style: {activeBoardTheme.name}
                </span>
                <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-[#1c1c1c] text-[#ffd88c] border border-[#e5b869]/35">
                  {activeBoardTheme.tag}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Classic Walnut Wood is default. Tap to switch between 5 tournament styles.
              </p>
            </div>
          </div>

          <div className="clay-button px-3.5 py-1.5 text-xs text-[#ffd88c] font-bold group-hover:bg-[#1f1f1f] shrink-0 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-[#ffd88c]" />
            <span>Customize</span>
          </div>
        </div>
      )}

      {/* Analytics & Match History */}
      <div className="w-full overflow-hidden">
        <PlayerStatistics />
      </div>
    </div>
  );
};

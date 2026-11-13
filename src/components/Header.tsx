import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Send, Sparkles, Palette } from 'lucide-react';
import { UserProfile } from '../types/chess';
import { isSoundEnabled, toggleSound } from '../utils/sound';
import { isTelegramWebApp, generateInitialAvatar } from '../utils/telegram';
import { getMascotImage } from '../utils/mascot';

interface HeaderProps {
  user: UserProfile;
  onEditProfile: () => void;
  onOpenSettings?: () => void;
  onReturnToLobby?: () => void;
  onReplayIntro?: () => void;
  inGame?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onEditProfile,
  onOpenSettings,
  onReturnToLobby,
  onReplayIntro,
  inGame = false,
}) => {
  const [soundOn, setSoundOn] = useState<boolean>(isSoundEnabled());
  const [mascotImage, setMascotImageState] = useState<string>(getMascotImage);
  const isTg = isTelegramWebApp();

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        setMascotImageState(customEvent.detail);
      }
    };
    window.addEventListener('mascot_image_changed', handleUpdate);
    return () => window.removeEventListener('mascot_image_changed', handleUpdate);
  }, []);

  const handleToggleSound = () => {
    const next = toggleSound();
    setSoundOn(next);
  };

  return (
    <header className="flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-6 py-2.5 sm:py-3 border-b border-[#e5b869]/25 bg-[#080808]/98 backdrop-blur-xl sticky top-0 z-30 max-w-full overflow-hidden shadow-xl shrink-0">
      {/* Zone 1: Brand title wordmark with Mikasa Mascot icon */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink">
        <button
          onClick={onReturnToLobby}
          className="flex items-center gap-2 sm:gap-2.5 group text-left cursor-pointer hover:opacity-95 transition-opacity min-w-0"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl overflow-hidden border-2 border-[#e5b869] shadow-[0_0_12px_rgba(229,184,105,0.35)] shrink-0 bg-[#141414]">
            <img
              src={mascotImage}
              alt="Mikasa"
              className="w-full h-full object-cover object-top"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/assets/mikasa.jpg';
              }}
            />
          </div>
          <div className="min-w-0">
            <span className="font-extrabold text-sm sm:text-base md:text-lg tracking-wider text-[#ffffff] whitespace-nowrap block leading-tight truncate font-serif">
              MIKASA <span className="text-[#ffd88c]">CHESS</span>
            </span>
            <span className="text-[10px] text-zinc-400 font-mono hidden sm:block tracking-wider uppercase">
              Staunton Walnut Atelier · 2,850+
            </span>
          </div>
        </button>

        {isTg && (
          <span className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#1c1c1c] text-[#ffd88c] border border-[#e5b869]/35 whitespace-nowrap shrink-0">
            <Send className="w-2.5 h-2.5" />
            Telegram
          </span>
        )}
      </div>

      {/* Zone 2: Action controls, Intro replay & Sound toggle */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Intro Replay Button */}
        {onReplayIntro && !inGame && (
          <button
            onClick={onReplayIntro}
            title="Replay Welcome Animation"
            className="clay-button px-2 sm:px-2.5 py-1.5 flex items-center gap-1 text-[11px] sm:text-xs text-[#ffd88c] hover:text-[#ffffff] cursor-pointer shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#ffd88c]" />
            <span className="hidden sm:inline font-semibold">Intro</span>
          </button>
        )}

        {/* Board Style / Settings button */}
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            title="Board Themes & Settings"
            className="clay-button px-2.5 sm:px-3 py-1.5 flex items-center gap-1.5 text-[11px] sm:text-xs text-[#ffd88c] hover:text-[#ffffff] hover:border-[#e5b869]/60 cursor-pointer shrink-0 shadow-sm"
          >
            <Palette className="w-3.5 h-3.5 text-[#ffd88c]" />
            <span className="hidden min-[480px]:inline font-semibold">Themes</span>
          </button>
        )}

        {/* Sound toggle button */}
        <button
          onClick={handleToggleSound}
          title={soundOn ? 'Sound is ON' : 'Sound is OFF'}
          aria-label="Toggle Sound"
          className={`clay-button px-2 sm:px-2.5 py-1.5 flex items-center gap-1.5 text-[11px] sm:text-xs cursor-pointer shrink-0 ${
            soundOn ? 'text-[#ffd88c]' : 'text-zinc-500 opacity-80'
          }`}
        >
          {soundOn ? <Volume2 className="w-3.5 h-3.5 text-[#ffd88c]" /> : <VolumeX className="w-3.5 h-3.5" />}
          <span className="hidden md:inline font-medium">
            {soundOn ? 'Sound ON' : 'Sound OFF'}
          </span>
        </button>

        {/* User Profile Pill */}
        <button
          onClick={onEditProfile}
          title="Edit Profile & Avatar"
          className="clay-button px-2 sm:px-2.5 py-1 sm:py-1.5 flex items-center gap-1.5 text-[11px] sm:text-xs cursor-pointer hover:border-[#e5b869]/60 shrink-0 max-w-[130px] sm:max-w-[170px]"
        >
          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full overflow-hidden bg-[#141414] flex items-center justify-center shrink-0 border border-[#e5b869]/40">
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
          <span className="font-semibold text-[#ffffff] truncate">
            {user.name}
          </span>
        </button>
      </div>
    </header>
  );
};

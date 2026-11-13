import React, { useState, useRef, useEffect } from 'react';
import { Eye, User as UserIcon, X } from 'lucide-react';
import { Spectator } from '../types/chess';
import { triggerHaptic } from '../utils/telegram';

interface SpectatorIndicatorProps {
  spectators: Spectator[];
}

export const SpectatorIndicator: React.FC<SpectatorIndicatorProps> = ({ spectators }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Requirement: "The eye button should only be displayed when someone is spectating the match."
  if (!spectators || spectators.length === 0) {
    return null;
  }

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const toggleOpen = () => {
    triggerHaptic('light');
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Eye Button at top of match interface */}
      <button
        onClick={toggleOpen}
        title="View Match Spectators"
        aria-label="Spectators watching this game"
        className="clay-button px-3 py-1.5 flex items-center gap-2 text-xs cursor-pointer border border-amber-500/30 hover:border-amber-400/60 shadow-md group animate-pulse"
      >
        <Eye className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
        <span className="font-bold text-amber-300 tabular-nums">
          {spectators.length}
        </span>
        <span className="hidden sm:inline text-slate-300 font-medium">
          {spectators.length === 1 ? 'Spectator' : 'Spectators'}
        </span>
      </button>

      {/* Popover showing Spectator's DP (profile picture) and profile name */}
      {isOpen && (
        <div className="absolute right-0 sm:left-1/2 sm:-translate-x-1/2 top-full mt-2 w-72 glass-panel rounded-2xl p-4 shadow-2xl z-50 border border-white/15 animate-fadeIn">
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/10">
            <div className="flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Live Spectators ({spectators.length})
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-0.5 rounded-lg hover:bg-white/5 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
            {spectators.map((spec) => (
              <div
                key={spec.user.id}
                className="flex items-center gap-3 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors border border-white/5"
              >
                {/* Spectator's DP (Profile Picture) */}
                <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-800 border border-white/15 shrink-0 flex items-center justify-center">
                  {spec.user.avatarUrl ? (
                    <img
                      src={spec.user.avatarUrl}
                      alt={spec.user.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <UserIcon className="w-4 h-4 text-slate-400" />
                  )}
                </div>

                {/* Spectator's Profile Name */}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-100 truncate">
                    {spec.user.name}
                  </div>
                  {spec.user.username ? (
                    <div className="text-[10px] text-slate-400 font-mono truncate">
                      @{spec.user.username}
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-500">Spectating live</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

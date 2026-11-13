import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { LobbyView } from './components/LobbyView';
import { CreateLobbyModal } from './components/CreateLobbyModal';
import { JoinLobbyModal } from './components/JoinLobbyModal';
import { EditProfileModal } from './components/EditProfileModal';
import { BoardSettingsModal } from './components/BoardSettingsModal';
import { WaitingRoomView } from './components/WaitingRoomView';
import { GameMatchView } from './components/GameMatchView';
import { StartingAnimation } from './components/StartingAnimation';
import { useGameSocket } from './hooks/useGameSocket';
import {
  getInitialUserProfile,
  getTelegramStartParam,
  getActiveRoomCode,
  isTelegramWebApp,
  saveUserProfile,
  generateInitialAvatar,
  fetchAndCacheTelegramAvatar,
  extractTelegramUser,
} from './utils/telegram';
import { GameRules, UserProfile } from './types/chess';
import { AlertCircle } from 'lucide-react';
import { LuxuryLoadingOverlay } from './components/LuxuryLoadingOverlay';

export default function App() {
  const [user, setUser] = useState<UserProfile>(() => getInitialUserProfile());
  const [showIntro, setShowIntro] = useState<boolean>(() => {
    // If opening via a match link or returning to active match, jump directly in
    return !Boolean(getTelegramStartParam() || getActiveRoomCode());
  });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [initialJoinCode, setInitialJoinCode] = useState('');
  const autoJoinAttemptsRef = useRef<Set<string>>(new Set());
  const [toastError, setToastError] = useState<string | null>(null);
  const [loadingState, setLoadingState] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    type?: 'bot' | 'room' | 'join' | 'rematch';
  }>({ isOpen: false, title: '' });

  const {
    connected,
    currentRoom,
    userRole,
    errorMessage,
    unreadChatCount,
    typingUsers,
    awayUsers,
    setChatOpen,
    setTyping,
    rematchRoom,
    createRoom,
    joinRoom,
    makeMove,
    offerDraw,
    respondDraw,
    resign,
    sendChatMessage,
    addReaction,
    leaveRoom,
  } = useGameSocket(user);

  // Sync profile when updated (e.g. avatar fetched from Telegram in background)
  useEffect(() => {
    const handleProfileUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<UserProfile>;
      if (customEvent.detail) {
        setUser(customEvent.detail);
      }
    };
    window.addEventListener('user_profile_updated', handleProfileUpdate);
    return () => window.removeEventListener('user_profile_updated', handleProfileUpdate);
  }, []);

  // Initialize Telegram identity early, then replace it with the server-verified
  // profile once Telegram's signed initData is available.
  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    webApp?.ready?.();
    webApp?.expand?.();

    let cancelled = false;
    let attempts = 0;
    let authStarted = false;

    const applyTelegramProfile = (tgUser: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      photo_url?: string;
    }) => {
      if (cancelled || !tgUser?.id) return;
      const fullName =
        [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') ||
        tgUser.username || 'Telegram Player';

      setUser((prev) => {
        // Do not let an old/late guest profile overwrite a Telegram identity.
        if (prev.id === tgUser.id && prev.name === fullName && prev.avatarUrl === tgUser.photo_url) {
          return prev;
        }
        const avatar = tgUser.photo_url ||
          (String(prev.id) === String(tgUser.id) && prev.avatarUrl && !prev.avatarUrl.includes('AlphaRook') && !prev.avatarUrl.includes('QuantumKnight')
            ? prev.avatarUrl : generateInitialAvatar(fullName));
        const updated: UserProfile = {
          id: tgUser.id,
          name: fullName,
          username: tgUser.username,
          avatarUrl: avatar,
          isBot: false,
        };
        saveUserProfile(updated);
        if (!tgUser.photo_url) void fetchAndCacheTelegramAvatar(tgUser.id, updated);
        return updated;
      });
    };

    const syncTelegramUser = async () => {
      if (cancelled) return;
      attempts += 1;

      // Use Telegram's WebApp user object immediately for display while signed
      // initData is loading; the server response remains the verified source.
      const unsafeUser = extractTelegramUser();
      if (unsafeUser) applyTelegramProfile(unsafeUser);

      const initData = window.Telegram?.WebApp?.initData || '';
      if (initData && !authStarted) {
        authStarted = true;
        try {
          const response = await fetch('/api/telegram-auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData }),
          });
          if (!response.ok) {
            const details = await response.text().catch(() => '');
            throw new Error(`Telegram auth failed (${response.status}) ${details}`);
          }
          const result = await response.json();
          if (result?.user) applyTelegramProfile(result.user);
        } catch (error) {
          console.warn('[Telegram] Could not verify Mini App profile:', error);
        }
      }

      // Telegram's bridge can become available shortly after the React bundle.
      if (!authStarted && attempts < 20 && !cancelled) {
        window.setTimeout(() => void syncTelegramUser(), 250);
      }
    };

    void syncTelegramUser();
    return () => {
      cancelled = true;
    };
  }, []);

  // Check for deep link / Telegram start_param or active session restoration
  useEffect(() => {
    const startParam = getTelegramStartParam();
    const activeCode = getActiveRoomCode();
    const targetRoom = (startParam || activeCode)?.toUpperCase();

    if (!targetRoom || !connected || currentRoom || autoJoinAttemptsRef.current.has(targetRoom)) return;

    // React StrictMode and socket state updates can re-run this effect. Mark the
    // code before joining so the same launch never emits duplicate join requests.
    autoJoinAttemptsRef.current.add(targetRoom);
    joinRoom(targetRoom, false).catch((err) => {
      // If not found or stale, notify gently. Do not auto-retry and double-join.
      if (startParam) {
        setToastError(err.message || 'Could not join lobby from link');
        setTimeout(() => setToastError(null), 4000);
      }
    });
  }, [connected, currentRoom, joinRoom]);

  // Display socket errors
  useEffect(() => {
    if (errorMessage) {
      setLoadingState({ isOpen: false, title: '' });
      setToastError(errorMessage);
      const timer = setTimeout(() => setToastError(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Dismiss luxury loader when room updates
  useEffect(() => {
    if (currentRoom) {
      setLoadingState({ isOpen: false, title: '' });
    }
  }, [currentRoom]);

  const handleCreateLobbySubmit = async (rules: GameRules) => {
    try {
      setIsCreateModalOpen(false);
      setLoadingState({
        isOpen: true,
        title: rules.isBotGame ? 'PREPARING BOT DUEL' : 'CREATING MATCH SALON',
        subtitle: rules.isBotGame
          ? 'Stockfish 2,850+ engine is setting up Staunton pieces & clocks...'
          : 'Setting up private royal match salon...',
        type: rules.isBotGame ? 'bot' : 'room',
      });
      await createRoom(rules);
    } catch (err: unknown) {
      setLoadingState({ isOpen: false, title: '' });
      const msg = err instanceof Error ? err.message : 'Failed to create lobby';
      setToastError(msg);
      setTimeout(() => setToastError(null), 4000);
    }
  };

  const handleJoinLobbySubmit = async (code: string, asSpectator?: boolean) => {
    try {
      setIsJoinModalOpen(false);
      setLoadingState({
        isOpen: true,
        title: asSpectator ? 'ENTERING AS SPECTATOR' : 'JOINING MATCH ROOM',
        subtitle: `Connecting to match room ${code.toUpperCase()}...`,
        type: 'join',
      });
      await joinRoom(code, asSpectator);
    } catch (err: unknown) {
      setLoadingState({ isOpen: false, title: '' });
      const msg = err instanceof Error ? err.message : 'Failed to join lobby';
      setToastError(msg);
      setTimeout(() => setToastError(null), 4000);
    }
  };

  const handleRematch = async () => {
    if (!currentRoom) return;
    try {
      setLoadingState({
        isOpen: true,
        title: 'PREPARING REMATCH',
        subtitle: 'Resetting board, alternating pieces & resetting clocks...',
        type: 'rematch',
      });
      const ok = await rematchRoom();
      if (!ok) {
        await createRoom(currentRoom.gameRules);
      }
    } catch {
      setLoadingState({ isOpen: false, title: '' });
      leaveRoom();
    }
  };

  // Determine current view
  let view: 'lobby' | 'waiting' | 'match' = 'lobby';
  if (currentRoom) {
    if (currentRoom.status === 'waiting') {
      view = 'waiting';
    } else {
      view = 'match';
    }
  }

  return (
    <div className="min-h-[100dvh] h-[100dvh] bg-[#050806] text-white flex flex-col font-sans selection:bg-[#e5b869]/30 overflow-hidden">
      {/* Top Header */}
      <Header
        user={user}
        onEditProfile={() => setIsEditProfileOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onReturnToLobby={currentRoom ? leaveRoom : undefined}
        onReplayIntro={() => setShowIntro(true)}
        inGame={view !== 'lobby'}
      />

      {/* Starting Animation with Mascot */}
      {showIntro && (
        <StartingAnimation
          onComplete={() => setShowIntro(false)}
          mascotSrc="/assets/mikasa.jpg"
        />
      )}

      {/* Floating Error Toast */}
      {toastError && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-rose-950/90 border border-rose-500/50 text-rose-200 text-xs font-semibold flex items-center gap-2 shadow-2xl animate-bounce">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{toastError}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col w-full min-h-0 overflow-y-auto overflow-x-hidden">
        {view === 'lobby' && (
          <LobbyView
            user={user}
            onCreateLobby={() => setIsCreateModalOpen(true)}
            onJoinLobby={() => {
              setInitialJoinCode('');
              setIsJoinModalOpen(true);
            }}
            onEditProfile={() => setIsEditProfileOpen(true)}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        )}

        {view === 'waiting' && currentRoom && (
          <WaitingRoomView
            room={currentRoom}
            currentUser={user}
            onCancel={leaveRoom}
          />
        )}

        {view === 'match' && currentRoom && (
          <GameMatchView
            room={currentRoom}
            currentUser={user}
            userRole={userRole}
            unreadChatCount={unreadChatCount}
            onSetChatOpen={setChatOpen}
            onMakeMove={makeMove}
            onOfferDraw={offerDraw}
            onRespondDraw={respondDraw}
            onResign={resign}
            onSendMessage={sendChatMessage}
            onAddReaction={addReaction}
            onReturnToLobby={leaveRoom}
            onRematch={handleRematch}
            typingUsers={typingUsers}
            awayUsers={awayUsers}
            onSetTyping={setTyping}
          />
        )}
      </main>

      {/* Modals */}
      <CreateLobbyModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateLobbySubmit}
      />

      <JoinLobbyModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        onJoin={handleJoinLobbySubmit}
        initialCode={initialJoinCode}
      />

      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        currentUser={user}
        onSave={(updated) => setUser(updated)}
      />

      <BoardSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Top 3px Luxury Golden Laser Progress Line (Glows across the screen on any long action) */}
      {loadingState.isOpen && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-black z-[130] overflow-hidden pointer-events-none">
          <div className="h-full luxury-gold-progress-fill animate-indeterminate-beam shadow-[0_0_12px_#ffd88c]" />
        </div>
      )}

      {/* Luxury Loading Modal Overlay for Asynchronous Operations */}
      <LuxuryLoadingOverlay
        isOpen={loadingState.isOpen}
        title={loadingState.title}
        subtitle={loadingState.subtitle}
        type={loadingState.type}
        onCancel={() => setLoadingState({ isOpen: false, title: '' })}
      />
    </div>
  );
}

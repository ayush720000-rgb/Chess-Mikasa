import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  GameRules,
  RoomState,
  UserProfile,
  ChatMessage,
} from '../types/chess';
import { playCaptureSound, playCheckSound, playMoveSound } from '../utils/sound';
import { setActiveRoomCode, clearActiveRoomCode } from '../utils/telegram';

export function useGameSocket(currentUser: UserProfile) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [currentRoom, setCurrentRoom] = useState<RoomState | null>(null);
  const [userRole, setUserRole] = useState<'white' | 'black' | 'spectator' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const [awayUsers, setAwayUsers] = useState<Record<string, boolean>>({});
  const isChatOpenRef = useRef<boolean>(false);
  const currentRoomRef = useRef<RoomState | null>(null);
  const currentUserRef = useRef<UserProfile>(currentUser);

  useEffect(() => {
    currentUserRef.current = currentUser;
    // Broadcast latest user profile to active room so opponent instantly sees real name and DP
    if (socket && connected && currentRoomRef.current?.code) {
      socket.emit('update_player_profile', {
        roomCode: currentRoomRef.current.code,
        user: currentUser,
      });
    }
  }, [currentUser, socket, connected]);

  useEffect(() => {
    currentRoomRef.current = currentRoom;
  }, [currentRoom]);

  // Initialize socket connection with automatic reconnect
  useEffect(() => {
    const s = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    s.on('connect', () => {
      setConnected(true);
      setErrorMessage(null);

      // If already in a room, re-authenticate and sync with server upon reconnect
      if (currentRoomRef.current) {
        s.emit('join_room', {
          roomCode: currentRoomRef.current.code,
          user: currentUserRef.current,
        });
      }
    });

    s.on('disconnect', () => {
      setConnected(false);
    });

    s.on('connect_error', () => {
      // Handled silently by automatic reconnection
    });

    s.on('room_state', (room: RoomState) => {
      setCurrentRoom(room);

      // Determine user role based on authoritatively stored player IDs
      const currentUserId = String(currentUserRef.current.id);
      if (room.whitePlayer && String(room.whitePlayer.user.id) === currentUserId) {
        setUserRole('white');
      } else if (room.blackPlayer && String(room.blackPlayer.user.id) === currentUserId) {
        setUserRole('black');
      } else {
        setUserRole('spectator');
      }

      // Persist active room if match is ongoing
      if (room.status !== 'finished') {
        setActiveRoomCode(room.code);
      } else {
        clearActiveRoomCode();
      }
    });

    s.on('move_sound', (data: { isCapture: boolean; isCheck: boolean }) => {
      if (data.isCheck) {
        playCheckSound();
      } else if (data.isCapture) {
        playCaptureSound();
      } else {
        playMoveSound();
      }
    });

    s.on('new_chat_message', (msg: ChatMessage) => {
      if (!isChatOpenRef.current && String(msg.senderId) !== String(currentUserRef.current.id)) {
        setUnreadChatCount((prev) => prev + 1);
      }
    });

    s.on('player_typing_status', (data: { userId: string | number; isTyping: boolean }) => {
      setTypingUsers((prev) => ({
        ...prev,
        [String(data.userId)]: Boolean(data.isTyping),
      }));
    });

    s.on('player_presence_status', (data: { userId: string | number; isAway: boolean }) => {
      setAwayUsers((prev) => ({
        ...prev,
        [String(data.userId)]: Boolean(data.isAway),
      }));
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  const setChatOpen = useCallback((open: boolean) => {
    isChatOpenRef.current = open;
    if (open) {
      setUnreadChatCount(0);
    }
  }, []);

  const createRoom = useCallback(
    (rules: GameRules): Promise<RoomState> => {
      return new Promise((resolve, reject) => {
        if (!socket) {
          reject(new Error('Connecting to server... Please try again.'));
          return;
        }

        socket.emit(
          'create_room',
          { user: currentUser, gameRules: rules },
          (response: { success: boolean; room: RoomState }) => {
            if (response.success && response.room) {
              setCurrentRoom(response.room);
              setActiveRoomCode(response.room.code);
              const hostColor =
                String(response.room.whitePlayer?.user.id) === String(currentUser.id)
                  ? 'white'
                  : 'black';
              setUserRole(hostColor);
              resolve(response.room);
            } else {
              reject(new Error('Failed to create room'));
            }
          }
        );
      });
    },
    [socket, currentUser]
  );

  const joinRoom = useCallback(
    (code: string, asSpectator: boolean = false): Promise<RoomState> => {
      return new Promise((resolve, reject) => {
        if (!socket) {
          reject(new Error('Connecting to server... Please wait.'));
          return;
        }

        socket.emit(
          'join_room',
          { roomCode: code.toUpperCase(), user: currentUser, asSpectator },
          (response: {
            success: boolean;
            room?: RoomState;
            role?: 'white' | 'black' | 'spectator';
            error?: string;
          }) => {
            if (response.success && response.room) {
              setCurrentRoom(response.room);
              setActiveRoomCode(response.room.code);
              setUserRole(response.role || 'spectator');
              setErrorMessage(null);
              resolve(response.room);
            } else {
              setErrorMessage(response.error || 'Failed to join lobby');
              reject(new Error(response.error || 'Failed to join lobby'));
            }
          }
        );
      });
    },
    [socket, currentUser]
  );

  const makeMove = useCallback(
    (move: { from: string; to: string; promotion?: string }): Promise<boolean> => {
      return new Promise((resolve) => {
        const room = currentRoomRef.current;
        const user = currentUserRef.current;
        if (!socket || !room) {
          resolve(false);
          return;
        }

        socket.emit(
          'make_move',
          {
            roomCode: room.code,
            userId: user.id,
            move: {
              from: move.from.toLowerCase(),
              to: move.to.toLowerCase(),
              promotion: move.promotion ? move.promotion.toLowerCase() : undefined,
            },
          },
          (res: { success: boolean; error?: string }) => {
            if (!res.success && res.error) {
              setErrorMessage(res.error);
            } else {
              setErrorMessage(null);
            }
            resolve(res.success);
          }
        );
      });
    },
    [socket]
  );

  const offerDraw = useCallback(() => {
    const room = currentRoomRef.current;
    const user = currentUserRef.current;
    if (!socket || !room) return;
    socket.emit('offer_draw', {
      roomCode: room.code,
      userId: user.id,
    });
  }, [socket]);

  const respondDraw = useCallback(
    (accept: boolean) => {
      const room = currentRoomRef.current;
      const user = currentUserRef.current;
      if (!socket || !room) return;
      socket.emit('respond_draw', {
        roomCode: room.code,
        userId: user.id,
        accept,
      });
    },
    [socket]
  );

  const resign = useCallback(() => {
    const room = currentRoomRef.current;
    const user = currentUserRef.current;
    if (!socket || !room) return;
    socket.emit('resign', {
      roomCode: room.code,
      userId: user.id,
    });
  }, [socket]);

  const sendChatMessage = useCallback(
    (text: string, replyTo?: { id: string; senderName: string; text: string } | null) => {
      const room = currentRoomRef.current;
      const user = currentUserRef.current;
      if (!socket || !room) return;
      socket.emit('send_chat', {
        roomCode: room.code,
        message: {
          senderId: user.id,
          senderName: user.name,
          senderAvatar: user.avatarUrl,
          isSpectator: userRole === 'spectator',
          text,
          replyTo,
        },
      });
    },
    [socket, userRole]
  );

  const addReaction = useCallback(
    (messageId: string, emoji: string) => {
      const room = currentRoomRef.current;
      const user = currentUserRef.current;
      if (!socket || !room) return;
      socket.emit('react_chat', {
        roomCode: room.code,
        messageId,
        emoji,
        user: {
          id: user.id,
          name: user.name,
          avatarUrl: user.avatarUrl,
        },
      });
    },
    [socket]
  );

  const leaveRoom = useCallback(() => {
    if (socket && currentRoom) {
      socket.emit('leave_room', {
        roomCode: currentRoom.code,
        userId: currentUser.id,
      });
    }
    clearActiveRoomCode();
    setCurrentRoom(null);
    setUserRole(null);
    setErrorMessage(null);
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [socket, currentRoom, currentUser.id]);

  const setTyping = useCallback(
    (isTyping: boolean) => {
      if (!socket || !currentRoomRef.current) return;
      socket.emit('set_typing', {
        roomCode: currentRoomRef.current.code,
        userId: currentUserRef.current.id,
        isTyping,
      });
    },
    [socket]
  );

  const setAway = useCallback(
    (isAway: boolean) => {
      if (!socket || !currentRoomRef.current) return;
      socket.emit('set_presence', {
        roomCode: currentRoomRef.current.code,
        userId: currentUserRef.current.id,
        isAway,
      });
    },
    [socket]
  );

  // Auto-track browser tab switching and window blur/focus for Away status
  useEffect(() => {
    const handleVisibilityChange = () => {
      setAway(document.hidden);
    };
    const handleWindowBlur = () => setAway(true);
    const handleWindowFocus = () => setAway(false);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [setAway]);

  const rematchRoom = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!socket || !currentRoomRef.current) {
        resolve(false);
        return;
      }
      socket.emit(
        'request_rematch',
        {
          roomCode: currentRoomRef.current.code,
          userId: currentUserRef.current.id,
        },
        (res: { success: boolean }) => {
          resolve(Boolean(res?.success));
        }
      );
    });
  }, [socket]);

  return {
    connected,
    currentRoom,
    userRole,
    errorMessage,
    unreadChatCount,
    typingUsers,
    awayUsers,
    setChatOpen,
    setTyping,
    setAway,
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
    setCurrentRoom,
  };
}

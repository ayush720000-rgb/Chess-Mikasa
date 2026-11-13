import express from 'express';
import http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { RoomManager } from './src/server/roomManager';
import { TelegramBotService } from './src/server/telegramBot';
import { GameRules, UserProfile, RoomState } from './src/types/chess';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new SocketIOServer(server, {
    cors: { origin: '*' },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  const appUrl = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000';
  const roomManager = new RoomManager();
  const telegramBot = new TelegramBotService(appUrl);

  // Hook RoomManager asynchronous events (AI bot moves, automated timer resolutions) to Socket.io
  roomManager.setOnRoomStateChanged((room, sound) => {
    io.to(`room:${room.code.toUpperCase()}`).emit('room_state', room);
    if (sound) {
      io.to(`room:${room.code.toUpperCase()}`).emit('move_sound', sound);
    }
  });

  app.use(express.json());

  // REST endpoints
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  app.get('/api/bot-info', (req, res) => {
    res.json(telegramBot.getInfo());
  });

  // Verify Telegram Mini App initData with the bot token before trusting user details.
  app.post('/api/telegram-auth', (req, res) => {
    const initData = typeof req.body?.initData === 'string' ? req.body.initData : '';
    const token = (process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || '').trim();
    if (!token || !initData) {
      return res.status(400).json({ error: 'Telegram authentication data or bot token is missing.' });
    }

    try {
      const params = new URLSearchParams(initData);
      const receivedHash = params.get('hash');
      if (!receivedHash || !/^[a-f0-9]{64}$/i.test(receivedHash)) {
        return res.status(401).json({ error: 'Invalid Telegram authentication hash.' });
      }

      params.delete('hash');
      const dataCheckString = [...params.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
      const secretKey = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
      const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest();
      const suppliedHash = Buffer.from(receivedHash, 'hex');
      if (suppliedHash.length !== calculatedHash.length || !crypto.timingSafeEqual(suppliedHash, calculatedHash)) {
        return res.status(401).json({ error: 'Telegram authentication could not be verified.' });
      }

      const authDate = Number(params.get('auth_date'));
      const now = Math.floor(Date.now() / 1000);
      if (!Number.isFinite(authDate) || authDate > now + 60 || now - authDate > 86400) {
        return res.status(401).json({ error: 'Telegram authentication data has expired. Reopen the Mini App.' });
      }

      const userRaw = params.get('user');
      if (!userRaw) return res.status(401).json({ error: 'Telegram user data is missing.' });
      const user = JSON.parse(userRaw);
      if (!Number.isSafeInteger(user.id) || !user.first_name) {
        return res.status(401).json({ error: 'Telegram user data is invalid.' });
      }
      return res.json({
        ok: true,
        user: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name || undefined,
          username: user.username || undefined,
          language_code: user.language_code || undefined,
          photo_url: user.photo_url || undefined
        }
      });
    } catch (error) {
      console.error('[TelegramAuth] Verification failed:', error);
      return res.status(400).json({ error: 'Could not read Telegram authentication data.' });
    }
  });

  app.get('/api/lobby/:code', (req, res) => {
    const room = roomManager.getRoom(req.params.code);
    if (!room) {
      return res.status(404).json({ error: 'Lobby not found' });
    }
    return res.json(room);
  });

  app.get('/api/user-avatar/:userId', async (req, res) => {
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    const avatar = await telegramBot.fetchUserAvatarBase64(userId);
    res.json({ avatarUrl: avatar || null });
  });

  // Socket.io handlers
  io.on('connection', (socket: Socket) => {
    let currentRoomCode: string | null = null;
    let currentUser: UserProfile | null = null;

    socket.on('create_room', (data: { user: UserProfile; gameRules: GameRules }, callback) => {
      const room = roomManager.createRoom(data.user, data.gameRules);
      currentRoomCode = room.code;
      currentUser = data.user;
      socket.join(`room:${room.code}`);

      if (typeof callback === 'function') {
        callback({ success: true, room });
      }
      io.to(`room:${room.code}`).emit('room_state', room);
    });

    socket.on(
      'join_room',
      (
        data: { roomCode: string; user: UserProfile; asSpectator?: boolean },
        callback
      ) => {
        const result = roomManager.joinRoom(data.roomCode, data.user, data.asSpectator);
        if ('error' in result && !('room' in result)) {
          if (typeof callback === 'function') {
            callback({ success: false, error: result.error });
          }
          return;
        }

        const successResult = result as {
          room: RoomState;
          role: 'white' | 'black' | 'spectator';
        };

        currentRoomCode = data.roomCode.toUpperCase();
        currentUser = data.user;
        socket.join(`room:${currentRoomCode}`);

        if (typeof callback === 'function') {
          callback({ success: true, room: successResult.room, role: successResult.role });
        }
        io.to(`room:${currentRoomCode}`).emit('room_state', successResult.room);
      }
    );

    socket.on(
      'make_move',
      (
        data: {
          roomCode: string;
          userId: string | number;
          move: { from: string; to: string; promotion?: string };
        },
        callback
      ) => {
        const res = roomManager.makeMove(data.roomCode, data.userId, data.move);
        if (typeof callback === 'function') {
          callback(res);
        }
        if (res.success && res.room) {
          io.to(`room:${data.roomCode.toUpperCase()}`).emit('room_state', res.room);
          io.to(`room:${data.roomCode.toUpperCase()}`).emit('move_sound', {
            isCapture: res.room.lastMove?.san?.includes('x') || false,
            isCheck:
              res.room.lastMove?.san?.includes('+') ||
              res.room.lastMove?.san?.includes('#') ||
              false,
          });
        } else {
          // If move rejected, restore client's board to authoritative server FEN
          const current = roomManager.getRoom(data.roomCode);
          if (current) {
            socket.emit('room_state', current);
          }
        }
      }
    );

    socket.on('offer_draw', (data: { roomCode: string; userId: string | number }) => {
      const room = roomManager.offerDraw(data.roomCode, data.userId);
      if (room) {
        io.to(`room:${data.roomCode.toUpperCase()}`).emit('room_state', room);
        io.to(`room:${data.roomCode.toUpperCase()}`).emit('draw_offered', {
          offeredByUserId: data.userId,
        });
      }
    });

    socket.on(
      'respond_draw',
      (data: { roomCode: string; userId: string | number; accept: boolean }) => {
        const room = roomManager.respondDraw(data.roomCode, data.userId, data.accept);
        if (room) {
          io.to(`room:${data.roomCode.toUpperCase()}`).emit('room_state', room);
        }
      }
    );

    socket.on('resign', (data: { roomCode: string; userId: string | number }) => {
      const room = roomManager.resign(data.roomCode, data.userId);
      if (room) {
        io.to(`room:${data.roomCode.toUpperCase()}`).emit('room_state', room);
        io.to(`room:${data.roomCode.toUpperCase()}`).emit('player_resigned', {
          userId: data.userId,
        });
      }
    });

    socket.on(
      'send_chat',
      (data: {
        roomCode: string;
        message: {
          senderId: string | number;
          senderName: string;
          senderAvatar?: string;
          isSpectator: boolean;
          text: string;
          replyTo?: { id: string; senderName: string; text: string } | null;
        };
      }) => {
        const msg = roomManager.addChatMessage(data.roomCode, data.message);
        if (msg) {
          const room = roomManager.getRoom(data.roomCode);
          if (room) {
            io.to(`room:${data.roomCode.toUpperCase()}`).emit('room_state', room);
            io.to(`room:${data.roomCode.toUpperCase()}`).emit('new_chat_message', msg);
          }
        }
      }
    );

    socket.on(
      'react_chat',
      (data: {
        roomCode: string;
        messageId: string;
        emoji: string;
        userId?: string | number;
        user?: { id: string | number; name: string; avatarUrl?: string };
      }) => {
        const reactorUserId = data.user?.id || data.userId || (currentUser ? currentUser.id : 'unknown');
        const reactorName = data.user?.name || (currentUser ? currentUser.name : 'Player');
        const reactorAvatar = data.user?.avatarUrl || (currentUser ? currentUser.avatarUrl : undefined);

        const room = roomManager.addReaction(
          data.roomCode,
          data.messageId,
          data.emoji,
          {
            userId: reactorUserId,
            name: reactorName,
            avatarUrl: reactorAvatar,
          }
        );
        if (room) {
          io.to(`room:${data.roomCode.toUpperCase()}`).emit('room_state', room);
        }
      }
    );

    socket.on('update_player_profile', (data: { roomCode: string; user: UserProfile }) => {
      if (!data?.roomCode || !data?.user) return;
      currentUser = data.user;
      const room = roomManager.updatePlayerProfile(data.roomCode, data.user);
      if (room) {
        io.to(`room:${data.roomCode.toUpperCase()}`).emit('room_state', room);
      }
    });

    socket.on('set_typing', (data: { roomCode: string; userId: string | number; isTyping: boolean }) => {
      if (!data?.roomCode) return;
      socket.to(`room:${data.roomCode.toUpperCase()}`).emit('player_typing_status', {
        userId: data.userId,
        isTyping: Boolean(data.isTyping),
      });
    });

    socket.on('set_presence', (data: { roomCode: string; userId: string | number; isAway: boolean }) => {
      if (!data?.roomCode) return;
      socket.to(`room:${data.roomCode.toUpperCase()}`).emit('player_presence_status', {
        userId: data.userId,
        isAway: Boolean(data.isAway),
      });
    });

    socket.on('request_rematch', (data: { roomCode: string; userId: string | number }, callback) => {
      if (!data?.roomCode) return;
      const room = roomManager.rematchMatch(data.roomCode, data.userId);
      if (room) {
        io.to(`room:${data.roomCode.toUpperCase()}`).emit('room_state', room);
        if (typeof callback === 'function') callback({ success: true, room });
      } else {
        if (typeof callback === 'function') callback({ success: false });
      }
    });

    socket.on('leave_room', (data: { roomCode: string; userId: string | number }) => {
      const code = (data?.roomCode || currentRoomCode)?.toUpperCase();
      const uid = data?.userId || currentUser?.id;
      if (code) {
        socket.leave(`room:${code}`);
        if (uid) {
          const updated = roomManager.handleUserDisconnect(code, uid);
          if (updated) {
            io.to(`room:${code}`).emit('room_state', updated);
          }
          io.to(`room:${code}`).emit('player_presence_status', {
            userId: uid,
            isAway: true,
          });
          io.to(`room:${code}`).emit('player_typing_status', {
            userId: uid,
            isTyping: false,
          });
        }
      }
      if (currentRoomCode === code) {
        currentRoomCode = null;
      }
    });

    socket.on('disconnect', () => {
      if (currentRoomCode && currentUser) {
        io.to(`room:${currentRoomCode}`).emit('player_presence_status', {
          userId: currentUser.id,
          isAway: true,
        });
        io.to(`room:${currentRoomCode}`).emit('player_typing_status', {
          userId: currentUser.id,
          isTyping: false,
        });
        const updated = roomManager.handleUserDisconnect(currentRoomCode, currentUser.id);
        if (updated) {
          io.to(`room:${currentRoomCode}`).emit('room_state', updated);
        }
      }
    });
  });

  const isProduction = process.env.NODE_ENV === 'production';
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`ChessNow fullstack server running on http://0.0.0.0:${port}`);
  });

  process.once('SIGINT', () => {
    telegramBot.stop();
  });
  process.once('SIGTERM', () => {
    telegramBot.stop();
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
});

import { Chess } from 'chess.js';
import {
  Color,
  GameRules,
  RoomState,
  UserProfile,
  ChatMessage,
  PlayerState,
  ChatReactionUser,
} from '../types/chess';
import { computeBestMove, computeBestMoveAsync, getBotMetadata } from '../utils/chessBot';

function generateLobbyCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export class RoomManager {
  private rooms: Map<string, RoomState> = new Map();
  private chessInstances: Map<string, Chess> = new Map();
  private botTimers: Map<string, NodeJS.Timeout> = new Map();
  private clockInterval?: NodeJS.Timeout;
  private onRoomStateChanged?: (
    room: RoomState,
    soundEvent?: { isCapture: boolean; isCheck: boolean }
  ) => void;

  constructor() {
    // Regular 1s clock ticker: immediately resolves match if an in-progress timer expires
    this.clockInterval = setInterval(() => {
      this.checkClocks();
    }, 1000);
  }

  private checkClocks(): void {
    const now = Date.now();
    for (const [code, room] of this.rooms.entries()) {
      if (room.status !== 'in_progress' || !room.gameRules.timerEnabled || !room.lastMoveTimestamp) {
        continue;
      }
      const elapsed = now - room.lastMoveTimestamp;
      const activePlayer = room.turn === 'w' ? room.whitePlayer : room.blackPlayer;
      if (activePlayer && activePlayer.timeLeftMs > 0 && activePlayer.timeLeftMs - elapsed <= 0) {
        activePlayer.timeLeftMs = 0;
        room.status = 'finished';
        room.resolution = 'timeout';
        room.winnerColor = room.turn === 'w' ? 'b' : 'w';
        room.winnerUserId =
          room.turn === 'w' ? room.blackPlayer?.user.id : room.whitePlayer?.user.id;
        this.clearBotTimer(code);
        this.onRoomStateChanged?.(room);
      }
    }
  }

  public clearBotTimer(code: string): void {
    const timer = this.botTimers.get(code.toUpperCase());
    if (timer) {
      clearTimeout(timer);
      this.botTimers.delete(code.toUpperCase());
    }
  }

  public destroy(): void {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
    for (const timer of this.botTimers.values()) {
      clearTimeout(timer);
    }
    this.botTimers.clear();
  }

  public setOnRoomStateChanged(
    cb: (room: RoomState, soundEvent?: { isCapture: boolean; isCheck: boolean }) => void
  ) {
    this.onRoomStateChanged = cb;
  }

  public createRoom(host: UserProfile, rules: GameRules, customCode?: string): RoomState {
    const code = customCode ? customCode.toUpperCase() : generateLobbyCode();
    const chess = new Chess();
    this.chessInstances.set(code, chess);

    // Determine host color
    let hostColor: Color = 'w';
    if (rules.preferredColor === 'b') {
      hostColor = 'b';
    } else if (rules.preferredColor === 'random') {
      hostColor = Math.random() < 0.5 ? 'w' : 'b';
    }

    const initialTimeMs = (rules.initialTimeSec || 600) * 1000;

    const hostPlayer: PlayerState = {
      user: host,
      color: hostColor,
      connected: true,
      timeLeftMs: initialTimeMs,
    };

    let whitePlayer: PlayerState | undefined = hostColor === 'w' ? hostPlayer : undefined;
    let blackPlayer: PlayerState | undefined = hostColor === 'b' ? hostPlayer : undefined;

    // If bot game, add the Bot immediately as the opposing player
    if (rules.isBotGame) {
      const botColor: Color = hostColor === 'w' ? 'b' : 'w';
      const botMeta = getBotMetadata(rules.botDifficulty || 'master');
      const botPlayer: PlayerState = {
        user: {
          id: 'chess-bot',
          name: `${botMeta.name} (${botMeta.elo})`,
          username: `${botMeta.title}_BOT`,
          avatarUrl: '/assets/mikasa.jpg',
          isBot: true,
        },
        color: botColor,
        connected: true,
        timeLeftMs: initialTimeMs,
      };

      if (botColor === 'w') whitePlayer = botPlayer;
      else blackPlayer = botPlayer;
    }

    const room: RoomState = {
      code,
      hostId: host.id,
      gameRules: rules,
      status: rules.isBotGame ? 'in_progress' : 'waiting',
      whitePlayer,
      blackPlayer,
      spectators: [],
      fen: chess.fen(),
      turn: 'w',
      pgn: '',
      lastMoveTimestamp: Date.now(),
      chatMessages: [
        {
          id: `msg-${Date.now()}`,
          senderId: 'system',
          senderName: 'Mikasa Chess',
          isSpectator: false,
          text: rules.isBotGame
            ? `Match started against ${rules.botDifficulty?.toUpperCase() || 'CASUAL'} Bot!`
            : `Lobby created! Share code ${code} to invite a player.`,
          timestamp: Date.now(),
          reactions: [],
        },
      ],
      createdTimestamp: Date.now(),
    };

    this.rooms.set(code, room);

    // If bot is white, schedule its opening move
    if (rules.isBotGame && whitePlayer?.user.isBot) {
      this.scheduleBotMove(code, 600);
    }

    return room;
  }

  public getRoom(code: string): RoomState | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  public joinRoom(
    code: string,
    user: UserProfile,
    asSpectator: boolean = false
  ): { room: RoomState; role: 'white' | 'black' | 'spectator'; error?: string } | { error: string } {
    const upperCode = code.toUpperCase();
    const room = this.rooms.get(upperCode);
    if (!room) {
      return { error: 'Lobby not found. Please verify the code.' };
    }

    const initialTimeMs = (room.gameRules.initialTimeSec || 600) * 1000;

    // 1. Resilient player reconnection (by ID, host ID, matching name, or reclaiming disconnected seat)
    let isWhite = Boolean(room.whitePlayer && String(room.whitePlayer.user.id) === String(user.id));
    let isBlack = Boolean(room.blackPlayer && String(room.blackPlayer.user.id) === String(user.id));

    // If host reconnected after closing site
    if (!isWhite && !isBlack && String(room.hostId) === String(user.id)) {
      if (room.whitePlayer && !room.whitePlayer.user.isBot) isWhite = true;
      else if (room.blackPlayer && !room.blackPlayer.user.isBot) isBlack = true;
    }

    // If matching name and seat was disconnected
    if (!isWhite && !isBlack) {
      if (room.whitePlayer && !room.whitePlayer.connected && !room.whitePlayer.user.isBot && room.whitePlayer.user.name === user.name) {
        isWhite = true;
      } else if (room.blackPlayer && !room.blackPlayer.connected && !room.blackPlayer.user.isBot && room.blackPlayer.user.name === user.name) {
        isBlack = true;
      }
    }

    // In an ongoing or waiting 2-player match, if a player seat was disconnected, reclaim it
    if (!asSpectator && !isWhite && !isBlack) {
      if (room.whitePlayer && !room.whitePlayer.connected && !room.whitePlayer.user.isBot && String(room.blackPlayer?.user.id) !== String(user.id)) {
        isWhite = true;
      } else if (room.blackPlayer && !room.blackPlayer.connected && !room.blackPlayer.user.isBot && String(room.whitePlayer?.user.id) !== String(user.id)) {
        isBlack = true;
      }
    }

    if (isWhite && room.whitePlayer) {
      room.whitePlayer.connected = true;
      room.whitePlayer.user = {
        ...room.whitePlayer.user,
        ...user,
      };
      return { room, role: 'white' };
    }

    if (isBlack && room.blackPlayer) {
      room.blackPlayer.connected = true;
      room.blackPlayer.user = {
        ...room.blackPlayer.user,
        ...user,
      };
      return { room, role: 'black' };
    }

    // 2. Check if already registered as spectator
    const existingSpectatorIndex = room.spectators.findIndex(
      (s) => String(s.user.id) === String(user.id)
    );
    if (existingSpectatorIndex >= 0) {
      room.spectators[existingSpectatorIndex].user = {
        ...room.spectators[existingSpectatorIndex].user,
        ...user,
      };
      return { room, role: 'spectator' };
    }

    // 3. Join as player if match is waiting and slot is open
    if (!asSpectator && room.status === 'waiting') {
      if (!room.whitePlayer) {
        room.whitePlayer = {
          user,
          color: 'w',
          connected: true,
          timeLeftMs: initialTimeMs,
        };
        room.status = 'in_progress';
        room.lastMoveTimestamp = Date.now();
        room.chatMessages.push({
          id: `msg-${Date.now()}`,
          senderId: 'system',
          senderName: 'Mikasa Chess',
          isSpectator: false,
          text: `${user.name} joined as White. The match has begun!`,
          timestamp: Date.now(),
          reactions: [],
        });
        return { room, role: 'white' };
      }

      if (!room.blackPlayer) {
        room.blackPlayer = {
          user,
          color: 'b',
          connected: true,
          timeLeftMs: initialTimeMs,
        };
        room.status = 'in_progress';
        room.lastMoveTimestamp = Date.now();
        room.chatMessages.push({
          id: `msg-${Date.now()}`,
          senderId: 'system',
          senderName: 'Mikasa Chess',
          isSpectator: false,
          text: `${user.name} joined as Black. The match has begun!`,
          timestamp: Date.now(),
          reactions: [],
        });
        return { room, role: 'black' };
      }
    }

    // 4. Otherwise, join as spectator!
    room.spectators.push({
      user,
      joinedAt: Date.now(),
    });

    room.chatMessages.push({
      id: `msg-${Date.now()}`,
      senderId: 'system',
      senderName: 'Mikasa Chess',
      isSpectator: true,
      text: `${user.name} joined as spectator.`,
      timestamp: Date.now(),
      reactions: [],
    });

    return { room, role: 'spectator' };
  }

  public removeSpectator(code: string, userId: string | number): RoomState | undefined {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) return undefined;
    room.spectators = room.spectators.filter((s) => String(s.user.id) !== String(userId));
    return room;
  }

  public handleUserDisconnect(code: string, userId: string | number): RoomState | undefined {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) return undefined;

    let modified = false;
    if (room.whitePlayer && String(room.whitePlayer.user.id) === String(userId)) {
      if (room.whitePlayer.connected) {
        room.whitePlayer.connected = false;
        modified = true;
      }
    }
    if (room.blackPlayer && String(room.blackPlayer.user.id) === String(userId)) {
      if (room.blackPlayer.connected) {
        room.blackPlayer.connected = false;
        modified = true;
      }
    }
    const spectatorCountBefore = room.spectators.length;
    room.spectators = room.spectators.filter((s) => String(s.user.id) !== String(userId));
    if (room.spectators.length !== spectatorCountBefore) {
      modified = true;
    }

    return modified ? room : undefined;
  }

  public updatePlayerProfile(code: string, user: UserProfile): RoomState | undefined {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) return undefined;

    let changed = false;
    if (room.whitePlayer && String(room.whitePlayer.user.id) === String(user.id)) {
      room.whitePlayer.user = {
        ...room.whitePlayer.user,
        ...user,
      };
      changed = true;
    }
    if (room.blackPlayer && String(room.blackPlayer.user.id) === String(user.id)) {
      room.blackPlayer.user = {
        ...room.blackPlayer.user,
        ...user,
      };
      changed = true;
    }

    const spectator = room.spectators.find((s) => String(s.user.id) === String(user.id));
    if (spectator) {
      spectator.user = {
        ...spectator.user,
        ...user,
      };
      changed = true;
    }

    if (changed && this.onRoomStateChanged) {
      this.onRoomStateChanged(room);
    }

    return changed ? room : undefined;
  }

  public makeMove(
    code: string,
    userId: string | number,
    move: { from: string; to: string; promotion?: string }
  ): { success: boolean; room?: RoomState; error?: string } {
    const upperCode = code.toUpperCase();
    const room = this.rooms.get(upperCode);
    let chess = this.chessInstances.get(upperCode);

    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    // Ensure chess instance exists and matches room FEN
    if (!chess) {
      chess = new Chess(room.fen);
      this.chessInstances.set(upperCode, chess);
    } else if (chess.fen() !== room.fen) {
      try {
        chess.load(room.fen);
      } catch {
        // ignore
      }
    }

    if (room.status !== 'in_progress') {
      return { success: false, error: 'Game is not in progress' };
    }

    // Check player turn & authorization
    const currentTurn = chess.turn(); // 'w' | 'b'
    const player = currentTurn === 'w' ? room.whitePlayer : room.blackPlayer;

    if (!player || String(player.user.id) !== String(userId)) {
      return { success: false, error: 'Not your turn or unauthorized' };
    }

    // Normalize coordinates
    const from = (move.from || '').toLowerCase();
    const to = (move.to || '').toLowerCase();

    // Check pawn promotion requirement
    const piece = chess.get(from as any);
    const isPawn = piece && piece.type === 'p';
    const isPromotionRank = to.endsWith('8') || to.endsWith('1');
    const promotion = isPawn && isPromotionRank ? (move.promotion || 'q').toLowerCase() : undefined;

    // Update player timer
    if (room.gameRules.timerEnabled && room.lastMoveTimestamp) {
      const elapsed = Date.now() - room.lastMoveTimestamp;
      player.timeLeftMs = Math.max(0, player.timeLeftMs - elapsed);
      player.timeLeftMs += (room.gameRules.incrementSec || 0) * 1000;

      if (player.timeLeftMs <= 0) {
        room.status = 'finished';
        room.resolution = 'timeout';
        room.winnerColor = currentTurn === 'w' ? 'b' : 'w';
        room.winnerUserId =
          currentTurn === 'w' ? room.blackPlayer?.user.id : room.whitePlayer?.user.id;
        return { success: true, room };
      }
    }

    try {
      const result = chess.move({
        from,
        to,
        promotion: promotion as any,
      });

      if (!result) {
        return { success: false, error: 'Illegal move' };
      }

      room.fen = chess.fen();
      room.turn = chess.turn();
      room.pgn = chess.pgn();
      room.lastMove = { from, to, san: result.san };
      room.lastMoveTimestamp = Date.now();
      room.drawOffer = null; // Making a move automatically clears pending draw offers

      // Check game end conditions
      if (chess.isCheckmate()) {
        room.status = 'finished';
        room.resolution = 'checkmate';
        room.winnerColor = currentTurn;
        room.winnerUserId = player.user.id;
      } else if (chess.isDraw()) {
        room.status = 'finished';
        if (chess.isStalemate()) room.resolution = 'draw_stalemate';
        else if (chess.isInsufficientMaterial()) room.resolution = 'draw_insufficient_material';
        else if (chess.isThreefoldRepetition()) room.resolution = 'draw_threefold_repetition';
        else room.resolution = 'draw_50_move';
      }

      // If playing against Bot and game continues, schedule Bot move!
      if (room.status === 'in_progress' && room.gameRules.isBotGame) {
        const nextPlayer = room.turn === 'w' ? room.whitePlayer : room.blackPlayer;
        if (nextPlayer?.user.isBot) {
          this.scheduleBotMove(upperCode, 400);
        }
      }

      return { success: true, room };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid move';
      return { success: false, error: message };
    }
  }

  public scheduleBotMove(code: string, delayMs: number = 400): void {
    const upperCode = code.toUpperCase();
    this.clearBotTimer(upperCode);

    const timer = setTimeout(async () => {
      await this.executeBotMove(upperCode);
    }, delayMs);

    this.botTimers.set(upperCode, timer);
  }

  private async executeBotMove(code: string): Promise<void> {
    const room = this.rooms.get(code);
    let chess = this.chessInstances.get(code);
    if (!room || room.status !== 'in_progress') return;

    if (!chess) {
      chess = new Chess(room.fen);
      this.chessInstances.set(code, chess);
    }

    const currentTurn = chess.turn();
    const botPlayer = currentTurn === 'w' ? room.whitePlayer : room.blackPlayer;
    if (!botPlayer?.user.isBot) return;

    try {
      let botMove = await computeBestMoveAsync(chess, room.gameRules.botDifficulty || 'intermediate');
      if (!botMove) {
        // Fallback to any legal move
        const fallbackMoves = chess.moves({ verbose: true });
        if (fallbackMoves.length === 0) return;
        const fallback = fallbackMoves[0];
        botMove = {
          from: fallback.from.toLowerCase(),
          to: fallback.to.toLowerCase(),
          promotion: fallback.promotion || 'q',
        };
      }

      const result = chess.move({
        from: botMove.from.toLowerCase(),
        to: botMove.to.toLowerCase(),
        promotion: (botMove.promotion || 'q').toLowerCase() as any,
      });

      if (!result) return;

      // Update timer for bot if enabled
      if (room.gameRules.timerEnabled && room.lastMoveTimestamp) {
        const elapsed = Date.now() - room.lastMoveTimestamp;
        botPlayer.timeLeftMs = Math.max(0, botPlayer.timeLeftMs - elapsed);
        botPlayer.timeLeftMs += (room.gameRules.incrementSec || 0) * 1000;
      }

      room.fen = chess.fen();
      room.turn = chess.turn();
      room.pgn = chess.pgn();
      room.lastMove = { from: botMove.from, to: botMove.to, san: result.san };
      room.lastMoveTimestamp = Date.now();

      if (chess.isCheckmate()) {
        room.status = 'finished';
        room.resolution = 'checkmate';
        room.winnerColor = currentTurn;
        room.winnerUserId = botPlayer.user.id;
        this.clearBotTimer(code);
      } else if (chess.isDraw()) {
        room.status = 'finished';
        if (chess.isStalemate()) room.resolution = 'draw_stalemate';
        else if (chess.isInsufficientMaterial()) room.resolution = 'draw_insufficient_material';
        else if (chess.isThreefoldRepetition()) room.resolution = 'draw_threefold_repetition';
        else room.resolution = 'draw_50_move';
        this.clearBotTimer(code);
      }

      const isCapture = result.san?.includes('x') || false;
      const isCheck = result.san?.includes('+') || result.san?.includes('#') || false;

      // Notify clients immediately of the AI move!
      this.onRoomStateChanged?.(room, { isCapture, isCheck });
    } catch (err) {
      console.error('Failed to execute bot move:', err);
    }
  }

  public resign(code: string, userId: string | number): RoomState | undefined {
    const room = this.rooms.get(code.toUpperCase());
    if (!room || room.status !== 'in_progress') return undefined;

    if (String(room.whitePlayer?.user.id) === String(userId)) {
      room.status = 'finished';
      room.resolution = 'resignation';
      room.winnerColor = 'b';
      room.winnerUserId = room.blackPlayer?.user.id;
      this.clearBotTimer(code);
      return room;
    }

    if (String(room.blackPlayer?.user.id) === String(userId)) {
      room.status = 'finished';
      room.resolution = 'resignation';
      room.winnerColor = 'w';
      room.winnerUserId = room.whitePlayer?.user.id;
      this.clearBotTimer(code);
      return room;
    }

    return undefined;
  }

  public offerDraw(code: string, userId: string | number): RoomState | undefined {
    const room = this.rooms.get(code.toUpperCase());
    if (!room || room.status !== 'in_progress') return undefined;

    let color: Color | null = null;
    if (String(room.whitePlayer?.user.id) === String(userId)) color = 'w';
    else if (String(room.blackPlayer?.user.id) === String(userId)) color = 'b';
    if (!color) return undefined;

    room.drawOffer = {
      offeredByUserId: userId,
      offeredByColor: color,
    };

    // If bot game, Bot evaluates draw offer
    if (room.gameRules.isBotGame) {
      setTimeout(() => {
        const accept = Math.random() < 0.5;
        const updated = this.respondDraw(code, 'chess-bot', accept);
        if (updated) {
          this.onRoomStateChanged?.(updated);
        }
      }, 700);
    }

    return room;
  }

  public respondDraw(code: string, userId: string | number, accept: boolean): RoomState | undefined {
    const room = this.rooms.get(code.toUpperCase());
    if (!room || !room.drawOffer || room.status !== 'in_progress') return undefined;

    if (String(room.drawOffer.offeredByUserId) === String(userId)) return undefined; // Cannot respond to own offer

    if (accept) {
      room.status = 'finished';
      room.resolution = 'draw_agreement';
      room.drawOffer = null;
      room.chatMessages.push({
        id: `msg-${Date.now()}`,
        senderId: 'system',
        senderName: 'Mikasa Chess',
        isSpectator: false,
        text: 'Both players agreed to a draw. The match has concluded.',
        timestamp: Date.now(),
        reactions: [],
      });
    } else {
      room.drawOffer = null;
      room.chatMessages.push({
        id: `msg-${Date.now()}`,
        senderId: 'system',
        senderName: 'Mikasa Chess',
        isSpectator: false,
        text: 'The draw offer was declined.',
        timestamp: Date.now(),
        reactions: [],
      });
    }

    return room;
  }

  public addChatMessage(
    code: string,
    message: Omit<ChatMessage, 'id' | 'timestamp' | 'reactions'>
  ): ChatMessage | undefined {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) return undefined;

    const fullMessage: ChatMessage = {
      ...message,
      id: `chat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      reactions: [],
    };

    room.chatMessages.push(fullMessage);
    // Keep last 150 messages preserved
    if (room.chatMessages.length > 150) {
      room.chatMessages.shift();
    }

    return fullMessage;
  }

  public addReaction(
    code: string,
    messageId: string,
    emoji: string,
    reactor: ChatReactionUser
  ): RoomState | undefined {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) return undefined;

    const message = room.chatMessages.find((m) => m.id === messageId);
    if (!message) return undefined;

    const existingReaction = message.reactions.find((r) => r.emoji === emoji);

    if (existingReaction) {
      const userIndex = existingReaction.users.findIndex(
        (u) => String(u) === String(reactor.userId)
      );

      if (userIndex >= 0) {
        // Toggle OFF (Telegram-style reaction tap)
        existingReaction.users.splice(userIndex, 1);
        if (existingReaction.reactors) {
          existingReaction.reactors = existingReaction.reactors.filter(
            (r) => String(r.userId) !== String(reactor.userId)
          );
        }
        existingReaction.count--;
        if (existingReaction.count <= 0) {
          message.reactions = message.reactions.filter((r) => r.emoji !== emoji);
        }
      } else {
        // Toggle ON
        existingReaction.users.push(reactor.userId);
        if (!existingReaction.reactors) existingReaction.reactors = [];
        existingReaction.reactors.push(reactor);
        existingReaction.count++;
      }
    } else {
      // Add new reaction with reactor info
      message.reactions.push({
        emoji,
        count: 1,
        users: [reactor.userId],
        reactors: [reactor],
      });
    }

    return room;
  }

  public rematchMatch(code: string, requesterUserId?: string | number): RoomState | undefined {
    const upperCode = code.toUpperCase();
    const room = this.rooms.get(upperCode);
    if (!room) return undefined;

    // Clear active bot timer if running
    const existingBotTimer = this.botTimers.get(upperCode);
    if (existingBotTimer) {
      clearTimeout(existingBotTimer);
      this.botTimers.delete(upperCode);
    }

    const newChess = new Chess();
    this.chessInstances.set(upperCode, newChess);

    const initialTimeMs = (room.gameRules.initialTimeSec || 600) * 1000;

    // Swap white and black players so rematch alternates colors for fairness
    const oldWhite = room.whitePlayer;
    const oldBlack = room.blackPlayer;

    if (oldWhite && oldBlack) {
      room.whitePlayer = {
        ...oldBlack,
        color: 'w',
        timeLeftMs: initialTimeMs,
      };
      room.blackPlayer = {
        ...oldWhite,
        color: 'b',
        timeLeftMs: initialTimeMs,
      };
    } else if (oldWhite) {
      oldWhite.timeLeftMs = initialTimeMs;
    } else if (oldBlack) {
      oldBlack.timeLeftMs = initialTimeMs;
    }

    room.fen = newChess.fen();
    room.pgn = '';
    room.turn = 'w';
    room.lastMove = undefined;
    room.lastMoveTimestamp = Date.now();
    room.status = 'in_progress';
    room.winnerColor = undefined;
    room.winnerUserId = undefined;
    room.resolution = undefined;
    room.drawOffer = null;
    room.createdTimestamp = Date.now();

    room.chatMessages.push({
      id: `rematch-${Date.now()}`,
      senderId: 'system',
      senderName: 'Mikasa Chess',
      isSpectator: false,
      text: '⚔️ Rematch started! Colors have swapped.',
      timestamp: Date.now(),
      reactions: [],
    });

    // If bot game and bot is now white, schedule bot opening move
    if (room.gameRules.isBotGame && room.whitePlayer?.user.isBot) {
      this.scheduleBotMove(upperCode, 600);
    }

    return room;
  }
}

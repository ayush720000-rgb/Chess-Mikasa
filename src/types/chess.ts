export type Color = 'w' | 'b';

export type BotDifficulty = 'beginner' | 'casual' | 'intermediate' | 'advanced' | 'master' | 'grandmaster';

export interface TelegramUserData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

export interface UserProfile {
  id: string | number;
  name: string;
  username?: string;
  avatarUrl?: string;
  isBot?: boolean;
}

export interface GameRules {
  timerEnabled: boolean;
  initialTimeSec: number; // e.g. 600 for 10 min
  incrementSec: number;   // e.g. 3 for +3s
  preferredColor: 'w' | 'b' | 'random';
  isBotGame: boolean;
  botDifficulty?: BotDifficulty;
}

export type GameStatus = 'waiting' | 'in_progress' | 'finished';

export type GameResolution =
  | 'checkmate'
  | 'draw_stalemate'
  | 'draw_insufficient_material'
  | 'draw_threefold_repetition'
  | 'draw_agreement'
  | 'draw_50_move'
  | 'resignation'
  | 'timeout'
  | 'abandoned';

export interface PlayerState {
  user: UserProfile;
  color: Color;
  connected: boolean;
  timeLeftMs: number;
  sessionToken?: string;
}

export interface Spectator {
  user: UserProfile;
  joinedAt: number;
  sessionToken?: string;
}

export interface ChatReactionUser {
  userId: string | number;
  name: string;
  avatarUrl?: string;
}

export interface ChatReaction {
  emoji: string;
  count: number;
  users: Array<string | number>;
  reactors?: ChatReactionUser[];
}

export interface ChatReplyRef {
  id: string;
  senderName: string;
  text: string;
}

export interface ChatMessage {
  id: string;
  senderId: string | number;
  senderName: string;
  senderAvatar?: string;
  isSpectator: boolean;
  text: string;
  timestamp: number;
  replyTo?: ChatReplyRef | null;
  reactions: ChatReaction[];
}

export interface RoomState {
  code: string;
  hostId: string | number;
  hostSessionToken?: string;
  gameRules: GameRules;
  status: GameStatus;
  whitePlayer?: PlayerState;
  blackPlayer?: PlayerState;
  spectators: Spectator[];
  fen: string;
  turn: Color;
  pgn: string;
  lastMove?: { from: string; to: string; san?: string };
  lastMoveTimestamp?: number;
  drawOffer?: {
    offeredByUserId: string | number;
    offeredByColor: Color;
  } | null;
  resolution?: GameResolution;
  winnerColor?: Color;
  winnerUserId?: string | number;
  chatMessages: ChatMessage[];
  createdTimestamp: number;
}

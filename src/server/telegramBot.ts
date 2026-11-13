import { Telegraf } from 'telegraf';
import axios from 'axios';

export interface TelegramBotInfo {
  isActive: boolean;
  username?: string;
  appUrl: string;
}

function isValidBotToken(token?: string): boolean {
  if (!token) return false;
  const clean = token.trim();
  if (
    clean === '' ||
    clean.includes('MY_TELEGRAM') ||
    clean.includes('YOUR_BOT_TOKEN') ||
    clean.includes('placeholder')
  ) {
    return false;
  }
  // Standard Telegram bot token format: <bot_id>:<secret>
  return /^\d{5,}:[A-Za-z0-9_-]{20,}$/.test(clean);
}

export class TelegramBotService {
  private bot: Telegraf | null = null;
  private appUrl: string;
  // Replaced with the real handle from getMe() once the token is verified.
  private botUsername: string = (process.env.BOT_USERNAME || 'Ig_MikasaBot').replace(/^@/, '');

  constructor(appUrl: string) {
    this.appUrl = appUrl || 'https://t.me';
    const rawToken = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;

    if (isValidBotToken(rawToken)) {
      const token = rawToken!.trim();
      try {
        const botInstance = new Telegraf(token);

        // Catch background polling errors gracefully without throwing uncaught rejections
        botInstance.catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          console.log('[TelegramBot] Background update notice:', msg);
        });

        // Verify bot credentials before attempting to launch polling
        botInstance.telegram
          .getMe()
          .then((me) => {
            this.bot = botInstance;
            if (me.username) {
              this.botUsername = me.username;
            }
            console.log(`Telegram Bot @${this.botUsername} connected successfully.`);
            this.setupHandlers(botInstance);

            botInstance
              .launch({ dropPendingUpdates: true })
              .then(() => {
                console.log('Telegram Bot polling launched successfully.');
              })
              .catch((err: unknown) => {
                const msg = err instanceof Error ? err.message : String(err);
                console.log('[TelegramBot] Polling stopped:', msg);
                this.bot = null;
              });
          })
          .catch((err: unknown) => {
            // Handle 401 Unauthorized or invalid token gracefully
            this.bot = null;
            const msg = err instanceof Error ? err.message : String(err);
            console.log(`[TelegramBot] Bot token inactive or unauthorized (${msg}). Running in Web & Telegram WebApp mode.`);
          });
      } catch (err: unknown) {
        this.bot = null;
        const msg = err instanceof Error ? err.message : String(err);
        console.log('[TelegramBot] Could not initialize Telegraf:', msg);
      }
    } else {
      console.log('[TelegramBot] No valid TELEGRAM_BOT_TOKEN provided. Operating in Web & Telegram WebApp mode.');
    }
  }

  private setupHandlers(bot: Telegraf) {
    // Start command
    bot.command('start', async (ctx) => {
      const user = ctx.from;
      const firstName = user.first_name || 'Chess Player';
      const webAppUrl = this.appUrl;

      await ctx.reply(
        `👋 Welcome, *${firstName}*!\n\n♟️ Ready to play chess?\nCreate lobbies, challenge friends, or play against our intelligent chess bot!`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '♟️ Play ChessNow',
                  web_app: { url: webAppUrl },
                },
              ],
              [
                {
                  text: '🌐 Open Website',
                  url: webAppUrl,
                },
              ],
            ],
          },
        }
      );
    });

    // Inline query
    bot.on('inline_query', async (ctx) => {
      const query = ctx.inlineQuery.query.trim();
      const playUrl = query ? `${this.appUrl}?lobby=${query}` : this.appUrl;

      await ctx.answerInlineQuery([
        {
          type: 'article',
          id: 'chess_lobby_invite',
          title: query ? `Join Chess Lobby: ${query}` : 'Play ChessNow',
          description: 'Click to start or join a real-time chess game!',
          input_message_content: {
            message_text: `♟️ *ChessNow Match Invite*\n${
              query ? `Join room: \`${query}\`\n` : ''
            }[Click to Play](${playUrl})`,
            parse_mode: 'Markdown',
          },
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '⚔️ Join Game',
                  web_app: { url: playUrl },
                },
              ],
            ],
          },
        },
      ]);
    });
  }

  public async fetchUserAvatarBase64(userId: number): Promise<string | undefined> {
    if (!this.bot) return undefined;
    try {
      const photos = await this.bot.telegram.getUserProfilePhotos(userId, 0, 1);
      if (photos.total_count === 0 || !photos.photos[0] || photos.photos[0].length === 0) {
        return undefined;
      }

      // Pick medium resolution photo
      const photoSizes = photos.photos[0];
      const selected = photoSizes[Math.min(1, photoSizes.length - 1)];
      const fileLink = await this.bot.telegram.getFileLink(selected.file_id);

      const resp = await axios.get(fileLink.href, { responseType: 'arraybuffer' });
      const b64 = Buffer.from(resp.data).toString('base64');
      return `data:image/jpeg;base64,${b64}`;
    } catch {
      return undefined;
    }
  }

  public stop(): void {
    if (this.bot) {
      try {
        this.bot.stop();
      } catch {
        // ignore
      }
      this.bot = null;
    }
  }

  public getInfo(): TelegramBotInfo {
    return {
      isActive: Boolean(this.bot),
      username: this.botUsername,
      appUrl: this.appUrl,
    };
  }
}

# Mikasa Chess — Render deployment

## One-service deployment
This project serves the Vite-built React website, Express API and Socket.IO multiplayer server from one Render Web Service.

1. Push the contents of this folder to a new GitHub repository.
2. In Render, choose **New → Blueprint** and select that repository. Render reads `render.yaml`.
3. Set `TELEGRAM_BOT_TOKEN` in the service Environment settings using the token from BotFather. Never commit the token to GitHub.
4. Deploy. After the first deploy, set `APP_URL` to the public `https://<your-service>.onrender.com` URL if it was not automatically populated, then redeploy.

## Commands (manual Web Service setup)
- Runtime: Node
- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Health Check Path: `/api/health`
- Environment: `NODE_ENV=production`, `TELEGRAM_BOT_TOKEN=<your BotFather token>`, `APP_URL=https://<your-service>.onrender.com`

Node 22 is selected by `.node-version`. The start script runs the Express + Socket.IO server, which serves the built website and API on Render's assigned `PORT`.

## Telegram identity and profile photos
Inside Telegram, the frontend sends Mini App `initData` to `/api/telegram-auth`. The server validates its HMAC signature and freshness using `TELEGRAM_BOT_TOKEN` before accepting the Telegram user ID, name and username. Telegram's signed `photo_url` is used when present. If it is absent, the backend tries `getUserProfilePhotos`; Telegram may only return a photo when the user is accessible to the bot (normally after the user has opened the bot).

For best results, users should open the bot and press **Start** before launching the Mini App. A browser opened outside Telegram will use guest mode; a bot token cannot identify arbitrary Telegram users by numeric ID alone.

## Important runtime note
Render Free services can spin down after inactivity. Multiplayer rooms are held in server memory, so active rooms are not durable across a service restart or spin-down. This setup intentionally uses one service and does not add a database or alter chess rules/UI.

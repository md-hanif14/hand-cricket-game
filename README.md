# Hand Cricket — full-stack starter

A runnable full-stack starter for the classic two-player Hand Cricket game. It includes account registration/login, player profiles, saved match history, private online rooms, quick matchmaking, Easy/Medium/Hard computer opponents, server-authoritative scoring, a 3-second simultaneous choice deadline, and an animated fist-bump/reveal sequence.

> This is a development starter, not a security-audited production service. Read **Production notes** below before a public launch.

## Features included

- React + Vite responsive frontend.
- Node.js + Express API.
- Socket.IO for online real-time play.
- MongoDB + Mongoose for accounts, statistics, and completed match history.
- HttpOnly session cookie containing a signed JWT; passwords are hashed with bcrypt.
- Private room codes, room readiness, and quick matchmaking (players are paired with the same wicket setting).
- Easy, Medium, and Hard bot strategies.
- Wickets configurable from 1 to 10; no overs.
- Toss; toss winner chooses to bat or bowl.
- A 3-second server-side move deadline for every round.
- Choices are not sent to the other player before reveal. Missing online choices are generated on the server with `crypto.randomInt`.
- Animated fists slide together, bump, then reveal both numbers and the score/wicket result.
- Reconnection grace period; disconnect forfeit for active online matches.
- Unit tests for core scoring/innings rules.

## Requirements

Install these before starting:

1. **Node.js 22.12 or newer** (Node 22 LTS or Node 24 LTS recommended).
2. **npm** (included with Node.js).
3. **MongoDB** running locally, or a MongoDB Atlas connection string.
4. Git, optional but recommended.

Check your installation:

```bash
node --version
npm --version
```

## 1. Create environment files

From the project root, copy the examples.

**macOS / Linux:**

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

**Windows PowerShell:**

```powershell
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env
```

Open `server/.env` and set `JWT_SECRET` to a strong random secret of at least 32 characters. One way to generate a secret is:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Paste the generated value into `JWT_SECRET` in `server/.env`.

Default development settings:

```env
NODE_ENV=development
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/hand-cricket
JWT_SECRET=replace_me_generate_a_secret
COOKIE_NAME=hc_token
ROUND_DURATION_MS=3000
REVEAL_DURATION_MS=1900
DISCONNECT_GRACE_MS=30000
```

`MONGODB_URI` must point to a running MongoDB instance or your Atlas cluster. Never commit `.env` files.

In `client/.env`, keep these URLs for local development:

```env
VITE_API_URL=http://localhost:4000
VITE_SOCKET_URL=http://localhost:4000
```

If you change the API port or frontend port, update `PORT`, `CLIENT_ORIGIN`, `VITE_API_URL`, and `VITE_SOCKET_URL` accordingly.

## 2. Start MongoDB

### Option A: local MongoDB

Install MongoDB Community Server for your operating system and start the MongoDB service. The default URI in this project is:

```text
mongodb://127.0.0.1:27017/hand-cricket
```

You do not need to create the database manually; MongoDB creates it when the first user or match is saved.

### Option B: MongoDB Atlas

Create a cluster in MongoDB Atlas, create a database user, allow your development IP address, and copy the Node.js connection string. Put that connection string in `server/.env` as `MONGODB_URI`. Keep database credentials private.

## 3. Install packages

Run this from the `hand-cricket` project root:

```bash
npm install
```

The root `package.json` uses npm workspaces to install client and server dependencies together.

If npm reports dependency or lockfile issues, confirm you are running the command from the directory containing the root `package.json`, then retry with a supported Node/npm version.

## 4. Start frontend and backend

From the project root:

```bash
npm run dev
```

This starts both processes:

- Frontend: `http://localhost:5173`
- Express API + Socket.IO: `http://localhost:4000`
- Health check: `http://localhost:4000/api/health`

The server must connect to MongoDB before it starts listening. If the server exits, read the terminal error and check `MONGODB_URI` first.

You can also start either side separately:

```bash
npm run dev -w server
npm run dev -w client
```

## 5. Play the game locally

### Create two test players

1. Open `http://localhost:5173` in a browser.
2. Register Player A with a unique username and email.
3. To test two-player play, open a second browser profile or an incognito window and register Player B with a different email and username.
4. Use two separate sessions; do not reuse the same login in both windows for multiplayer testing.

### Play against the computer

1. Log in.
2. Open **Vs computer**.
3. Select a wicket count and bot difficulty.
4. Start the match, then choose **Bat first** or **Bowl first** if you win the toss.
5. Select 1–5 fingers before the 3-second countdown expires.

### Private online room

1. Player A opens **Play online** and selects **Create room**.
2. Share the six-character room code with Player B.
3. Player B selects **Join room**, enters the code, and joins.
4. Both players click **I'm ready**.
5. The toss and match begin.

### Quick matchmaking

1. Both players choose the same wicket count.
2. Both select **Quick match** and click **Find match**.
3. The server pairs them when both are waiting and then each player clicks **I'm ready**.

This initial matchmaking queue pairs players by wicket setting only; it is not a ranked or skill-based queue. The development dependencies target current Vite 8 and require a supported modern Node.js release.

## 6. Game rules implemented

- Each move is a number from 1 to 5.
- If the batsman and bowler choose the same number, the batsman loses one wicket and earns no runs.
- If the numbers differ, the batsman earns the number they chose.
- The first innings stops when the selected number of wickets is lost.
- Target = first-innings score + 1.
- The chase ends immediately when the target is reached or all wickets are lost.
- If the chasing player is all out before the target, the first-innings player wins.
- Every round has a 3-second server deadline. The first move remains private while waiting for the other player. When the deadline passes, missing moves are generated on the server. Both numbers are revealed together.
- Computer choices are generated before the player move is revealed, based only on prior completed rounds.

## 7. Useful development commands

```bash
# Start both applications
npm run dev

# Run the backend game-rule tests
npm test

# Create a production frontend build
npm run build

# Run the built frontend locally for a preview
npm run preview -w client

# Run the backend in production mode (after configuring server/.env)
npm start
```

## 8. Main code locations

```text
client/src/pages/             Home, auth, game setup, match UI, profile/history
client/src/components/        Hand drawing, fist-bump animation, route guard, navbar
client/src/context/            Auth and Socket.IO state
client/src/styles.css         Responsive theme and animation presentation
server/src/routes/auth.js     Registration, login, logout, current session
server/src/routes/matches.js  Completed match history API
server/src/sockets/           Room creation, matchmaking, toss, timers, hidden moves
server/src/game/rules.js      Pure scoring and random fallback rules
server/src/game/roundEngine.js  Innings/target/match transition rules
server/src/bots/              Easy, Medium, Hard strategies
server/src/models/            MongoDB User and Match schemas
server/test/                  Core scoring and innings tests
```

## 9. API and socket overview

REST endpoints:

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/matches/mine?limit=30`

Socket events emitted by the client:

- `room:create`, `room:join`, `match:ready`
- `queue:join`, `queue:leave`
- `computer:create`
- `toss:choose`
- `move:submit`
- `match:leave`

Important server events:

- `match:state`
- `round:started`, `move:locked`, `opponent:locked`, `round:result`
- `queue:matched`, `player:disconnected`

A submitted move is stored only in server memory until reveal time. The server does not send the actual number through `match:state`; only `round:result` contains both choices.

## 10. Production notes and current limitations

Before inviting public users, do the following:

- Serve the frontend and API over HTTPS. The session cookie is marked `Secure` when `NODE_ENV=production`.
- Prefer same-site frontend and backend deployments (for example, subdomains of your own domain) so the HttpOnly cookie and Socket.IO credentials work naturally. If using completely separate sites, design and test your cookie `SameSite` policy and CSRF defenses explicitly.
- Put `JWT_SECRET` and `MONGODB_URI` in your host's secret manager, not source control.
- Add email verification and password-reset flows before treating accounts as production identities.
- Add request logging/monitoring, database backups, and an operational alert for failed match saves.
- Active rooms and timers currently live in one Node.js process. A server restart drops in-progress games; multiple server replicas require a shared match store (typically Redis), a Socket.IO adapter, and distributed queue/timer coordination.
- Match results are written to MongoDB at completion. Unit tests cover the scoring and innings functions, but the full socket flows should also be integration-tested before a public release.
- Bot “learning” is a simple frequency heuristic, not machine learning. Medium/Hard read only prior completed player choices; they do not see the current move before revealing.
- The current app uses custom SVG hand artwork instead of external images or paid assets.
- This starter intentionally does not include leaderboards, ranked matchmaking, chat, spectators, payments, ads, or multiplayer replay.

## 11. Troubleshooting

**The backend says MongoDB connection failed**

- Verify MongoDB is running or your Atlas URI is correct.
- For Atlas, check the database user/password, IP access list, and URI encoding for special characters.

**The browser says Socket.IO cannot connect**

- Confirm the backend is running at `http://localhost:4000`.
- Confirm `CLIENT_ORIGIN=http://localhost:5173` in `server/.env`.
- Check that you are logged in; sockets require a valid session cookie.

**The room code cannot be joined**

- Room codes become invalid after the room starts or is cleaned up.
- Check that both players are logged in using different accounts.

**A player does not appear to be matched**

- Quick matchmaking currently matches players only when the selected wicket count is the same.
- Both browsers should remain open and connected while queued.

**You changed environment values**

Restart the server and Vite dev server after editing `.env` files.

---

Enjoy the game — and keep your moves hidden until the fist bump! ✊

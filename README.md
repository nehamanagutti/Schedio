# Schedio — Faculty Timetable Scheduler

A full-stack collaborative faculty timetable application built with **Node.js + Express** (backend) and **React + Vite** (frontend).

---

## Project Structure

```
schedio/
├── backend/
│   ├── package.json
│   └── src/
│       ├── index.js              # Express server entry point
│       ├── data/
│       │   ├── store.js          # In-memory data store with JSON persistence
│       │   └── db.json           # Auto-created on first run (data persists here)
│       ├── middleware/
│       │   └── auth.js           # JWT auth middleware
│       └── routes/
│           ├── auth.js           # Register, login, profile
│           ├── classes.js        # CRUD for timetable classes
│           ├── users.js          # Faculty member list, heartbeat
│           ├── posts.js          # Faculty board announcements
│           ├── cover.js          # Cover request system
│           └── messages.js       # Direct messaging between faculty
│
├── frontend/
│   ├── package.json
│   ├── vite.config.js            # Vite + API proxy config
│   ├── index.html
│   └── src/
│       ├── main.jsx              # React entry point
│       ├── App.jsx               # Router + auth guard
│       ├── index.css             # Global design tokens + utility classes
│       ├── context/
│       │   └── AuthContext.jsx   # Global auth state (user, login, logout)
│       ├── utils/
│       │   └── api.js            # All API fetch calls in one place
│       ├── components/
│       │   ├── Layout.jsx        # Sidebar + mobile nav shell
│       │   └── UI.jsx            # Toast, Modal, Avatar, Spinner, StatCard, etc.
│       └── pages/
│           ├── Login.jsx         # Sign in + register
│           ├── Dashboard.jsx     # Today's schedule + reminders
│           ├── Classes.jsx       # Add/edit/delete classes
│           ├── Timetable.jsx     # Weekly grid view
│           ├── Colleagues.jsx    # Faculty list + view schedules
│           ├── Board.jsx         # Faculty announcements board
│           ├── Cover.jsx         # Cover request system
│           ├── Chat.jsx          # Direct messaging (polls every 5s)
│           └── Profile.jsx       # Edit profile settings
│
├── package.json                  # Root — run both servers together
└── README.md
```

---

## Setup & Running

### 1. Install dependencies

```bash
# From the schedio/ root:
npm install           # installs concurrently

cd backend
npm install

cd ../frontend
npm install
```

### 2. Run in development (both servers)

```bash
# From the schedio/ root (runs backend on :4000 and frontend on :5173):
npm start
```

Or run separately:

```bash
# Terminal 1 — Backend (http://localhost:4000)
cd backend && npm run dev

# Terminal 2 — Frontend (http://localhost:5173)
cd frontend && npm run dev
```

### 3. Open the app

Visit **http://localhost:5173** in your browser.

---

## API Overview

All endpoints are prefixed with `/api`. The frontend proxies `/api/*` to the backend via Vite's proxy config.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user |
| PATCH | `/api/auth/profile` | Update profile |
| GET | `/api/users` | All faculty members |
| PATCH | `/api/users/heartbeat` | Update online status |
| GET | `/api/classes` | My classes |
| POST | `/api/classes` | Create class |
| PATCH | `/api/classes/:id` | Edit class |
| DELETE | `/api/classes/:id` | Delete class |
| GET | `/api/classes/user/:userId` | Any user's classes |
| GET | `/api/posts` | Faculty board posts |
| POST | `/api/posts` | Create post |
| DELETE | `/api/posts/:id` | Delete own post |
| GET | `/api/cover` | All cover requests |
| POST | `/api/cover` | Request cover |
| PATCH | `/api/cover/:id` | Accept/decline |
| GET | `/api/messages/:userId` | Conversation with user |
| POST | `/api/messages` | Send message |
| GET | `/api/messages/unread/count` | Unread count |

---

## Features

- 🔐 JWT-based authentication (passwords hashed with bcrypt)
- 📚 Full CRUD for timetable classes
- 📅 Weekly timetable grid view with color coding per subject
- 👥 Faculty colleague list with live online presence indicator
- 📢 Faculty announcement board
- 🤝 Cover request system — request and respond to cover requests
- 💬 Real-time-ish chat (5s polling) between faculty members
- 🔔 Dashboard reminders for imminent classes
- 💾 Data persisted to `backend/src/data/db.json`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, Express, bcryptjs, jsonwebtoken |
| Frontend | React 18, React Router v6, Vite |
| Styling | Custom CSS with design tokens (no CSS framework) |
| Data | JSON file persistence (easy to swap for MongoDB/PostgreSQL) |

---

## Upgrading to a Real Database

The `store.js` file uses an in-memory object backed by a JSON file. To upgrade:

1. Replace `store.js` with a database adapter (e.g. `mongoose` for MongoDB or `pg` for PostgreSQL)
2. Keep all the same exported function signatures (`findUser`, `addClass`, etc.)
3. No other files need to change — the routes use `store.*` exclusively

---

## Environment Variables

Create `backend/.env` to override defaults:

```env
PORT=4000
JWT_SECRET=your_strong_secret_here
GMAIL_USER=youraddress@gmail.com
GMAIL_APP_PASSWORD=your_16_character_gmail_app_password
```

Email verification is required for new accounts. Registration sends a six-digit
code, and the account is created only after that code is confirmed. Copy
`backend/.env.example` to `backend/.env` and configure a Gmail App Password to
send real emails. Without those values, the backend prints a development code
to its terminal instead.

### Phone and Android API configuration

The app never embeds a local network address. Browser development uses `/api`,
which Vite proxies to the local backend. A physical phone or Capacitor build
must be compiled with a publicly reachable **HTTPS** backend URL.

Create `frontend/.env.production` from `frontend/.env.example` and set the
full API base URL, including `/api`:

```env
VITE_API_URL=https://your-api.example.com/api
```

Then rebuild and sync Android:

```bash
npm run android:sync
```

Ensure the deployed backend has `FRONTEND_URLS` configured for your browser
deployment. Capacitor Android requests originate from `http://localhost`, which
is allowed by default. Do not use a private LAN IP for a distributable mobile
build. For phone browser testing during development, run `npm run dev` in
`frontend`, open the Vite URL shown for your LAN from the phone, and the Vite
`/api` proxy will forward requests to the local backend.

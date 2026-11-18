# AI Interview Coach

A full-stack web app that generates realistic, role-specific mock interviews with **Groq**, scores your answers in real time, and tracks your progress over time — built with React, Node/Express, and Firebase.

> Practice technical, behavioral, or mixed interviews tailored to a job role, difficulty level, specific skills, and even a pasted job description — then get an instant, structured AI evaluation on every answer.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Firebase setup](#firebase-setup)
- [Groq setup](#gemini-setup)
- [API reference](#api-reference)
- [Project structure](#project-structure)
- [Testing](#testing)
- [Security notes](#security-notes)
- [Screenshots](#screenshots)
- [Known limitations & future improvements](#known-limitations--future-improvements)

---

## Features

**Authentication**
- Email/password registration and login (Firebase Authentication)
- Mandatory email verification before accessing the app
- Password reset by email
- Protected client-side routing based on auth + verification state

**Interview setup**
- Choose a job role, difficulty (easy/medium/hard), and number of questions (5/10/15)
- Choose an interview focus: technical, behavioral, or mixed
- Optionally add up to 8 specific skills/technologies to tailor questions
- Optionally paste a job description for additional context
- Optionally upload a PDF resume — it's parsed server-side into a structured summary (skills, roles, projects, estimated years of experience) that tailors both question generation and answer evaluation. The raw file and raw extracted text are never persisted; only the structured summary is (optionally) saved with the completed interview.

**Voice mode (optional)**
- Available in browsers that support the Web Speech API (Chrome/Edge; partial in Safari, unsupported in Firefox) — the toggle only appears where it will actually work
- Questions are read aloud automatically as they appear; a "Read aloud" button lets you replay them
- Speak your answer instead of typing — the transcript fills the same answer field you can still edit or type into directly before submitting. Nothing is ever auto-submitted from speech
- Transcription happens entirely in the browser; no audio is sent to the server. The final typed/spoken answer text goes through the exact same `/interview/evaluate` pipeline as text mode
- Completed interviews are tagged `voiceMode: true` so History shows a "Voice" badge on sessions where it was used

**Interview session**
- **Adaptive mode (default):** questions are generated one at a time as the interview progresses. After each answer is scored, the AI decides whether to probe the same topic further, move to a new one, or end the interview, based on the full transcript so far. The question count chosen at setup is a target, not a fixed count — the server enforces a hard minimum/maximum around that target so a session can never run away unbounded.
- **Fixed mode:** the original behavior — all questions for the session are generated up front in one call, exactly matching the chosen count.
- One question at a time, generated live by Groq with a strict JSON schema (no hallucinated formats)
- Progress bar and question counter
- A visible per-question countdown timer (scaled to difficulty), which turns into an "overtime" counter instead of blocking submission if you run over
- Confirmation prompt (and a browser refresh/close warning) before leaving an interview in progress

**AI evaluation**
- Every answer is scored 0–10 by Groq, with:
  - Overall feedback
  - Strengths
  - Weaknesses
  - Concrete suggestions for improvement
  - A sample stronger answer
- Server-side schema validation of the AI's response — malformed or out-of-range output is rejected before it reaches the client
- Automatic retry with exponential backoff on transient Groq errors (rate limits, temporary overload)

**Results**
- Overall score and per-question score breakdown
- Skill breakdown: average score by question type (technical/behavioral/situational)
- Expandable question-by-question analysis (your answer + full AI feedback per question)
- Aggregated overall strengths, weaknesses, and recommended practice areas
- **Retry this interview** (same settings, new questions), **New interview** (back to setup), or back to dashboard

**Dashboard**
- Real stats pulled from Firestore: total interviews, average score, best score, most recent score
- A small score-trend sparkline across your last few interviews
- Recent interviews list

**Analytics**
- Overall average, total questions answered, and a consistency rating (based on the standard deviation of your scores - "Very consistent" / "Consistent" / "Variable")
- A trend indicator comparing your recent sessions against earlier ones ("up", "down", or "about the same")
- Full score-over-time chart across every completed interview
- Breakdowns by question type, difficulty, role, skill tag, adaptive vs. fixed mode, and resume-tailored vs. standard sessions
- Computed entirely client-side from the same per-user Firestore data the Dashboard and History pages already fetch - no new backend endpoint or composite index required. This is a deliberate scope decision for typical history sizes (tens to low hundreds of interviews); see [Known limitations](#known-limitations--future-improvements) for when this should move server-side.

**History**
- Full list of your past interviews, scoped strictly to your own account (enforced both by the client query and by Firestore Security Rules)
- Search by role, filter by difficulty and interview type, sort by date or score
- Expand any past interview to review your original answers and AI feedback
- Adaptive / resume-tailored badges on relevant sessions

**Profile**
- Account details, member-since date, email verification status
- Send a password-reset email
- Sign out

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, React Router 7, Vite 6, vanilla CSS (custom design system, no UI framework) |
| Icons | [lucide-react](https://lucide.dev/) |
| Auth (client) | Firebase Authentication (Web SDK) |
| Database (client reads) | Cloud Firestore (Web SDK), governed by Firestore Security Rules |
| Backend | Node.js, Express 4 |
| Auth (server) | Firebase Admin SDK (verifies ID tokens) |
| Database (server writes) | Cloud Firestore (Admin SDK) |
| AI | Groq (`@google/genai`), structured JSON output via `responseSchema` |
| Resume parsing | `multer` (in-memory upload handling), `pdf-parse` v2 (PDF text extraction) |
| Security middleware | Helmet, CORS allowlist, `express-rate-limit` |
| Testing | Node's built-in `node:test` runner on both client and server |

---

## Architecture

```
┌──────────────┐        Firebase ID token         ┌───────────────────┐
│   React SPA  │ ───────────────────────────────► │   Express API      │
│ (Vite build) │ ◄─────────────────────────────── │  (Node.js)         │
└──────┬───────┘        JSON responses             └─────────┬─────────┘
       │                                                       │
       │ Firestore reads                                       │ Firestore writes
       │ (own data only,                                       │ (Firebase Admin SDK,
       │  enforced by Security Rules)                          │  bypasses rules by design)
       ▼                                                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Cloud Firestore                              │
│                     collection: interviews                           │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │   Groq API    │
                    │ (question generation & │
                    │   answer evaluation)   │
                    └───────────────────────┘
```

Key design decisions:
- **The client never talks to Groq directly.** The API key lives only in the server's environment and is never sent to the browser.
- **The client never writes interview results directly to Firestore.** Completed interviews are POSTed to the Express API, which validates the payload and writes via the Firebase Admin SDK. The client only *reads* its own interviews directly from Firestore (faster, and offloads simple reads from the API), protected by Security Rules.
- **All AI output is schema-validated server-side twice**: once by Groq's JSON-object response mode plus explicit prompt instructions, and again by an independent server-side validator, so a malformed or out-of-range AI response never reaches the client.

---

## Getting started

### Prerequisites
- Node.js 18+ and npm
- A Firebase project (see [Firebase setup](#firebase-setup))
- A Groq API key (see [Groq setup](#gemini-setup))

### Install

```bash
npm run install:all
```

This installs the root tooling plus `client/` and `server/` dependencies in one step. (Equivalent to running `npm install` in the root, `client/`, and `server/` folders individually.)

### Configure environment variables

Copy the example files and fill in real values:

```bash
cp .env.example .env
cp server/.env.example server/.env
cp client/.env.example client/.env
```

See [Environment variables](#environment-variables) below for what each value means and where to get it.

### Run in development

```bash
npm run dev
```

This starts the Vite dev server (client) and `nodemon` (server) concurrently. By default:
- Client: http://localhost:5173
- Server: http://localhost:5000

### Build for production

```bash
cd client && npm run build
```

Outputs a static bundle to `client/dist/`, deployable to any static host (Netlify, Vercel, Firebase Hosting, etc.). The server (`server/`) is deployed separately as a standard Node.js process (`npm start`).

---

## Environment variables

### `server/.env`

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | No | `development` or `production` |
| `PORT` | No | Port the API listens on (default `5000`) |
| `CLIENT_ORIGIN` | Yes | Comma-separated list of origins allowed by CORS (e.g. `http://localhost:5173`) |
| `TRUST_PROXY` | No | Set if deployed behind a reverse proxy/load balancer, so rate limiting sees the real client IP. Leave unset for local dev. |
| `FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | Yes | Service account client email (Firebase Admin SDK) |
| `FIREBASE_PRIVATE_KEY` | Yes | Service account private key (Firebase Admin SDK) — keep the `\n` escapes exactly as downloaded |
| `GROQ_API_KEY` | Yes | Your Groq API key. **Never** exposed to the client. |
| `GROQ_MODEL` | No | Groq model name (default `openai/gpt-oss-120b`) |

### `client/.env`

| Variable | Required | Description |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | Yes | Firebase web app config (safe to expose — not a secret, access is controlled by Security Rules) |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes | Firebase web app config |
| `VITE_FIREBASE_PROJECT_ID` | Yes | Firebase web app config |
| `VITE_FIREBASE_STORAGE_BUCKET` | Yes | Firebase web app config |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Yes | Firebase web app config |
| `VITE_FIREBASE_APP_ID` | Yes | Firebase web app config |
| `VITE_API_BASE_URL` | Yes | Base URL of the Express API, e.g. `http://localhost:5000/api` |

`.env`, `server/.env`, and `client/.env` are all listed in `.gitignore` and are never committed. Only the `.env.example` files (placeholders only) are tracked.

---

## Firebase setup

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com).
2. **Authentication** → Sign-in method → enable **Email/Password**.
3. **Firestore Database** → create a database (production mode is fine; rules are provided below).
4. Deploy the included security rules:
   ```bash
   firebase deploy --only firestore:rules
   ```
   (requires the [Firebase CLI](https://firebase.google.com/docs/cli) and `firebase login` first). The rules in `firestore.rules` restrict every interview document to its owner (`resource.data.userId == request.auth.uid`) for both reads and writes.
5. **Project settings → General** → under "Your apps," register a Web app and copy the config values into `client/.env`.
6. **Project settings → Service accounts** → "Generate new private key" → use the resulting JSON's `project_id`, `client_email`, and `private_key` for the three `FIREBASE_*` variables in `server/.env`.

---

## Groq setup

1. Get an API key from [Google AI Studio](https://aistudio.google.com/).
2. Set `GROQ_API_KEY` in `server/.env`.
3. `GROQ_MODEL` defaults to `gemini-3.5-flash`. Any model that supports structured JSON output (`responseSchema`) via `@google/genai` will work — swap it here if needed without touching any code.

---

## API reference

All endpoints are prefixed with `/api`. Endpoints under `/interview` and `/resume` require an `Authorization: Bearer <Firebase ID token>` header.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Liveness check, no auth required |
| `POST` | `/resume/parse` | Uploads a PDF resume (`multipart/form-data`, field name `resume`, 5MB max) and returns a structured `{ resumeContext }` (summary, skills, years of experience, roles, projects). The raw file and raw extracted text are never persisted - only this structured JSON is returned, and it's the caller's choice whether to carry it into the endpoints below. Rate-limited (10 / 15 min). |
| `POST` | `/interview/start` | Starts an interview. Body: `{ role, difficulty, numberOfQuestions, interviewType, skills, jobDescription, mode, resumeContext }`. `mode` is `'adaptive'` (default) or `'fixed'`. `resumeContext` is optional, typically the object returned by `/resume/parse`. In fixed mode, returns the full `numberOfQuestions`-length question set. In adaptive mode, returns only the first question plus `targetQuestionCount` (the soft target for the rest of the session). Rate-limited (10 / 15 min). |
| `POST` | `/interview/next` | Adaptive mode only. Given the transcript so far, returns either the next tailored question or `{ done: true }` if the interview should end. Body: `{ role, difficulty, interviewType, skills, jobDescription, resumeContext, history, targetQuestionCount }`, where `history` is an array of `{ question, type, answer, score }` for every question answered so far. The server enforces a hard cap on session length around `targetQuestionCount` regardless of what the AI decides, so a session can never grow unbounded. Rate-limited (60 / 15 min). |
| `POST` | `/interview/evaluate` | Evaluates a single answer. Body: `{ question, answer, role, difficulty, skills, jobDescription, resumeContext }`. Rate-limited (60 / 15 min). |
| `POST` | `/interview/complete` | Saves a finished interview to Firestore. Body: `{ role, difficulty, interviewType, mode, questions, answers, evaluations, resumeContext }`. Rate-limited (20 / 15 min). |

Every response follows a consistent error shape: `{ "message": "...", "code": "..." }`. Error messages shown to the client are always safe, generic text where the underlying cause shouldn't be exposed (e.g. internal failures); specific, actionable messages (e.g. validation errors) are shown when it's safe to do so.

---

## Project structure

```
AICoach/
├── client/                  # React SPA (Vite)
│   ├── src/
│   │   ├── api/             # fetch wrappers for the Express API (interview.js, resume.js)
│   │   ├── components/      # shared UI components (AppHeader, Alert, EvaluationDetails, ResumeUpload, ScoreBreakdownBar, ...)
│   │   ├── context/         # AuthContext, InterviewContext
│   │   ├── hooks/           # useUserInterviews, etc.
│   │   ├── pages/           # one file per route (Dashboard, History, Analytics, ...)
│   │   ├── routes/          # ProtectedRoute
│   │   ├── services/        # firebase.js, auth.js, interviews.js (Firestore reads)
│   │   ├── styles/          # global.css design system
│   │   └── utils/           # analytics.js (pure client-side analytics functions)
│   └── test/                # node:test suite
├── server/
│   ├── src/
│   │   ├── config/          # firebaseAdmin.js
│   │   ├── controllers/     # interview.controller.js, resume.controller.js
│   │   ├── middleware/      # auth.middleware.js, error.middleware.js
│   │   ├── routes/          # interview.routes.js, resume.routes.js, health.routes.js
│   │   ├── services/        # groq.service.js, interview.service.js, resumeParser.service.js
│   │   ├── utils/           # AppError.js
│   │   └── validators/      # interview.validator.js, evaluation.validator.js, resume.validator.js
│   └── test/                # node:test suite (includes test/fixtures/ for resume-parsing tests)
├── firestore.rules
└── firebase.json
```

---

## Testing

```bash
# Server
cd server && npm test

# Client
cd client && npm test
```

Both suites use Node's built-in test runner (`node:test`) — no extra test framework dependency. Server tests cover auth requirements, input validation, and safe error handling for the interview endpoints. Client tests cover password validation and account-creation error messaging (not leaking whether an email is already registered).

---

## Security notes

- The Groq API key and Firebase Admin credentials exist only in `server/.env` and are never returned in any API response or logged to the client.
- All interview-related endpoints require a valid Firebase ID token, verified server-side via the Firebase Admin SDK.
- Firestore Security Rules independently enforce per-user data isolation for client-side reads, as defense in depth alongside the server-side checks.
- Every input field (role, difficulty, question count, skills, job description, answers) is validated and length-capped server-side, regardless of what the client sends.
- Rate limiting is applied per endpoint to bound both cost (Groq calls) and abuse (Firestore writes).
- AI-generated content is validated against a strict schema before use; a malformed or out-of-range response from Groq is rejected rather than passed through.

---

## Screenshots

*(Add your own screenshots here once you've run the app locally — e.g. `docs/screenshot-dashboard.png` — since this README was written without a live rendering environment. Suggested shots: landing page, an interview session with the timer visible, and the results page with the skill breakdown.)*

---

## Known limitations & future improvements

Being transparent about what's intentionally simple rather than claiming it's all fully production-scale:

- **History pagination**: `useUserInterviews` currently fetches *all* of a user's interviews in one query and sorts/filters client-side. This keeps the Firestore query index-free and is fine at personal-project scale, but a high-volume user would benefit from server-side pagination plus a composite index on `(userId, createdAt)`.
- **Bundle size**: the client JS bundle is roughly 760KB pre-gzip (mostly the Firestore SDK). Code-splitting the Firestore-dependent routes (Dashboard/History/Profile) away from the public landing/auth routes would meaningfully reduce initial load time.
- **No automated end-to-end/UI tests**: current tests are unit-level (validators, auth error mapping). Adding React component tests or a Playwright/Cypress E2E suite would raise confidence further.
- **No admin/moderation tooling**: there's no way to review or moderate generated content beyond the schema validation already in place.
- **Single language, light mode only**: no i18n, no dark mode.
- **No CI pipeline**: tests run locally; wiring `npm test` into a GitHub Actions workflow would be a natural next step for a portfolio piece.
- **Adaptive mode doesn't drift difficulty per-question yet**: the AI is prompted to lean harder/easier based on how the candidate is scoring, but there's no explicit stored difficulty-per-question — the session keeps one base difficulty throughout. A future iteration could track and surface per-question difficulty explicitly.
- **Adaptive mode costs roughly one extra Groq call per question** compared to fixed mode (a decide-and-generate call instead of a single up-front batch call). Worth watching Groq usage/cost if adaptive becomes the default at scale.
- **Resume PDF extraction is best-effort**: PDF text extraction works well for typical exports (Word/Google Docs/most resume builders, verified against several real samples) but can occasionally fail on unusual encoders. When that happens, the user gets a clear message asking them to try a different export rather than a silent failure or crash. Scanned/image-only PDFs (no embedded text layer) aren't supported - OCR is out of scope for now.
- **No JD-side structured extraction**: the job description is passed to the AI as raw pasted text (already validated/length-capped), not separately parsed into structured requirements the way the resume is. This was a deliberate simplification to avoid an extra AI call per interview start; a future iteration could add it if there's a clear benefit shown by richer JD-matching in evaluations.
- **Analytics is computed client-side, on every page load, from the user's full interview history.** For a typical user (tens to low hundreds of interviews) this is fast and avoids new backend infrastructure. If history sizes grow much larger, or if analytics needs to support querying across users (e.g. anonymized benchmarks), the natural next step is a server-side aggregation endpoint plus the composite Firestore index (`userId`, `createdAt`) already called out above, and possibly a denormalized per-user stats document kept in sync on each completed interview - rather than recomputing from the full raw history every time.
- **The "top recurring feedback" concept was considered but not shipped in this pass**: an earlier draft extracted word-frequency patterns from AI feedback text (e.g. "communication" appearing across several weaknesses) but it was cut in favor of the more reliable structured breakdowns (by type, difficulty, skill, etc.), since simple word-frequency counting over AI-generated prose is a weak signal on its own and risks feeling more authoritative than it is.

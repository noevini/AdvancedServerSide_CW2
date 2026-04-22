# Alumni Analytics Dashboard — CW2

## Overview

A server-side web dashboard built with Node.js and Express that consumes the **Alumni Influencers API (CW1)** to display graduate outcome data for university staff. It visualises certifications, employment trends, and alumni profiles through interactive charts and a filterable alumni directory.

---

## Project Structure

```
AdvancedServerSide_CW2/
├── public/
│   ├── css/
│   │   └── style.css               # Global styles and responsive layout
│   └── js/
│       ├── alumni.js               # Client-side search/filter + export link sync
│       ├── dashboard.js            # Dashboard chart rendering
│       └── graphs.js               # Chart.js chart rendering with loading states
├── src/
│   ├── controllers/
│   │   └── dashboardController.js  # All route handlers, auth, user store, API calls
│   ├── routes/
│   │   └── index.js                # Express router with auth guard middleware
│   ├── views/
│   │   ├── partials/
│   │   │   ├── head.ejs            # HTML head partial (CSS link, meta)
│   │   │   ├── navbar.ejs          # Navigation bar with active state
│   │   │   └── footer.ejs          # Footer partial
│   │   ├── login.ejs               # Staff login form
│   │   ├── register.ejs            # New account registration form
│   │   ├── verify-email.ejs        # Email verification code entry
│   │   ├── reset-password.ejs      # Two-stage password reset (request + confirm)
│   │   ├── dashboard.ejs           # Summary stats and skills gap chart
│   │   ├── graphs.ejs              # All interactive Chart.js visualisations
│   │   ├── alumni.ejs              # Filterable alumni directory table
│   │   └── export-pdf.ejs          # Print-friendly alumni export view
│   ├── app.js                      # Express setup: middleware, rate limiting, routes
│   └── server.js                   # HTTP server entry point
├── .env.example                    # Template for required environment variables
├── package.json
└── README.md
```

---

## Setup Instructions

### Prerequisites

- Node.js 18+
- CW1 Alumni Influencers API running on `http://localhost:3000`

### Steps

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd AdvancedServerSide_CW2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create your environment file**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your values (see [Environment Variables](#environment-variables) below).

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open the app**
   Navigate to [http://localhost:4000](http://localhost:4000)

> The CW1 API server must be running on `http://localhost:3000`. If unreachable, the dashboard shows an error banner on each page.

---

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `PORT` | Port the CW2 server listens on | `4000` |
| `NODE_ENV` | Environment mode | `development` |
| `APP_URL` | Public URL of this dashboard — used to restrict CORS to same origin | `http://localhost:4000` |
| `SESSION_SECRET` | Secret key used to sign session cookies — use a long random string in production | `change-me-in-production` |
| `CW1_API_URL` | Base URL of the CW1 Alumni Influencers API | `http://localhost:3000` |
| `ANALYTICS_API_KEY` | Bearer token for authenticating requests to CW1 (must have `read:alumni` and `read:analytics` permissions) | `your_api_key_here` |
| `DASHBOARD_USERNAME` | Default admin login username | `admin` |
| `DASHBOARD_PASSWORD` | Default admin login password (min 8 chars, uppercase, number, special char) | `admin123` |

---

## Pages & Routes

| Page | Route | Auth | Description |
|---|---|---|---|
| **Login** | `GET/POST /login` | Public | Staff login with CSRF protection |
| **Register** | `GET/POST /register` | Public | New account — university email (.ac.uk) required |
| **Verify Email** | `GET/POST /verify-email` | Public | 6-char token verification (expires 15 min) |
| **Reset Password** | `GET/POST /reset-password` | Public | Two-stage: request token, then set new password (expires 30 min) |
| **Logout** | `GET /logout` | Public | Destroys session and redirects to login |
| **Dashboard** | `GET /` | Protected | Summary stat cards and skills gap bar chart |
| **Graphs** | `GET /graphs` | Protected | 7 interactive charts filtered by programme and graduation year |
| **Alumni** | `GET /alumni` | Protected | Filterable alumni directory (search, programme, year, industry) |
| **Export CSV** | `GET /export/csv` | Protected | Downloads filtered alumni data as CSV |
| **Export PDF** | `GET /export/pdf` | Protected | Opens print-friendly filtered alumni table |

---

## API Integration

This dashboard connects to the **CW1 Alumni Influencers API** using bearer token authentication. Every outbound request includes an `Authorization: Bearer <token>` header sourced from `ANALYTICS_API_KEY`.

Requests use a **3 second timeout** — if CW1 does not respond, the page renders an error banner.

### Endpoints consumed

| Method | Endpoint | Query Params | Used for |
|---|---|---|---|
| GET | `/analytics/summary` | — | Dashboard summary stats |
| GET | `/analytics/certifications` | `programme`, `year` | Skills gap bar chart |
| GET | `/analytics/trends` | `programme`, `year` | Technology adoption line chart |
| GET | `/analytics/employment` | `programme`, `year` | Industry pie, job titles doughnut, employers bar |
| GET | `/analytics/short-courses` | `programme`, `year` | Course categories radar chart |
| GET | `/analytics/geographic` | `programme`, `year` | Geographic distribution radar chart |
| GET | `/analytics/alumni` | — | Alumni directory, CSV and PDF export |

### API Key Scoping

The `ANALYTICS_API_KEY` must be scoped with `read:alumni` and `read:analytics` permissions in CW1. This ensures the analytics dashboard cannot access endpoints reserved for other clients (e.g. the Mobile AR app which requires `read:alumni_of_day`). A compromised dashboard key cannot escalate privileges beyond its assigned scope.

---

## Security

| Measure | Implementation |
|---|---|
| **Session authentication** | All protected routes require an active server-side session via `requireAuth` middleware |
| **CORS** | Requests only accepted from the same origin (`APP_URL`) — cross-origin scraping blocked |
| **CSRF protection** | Every POST form includes a cryptographically random single-use token validated server-side |
| **Password hashing** | bcrypt with 10 salt rounds — industry standard, resistant to brute-force and rainbow tables |
| **Token expiry** | Email verification tokens expire after 15 minutes; password reset tokens after 30 minutes |
| **Single-use tokens** | Verify and reset tokens are nulled immediately after successful use |
| **Rate limiting** | 100 requests / 15 min globally; 10 requests / 15 min on `/login` to prevent brute-force |
| **Helmet** | Sets secure HTTP headers: X-Frame-Options, X-Content-Type-Options, HSTS, etc. |
| **httpOnly cookies** | Session cookie is inaccessible to client-side JavaScript |
| **Input validation** | All form inputs trimmed, length-checked, and tested for HTML injection before processing |
| **University email enforcement** | Registration requires a `.ac.uk` email address |
| **XSS prevention** | EJS uses `<%= %>` (escaped output) for all user-supplied data; raw `<%-` only for trusted partials |
| **Environment credentials** | No secrets hardcoded — all credentials loaded from environment variables |

---

## Architecture

```
Browser
  │
  ▼
Express (CW2 — port 4000)
  ├── Helmet (security headers)
  ├── express-rate-limit (rate limiting)
  ├── express-session (session management)
  ├── Routes (index.js)
  │     └── requireAuth middleware
  └── dashboardController.js
        ├── fetchFromAPI() → CW1 API (port 3000)
        └── EJS templates → HTML response

CW1 Alumni Influencers API (port 3000)
  ├── apiTokenMiddleware (bearer token check)
  ├── requirePermission (read:alumni | read:analytics)
  └── SQLite database
```

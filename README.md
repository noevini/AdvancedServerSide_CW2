# Alumni Analytics Dashboard — CW2

## Overview

A server-side web dashboard built with Node.js and Express that consumes the **Alumni Influencers API (CW1)** to display graduate outcome data for university staff. It visualises certifications, employment trends, and alumni profiles through interactive charts and a filterable directory. When the CW1 API is unavailable, the dashboard falls back to sample mock data so the interface remains functional.

---

## Project Structure

```
AdvancedServerSide_CW2/
├── public/
│   ├── css/
│   │   └── style.css           # Global styles
│   └── js/
│       ├── alumni.js           # Client-side search/filter for alumni table
│       ├── dashboard.js        # Client-side dashboard interactions
│       └── graphs.js           # Chart.js chart rendering
├── src/
│   ├── controllers/
│   │   └── dashboardController.js  # Route handlers and mock data
│   ├── routes/
│   │   └── index.js            # Express router with auth guard
│   ├── views/
│   │   ├── partials/
│   │   │   ├── head.ejs        # HTML head partial
│   │   │   ├── navbar.ejs      # Navigation bar partial
│   │   │   └── footer.ejs      # Footer partial
│   │   ├── login.ejs
│   │   ├── dashboard.ejs
│   │   ├── graphs.ejs
│   │   ├── alumni.ejs
│   │   └── export-pdf.ejs      # Print-friendly alumni export
│   ├── app.js                  # Express app setup (middleware, rate limiting)
│   └── server.js               # HTTP server entry point
├── .env.example
├── package.json
└── README.md
```

---

## Setup Instructions

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
   Then edit `.env` with your values (see [Environment Variables](#environment-variables) below).

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open the app**
   Navigate to [http://localhost:4000](http://localhost:4000)

> The CW1 API server should be running on `http://localhost:3000` for live data. If it is not running, the dashboard loads with sample mock data automatically.

---

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `PORT` | Port the CW2 server listens on | `4000` |
| `NODE_ENV` | Environment mode | `development` |
| `SESSION_SECRET` | Secret key used to sign session cookies | `change-me-in-production` |
| `CW1_API_URL` | Base URL of the CW1 Alumni Influencers API | `http://localhost:3000` |
| `ANALYTICS_API_KEY` | Bearer token for authenticating requests to CW1 | `your_api_key_here` |
| `DASHBOARD_USERNAME` | Login username for the dashboard | `admin` |
| `DASHBOARD_PASSWORD` | Login password for the dashboard | `admin123` |

---

## Pages

| Page | Route | Description |
|---|---|---|
| **Login** | `/login` | Staff login form with session-based authentication |
| **Dashboard** | `/` | Summary statistics and key metrics cards |
| **Graphs** | `/graphs` | Interactive Chart.js visualisations of graduate outcomes |
| **Alumni** | `/alumni` | Filterable table of all alumni records with CSV/PDF export |

---

## API Integration

This dashboard connects to the **CW1 Alumni Influencers API** using bearer token authentication. Every outbound request includes an `Authorization: Bearer <token>` header using the `ANALYTICS_API_KEY` environment variable.

Requests use a **500 ms timeout** — if the CW1 server does not respond in time, the controller silently falls back to mock data and the page still renders.

### Endpoints consumed

| Method | Endpoint | Used for |
|---|---|---|
| GET | `/analytics/summary` | Dashboard summary stats |
| GET | `/analytics/certifications` | Top certifications bar chart |
| GET | `/analytics/trends` | Technology adoption line chart |
| GET | `/analytics/employment` | Industry, job title, and employer charts |
| GET | `/analytics/short-courses` | Course categories radar chart |
| GET | `/analytics/alumni` | Alumni directory table and exports |

> These endpoints do not yet exist in CW1 and are planned for a future iteration. Until then, mock data is served automatically.

---

## Security

| Measure | Details |
|---|---|
| **Session authentication** | All routes except `/login` require an active server-side session |
| **Rate limiting** | 100 requests / 15 min globally; 10 requests / 15 min on `/login` |
| **Helmet** | Sets secure HTTP headers (X-Frame-Options, X-Content-Type-Options, etc.) |
| **httpOnly cookies** | Session cookie is inaccessible to client-side JavaScript |
| **DASHBOARD_USERNAME / PASSWORD** | Credentials are read from environment variables, not hardcoded |

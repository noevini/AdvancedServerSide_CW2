const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const path = require("path");
const rateLimit = require("express-rate-limit");

const routes = require("./routes");

const app = express();

// Security headers — adds X-Frame-Options, X-XSS-Protection, etc.
// contentSecurityPolicy disabled so Chart.js CDN loads fine in dev
app.use(
  helmet({
    contentSecurityPolicy: false,
  }),
);

// CORS — only allow requests from the same origin (the dashboard itself)
// Blocks cross-origin requests from other domains attempting to scrape data
app.use(
  cors({
    origin: process.env.APP_URL || "http://localhost:4000",
    credentials: true,
  }),
);

// View engine — EJS templates live in src/views/
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Static files — CSS and client-side JS served from /public
app.use(express.static(path.join(__dirname, "..", "public")));

// Body parsing
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());

// Session — persists the logged-in state of the staff member
// In production, replace MemoryStore with a persistent store
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true, // JS cannot read the cookie
      secure: false, // set true in production (HTTPS)
      maxAge: 1000 * 60 * 60, // 1 hour session lifetime
    },
  }),
);

// General rate limit — 100 requests per 15 minutes for all routes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limit — 10 requests per 15 minutes for login only
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(generalLimiter);
app.use("/login", loginLimiter);

// Routes
app.use("/", routes);

module.exports = app;

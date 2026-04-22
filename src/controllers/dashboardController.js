const axios = require("axios");
const crypto = require("crypto");
const bcrypt = require("bcrypt");

const SALT_ROUNDS = 10;

// Returns an error string if the password fails complexity rules, otherwise null
const validatePassword = (password) => {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter.";
  if (!/[0-9]/.test(password)) return "Password must contain at least one number.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must contain at least one special character.";
  return null;
};

// Base URL and API key for the CW1 backend
const API_URL = process.env.CW1_API_URL || "http://localhost:3000";
const API_KEY = process.env.ANALYTICS_API_KEY || "";

// In-memory user store — seeded with the admin account from env
const users = new Map();
const adminUsername = process.env.DASHBOARD_USERNAME || "admin";
const adminPassword = process.env.DASHBOARD_PASSWORD || "admin123";
users.set(adminUsername, {
  username: adminUsername,
  email: "admin@university.ac.uk",
  passwordHash: bcrypt.hashSync(adminPassword, SALT_ROUNDS),
  verified: true,
  verifyToken: null,
  verifyTokenExpiry: null,
  resetToken: null,
  resetTokenExpiry: null,
});

// Builds axios headers with the bearer token required by CW1
const apiHeaders = () => ({ Authorization: `Bearer ${API_KEY}` });

// Fetches data from the CW1 API — returns null on failure
const fetchFromAPI = async (url) => {
  try {
    const res = await axios.get(url, { headers: apiHeaders(), timeout: 3000 });
    return res.data;
  } catch {
    return null;
  }
};

// ── LOGIN ─────────────────────────────────────────────────

// Generates a fresh CSRF token and stores it in the session
const generateCsrfToken = (req) => {
  const token = crypto.randomBytes(24).toString("hex");
  req.session.csrfToken = token;
  return token;
};

// GET /login
const getLogin = (req, res) => {
  if (req.session && req.session.user) return res.redirect("/");
  res.render("login", { error: null, csrfToken: generateCsrfToken(req) });
};

// POST /login — validate input, verify CSRF, check credentials
const postLogin = async (req, res) => {
  const { username, password, _csrf } = req.body;

  if (!_csrf || _csrf !== req.session.csrfToken) {
    return res.status(403).render("login", {
      error: "Invalid request. Please try again.",
      csrfToken: generateCsrfToken(req),
    });
  }
  req.session.csrfToken = null;

  const cleanUsername = (username || "").trim();
  const cleanPassword = (password || "").trim();

  if (!cleanUsername || !cleanPassword) {
    return res.render("login", {
      error: "Username and password are required.",
      csrfToken: generateCsrfToken(req),
    });
  }

  const htmlPattern = /<[^>]*>/;
  if (htmlPattern.test(cleanUsername) || htmlPattern.test(cleanPassword)) {
    return res.render("login", {
      error: "Invalid characters in input.",
      csrfToken: generateCsrfToken(req),
    });
  }

  const user = users.get(cleanUsername);
  const validPassword = user ? await bcrypt.compare(cleanPassword, user.passwordHash) : false;

  if (!user || !validPassword) {
    return res.render("login", {
      error: "Invalid username or password.",
      csrfToken: generateCsrfToken(req),
    });
  }

  if (!user.verified) {
    req.session.pendingUser = cleanUsername;
    return res.redirect("/verify-email");
  }

  req.session.user = { username: cleanUsername };
  return res.redirect("/");
};

// GET /logout
const logout = (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
};

// ── DASHBOARD ─────────────────────────────────────────────

// GET /
const getDashboard = async (req, res) => {
  const [summary, certifications, employment] = await Promise.all([
    fetchFromAPI(`${API_URL}/analytics/summary`),
    fetchFromAPI(`${API_URL}/analytics/certifications`),
    fetchFromAPI(`${API_URL}/analytics/employment`),
  ]);

  const error = !summary && !certifications ? "Could not connect to the API. Check CW1 is running." : null;

  res.render("dashboard", {
    user: req.session.user,
    summary,
    certifications,
    employment,
    error,
  });
};

// ── GRAPHS ────────────────────────────────────────────────

// GET /graphs — accepts ?programme= and ?year= query params forwarded to the API
const getGraphs = async (req, res) => {
  const { programme = "", year = "" } = req.query;

  const buildUrl = (base) => {
    const params = new URLSearchParams();
    if (programme) params.set("programme", programme);
    if (year) params.set("year", year);
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  };

  const [certifications, trends, employment, courses, geographic] = await Promise.all([
    fetchFromAPI(buildUrl(`${API_URL}/analytics/certifications`)),
    fetchFromAPI(buildUrl(`${API_URL}/analytics/trends`)),
    fetchFromAPI(buildUrl(`${API_URL}/analytics/employment`)),
    fetchFromAPI(buildUrl(`${API_URL}/analytics/short-courses`)),
    fetchFromAPI(buildUrl(`${API_URL}/analytics/geographic`)),
  ]);

  const error = !certifications && !trends ? "Could not connect to the API. Check CW1 is running." : null;

  res.render("graphs", {
    user: req.session.user,
    certifications,
    trends,
    employment,
    courses,
    geographic,
    filters: { programme, year },
    error,
  });
};

// ── ALUMNI ────────────────────────────────────────────────

// GET /alumni
const getAlumni = async (req, res) => {
  const alumni = await fetchFromAPI(`${API_URL}/analytics/alumni`);

  res.render("alumni", {
    user: req.session.user,
    alumni: alumni || [],
    error: !alumni ? "Could not connect to the API. Check CW1 is running." : null,
  });
};

// ── EXPORT ────────────────────────────────────────────────

// Applies search, programme, year and industry filters to an alumni array
const applyAlumniFilters = (alumni, query) => {
  const { search = "", programme = "", year = "", industry = "" } = query;
  return alumni.filter((a) => {
    const text = Object.values(a).join(" ").toLowerCase();
    const matchSearch = !search || text.includes(search.toLowerCase());
    const matchProgramme = !programme || (a.degree_name || "") === programme;
    const matchYear = !year || String(a.year_completed) === year;
    const matchIndustry = !industry || (a.industry || "") === industry;
    return matchSearch && matchProgramme && matchYear && matchIndustry;
  });
};

// GET /export/csv — downloads filtered alumni data as CSV
const exportCSV = async (req, res) => {
  const all = await fetchFromAPI(`${API_URL}/analytics/alumni`);
  const alumni = applyAlumniFilters(all || [], req.query);

  const header = "Name,Email,Degree,Year,Employer,Job Title,Industry\n";
  const rows = alumni.map((a) =>
    [a.full_name, a.email, a.degree_name, a.year_completed, a.company_name, a.job_title, a.industry]
      .map((v) => `"${(v || "").toString().replace(/"/g, '""')}"`)
      .join(",")
  );

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=alumni.csv");
  res.send(header + rows.join("\n"));
};

// GET /export/pdf — renders a print-friendly filtered alumni table
const exportPDF = async (req, res) => {
  const all = await fetchFromAPI(`${API_URL}/analytics/alumni`);
  const alumni = applyAlumniFilters(all || [], req.query);
  res.render("export-pdf", { alumni });
};

// ── REGISTER ──────────────────────────────────────────────

// GET /register
const getRegister = (req, res) => {
  if (req.session && req.session.user) return res.redirect("/");
  res.render("register", { error: null, csrfToken: generateCsrfToken(req) });
};

// POST /register — validate input, create user, generate verify token
const postRegister = async (req, res) => {
  const { username, email, password, _csrf } = req.body;

  if (!_csrf || _csrf !== req.session.csrfToken) {
    return res.status(403).render("register", {
      error: "Invalid request. Please try again.",
      csrfToken: generateCsrfToken(req),
    });
  }
  req.session.csrfToken = null;

  const cleanUsername = (username || "").trim();
  const cleanEmail = (email || "").trim();
  const cleanPassword = (password || "").trim();

  if (!cleanUsername || !cleanEmail || !cleanPassword) {
    return res.render("register", { error: "All fields are required.", csrfToken: generateCsrfToken(req) });
  }

  const htmlPattern = /<[^>]*>/;
  if (htmlPattern.test(cleanUsername) || htmlPattern.test(cleanEmail)) {
    return res.render("register", { error: "Invalid characters in input.", csrfToken: generateCsrfToken(req) });
  }

  if (!cleanEmail.endsWith(".ac.uk")) {
    return res.render("register", {
      error: "Registration requires a university email address (.ac.uk).",
      csrfToken: generateCsrfToken(req),
    });
  }

  const passwordError = validatePassword(cleanPassword);
  if (passwordError) {
    return res.render("register", { error: passwordError, csrfToken: generateCsrfToken(req) });
  }

  if (users.has(cleanUsername)) {
    return res.render("register", { error: "Username already taken.", csrfToken: generateCsrfToken(req) });
  }

  const verifyToken = crypto.randomBytes(3).toString("hex").toUpperCase();
  const passwordHash = await bcrypt.hash(cleanPassword, SALT_ROUNDS);

  users.set(cleanUsername, {
    username: cleanUsername,
    email: cleanEmail,
    passwordHash,
    verified: false,
    verifyToken,
    verifyTokenExpiry: Date.now() + 15 * 60 * 1000,
    resetToken: null,
    resetTokenExpiry: null,
  });

  req.session.pendingUser = cleanUsername;
  res.redirect("/verify-email");
};

// ── VERIFY EMAIL ──────────────────────────────────────────

// GET /verify-email
const getVerifyEmail = (req, res) => {
  const username = req.session.pendingUser;
  if (!username || !users.has(username)) return res.redirect("/login");
  const user = users.get(username);
  res.render("verify-email", { error: null, token: user.verifyToken, csrfToken: generateCsrfToken(req) });
};

// POST /verify-email — compare token and mark account as verified
const postVerifyEmail = (req, res) => {
  const { token, _csrf } = req.body;
  const username = req.session.pendingUser;

  if (!_csrf || _csrf !== req.session.csrfToken) return res.status(403).redirect("/verify-email");
  req.session.csrfToken = null;

  if (!username || !users.has(username)) return res.redirect("/login");

  const user = users.get(username);

  if (Date.now() > user.verifyTokenExpiry) {
    return res.render("verify-email", {
      error: "Verification code has expired. Please register again.",
      token: null,
      csrfToken: generateCsrfToken(req),
    });
  }

  if (!token || token.trim().toUpperCase() !== user.verifyToken) {
    return res.render("verify-email", {
      error: "Invalid verification code. Please try again.",
      token: user.verifyToken,
      csrfToken: generateCsrfToken(req),
    });
  }

  user.verified = true;
  user.verifyToken = null;
  user.verifyTokenExpiry = null;
  delete req.session.pendingUser;
  req.session.user = { username };
  res.redirect("/");
};

// ── RESET PASSWORD ────────────────────────────────────────

// GET /reset-password
const getResetPassword = (req, res) => {
  res.render("reset-password", { error: null, success: null, stage: "request", csrfToken: generateCsrfToken(req) });
};

// POST /reset-password — stage 1: issue token; stage 2: set new password
const postResetPassword = async (req, res) => {
  const { stage, email, token, password, _csrf } = req.body;

  if (!_csrf || _csrf !== req.session.csrfToken) return res.status(403).redirect("/reset-password");
  req.session.csrfToken = null;

  if (stage === "request") {
    const user = Array.from(users.values()).find((u) => u.email === (email || "").trim());
    const resetToken = user ? crypto.randomBytes(3).toString("hex").toUpperCase() : null;
    if (user && resetToken) {
      user.resetToken = resetToken;
      user.resetTokenExpiry = Date.now() + 30 * 60 * 1000;
      req.session.resetEmail = user.email;
    }
    return res.render("reset-password", {
      error: null,
      success: "If that email is registered, a reset code has been issued.",
      stage: "confirm",
      resetToken: user ? resetToken : null,
      csrfToken: generateCsrfToken(req),
    });
  }

  if (stage === "confirm") {
    const user = Array.from(users.values()).find((u) => u.email === req.session.resetEmail);

    if (!user || !token || token.trim().toUpperCase() !== user.resetToken || Date.now() > user.resetTokenExpiry) {
      return res.render("reset-password", {
        error: "Invalid or expired reset code.",
        success: null,
        stage: "confirm",
        resetToken: null,
        csrfToken: generateCsrfToken(req),
      });
    }

    const cleanPassword = (password || "").trim();
    const passwordError = validatePassword(cleanPassword);
    if (passwordError) {
      return res.render("reset-password", {
        error: passwordError,
        success: null,
        stage: "confirm",
        resetToken: null,
        csrfToken: generateCsrfToken(req),
      });
    }

    user.passwordHash = await bcrypt.hash(cleanPassword, SALT_ROUNDS);
    user.resetToken = null;
    user.resetTokenExpiry = null;
    delete req.session.resetEmail;

    return res.render("reset-password", {
      error: null,
      success: "Password updated. You can now log in.",
      stage: "done",
      csrfToken: generateCsrfToken(req),
    });
  }

  res.redirect("/reset-password");
};

module.exports = {
  getLogin,
  postLogin,
  logout,
  getRegister,
  postRegister,
  getVerifyEmail,
  postVerifyEmail,
  getResetPassword,
  postResetPassword,
  getDashboard,
  getGraphs,
  getAlumni,
  exportCSV,
  exportPDF,
};

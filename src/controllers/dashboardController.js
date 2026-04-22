const axios = require("axios");
const crypto = require("crypto");
const bcrypt = require("bcrypt");

const SALT_ROUNDS = 10;

// Base URL and API key for the CW1 backend
const API_URL = process.env.CW1_API_URL || "http://localhost:3000";
const API_KEY = process.env.ANALYTICS_API_KEY || "";

// In-memory user store — seeded with the admin account from env
// Each entry: { username, email, passwordHash, verified, verifyToken, resetToken }
const users = new Map();

const initAdminUser = async () => {
  const username = process.env.DASHBOARD_USERNAME || "admin";
  const password = process.env.DASHBOARD_PASSWORD || "admin123";
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  users.set(username, {
    username,
    email: "admin@university.ac.uk",
    passwordHash,
    verified: true,
    verifyToken: null,
    resetToken: null,
  });
};
initAdminUser();

// Helper — builds axios headers with the bearer token
// Every request to CW1 must carry this token
const apiHeaders = () => ({
  Authorization: `Bearer ${API_KEY}`,
});

// Try the API with a short timeout; return fallback if it fails
const fetchOrMock = async (url, fallback) => {
  try {
    const res = await axios.get(url, { headers: apiHeaders(), timeout: 500 });
    return res.data;
  } catch {
    return fallback;
  }
};

// Fallback data used when the API is unavailable
const mockData = {
  summary: {
    totalAlumni: 248,
    totalCertifications: 1432,
    employmentRate: 94,
    criticalGaps: 3,
    avgTimeToEmployment: 4,
  },
  certifications: {
    labels: [
      "AWS Cloud Practitioner", "CompTIA Security+", "Google Analytics",
      "Docker Certified", "PMP", "Kubernetes (CKA)",
      "Azure Fundamentals", "Cisco CCNA", "Scrum Master", "Salesforce Admin",
    ],
    values: [68, 54, 47, 42, 38, 35, 31, 28, 25, 21],
  },
  trends: {
    labels: ["2019", "2020", "2021", "2022", "2023"],
    datasets: [
      { label: "Cloud", data: [12, 18, 28, 42, 55], borderColor: "#3B82F6", backgroundColor: "transparent" },
      { label: "Security", data: [8, 14, 22, 35, 48], borderColor: "#EF4444", backgroundColor: "transparent" },
      { label: "DevOps", data: [5, 10, 18, 30, 41], borderColor: "#10B981", backgroundColor: "transparent" },
    ],
  },
  employment: {
    industries: {
      labels: ["Technology", "Finance", "Healthcare", "Education", "Retail"],
      values: [45, 20, 15, 12, 8],
    },
    jobTitles: {
      labels: ["Software Engineer", "Data Analyst", "Project Manager", "DevOps Engineer", "UX Designer"],
      values: [35, 25, 18, 14, 8],
    },
    employers: {
      labels: ["Google", "Amazon", "Microsoft", "Accenture", "IBM"],
      values: [42, 38, 35, 28, 22],
    },
  },
  courses: {
    labels: ["Cloud Computing", "Data Science", "Cybersecurity", "Web Development", "AI/ML", "DevOps"],
    values: [85, 72, 65, 58, 48, 41],
  },
  geographic: {
    labels: ["London", "Manchester", "Birmingham", "Edinburgh", "Bristol"],
    values: [45, 18, 14, 12, 11],
  },
  alumni: [
    { full_name: "Alice Johnson", email: "alice@example.com", degree_name: "BSc Computer Science", year_completed: 2021, company_name: "Google", job_title: "Software Engineer", industry: "Technology" },
    { full_name: "Ben Carter", email: "ben@example.com", degree_name: "BSc Data Science", year_completed: 2020, company_name: "Amazon", job_title: "Data Analyst", industry: "Technology" },
    { full_name: "Clara Smith", email: "clara@example.com", degree_name: "BSc Cybersecurity", year_completed: 2022, company_name: "Microsoft", job_title: "Security Analyst", industry: "Technology" },
    { full_name: "David Lee", email: "david@example.com", degree_name: "BSc Software Engineering", year_completed: 2021, company_name: "Accenture", job_title: "DevOps Engineer", industry: "Consulting" },
    { full_name: "Emma Brown", email: "emma@example.com", degree_name: "BSc AI", year_completed: 2023, company_name: "IBM", job_title: "ML Engineer", industry: "Technology" },
  ],
};

// ── LOGIN ─────────────────────────────────────────────────

// Generates a fresh CSRF token and stores it in the session
const generateCsrfToken = (req) => {
  const token = crypto.randomBytes(24).toString("hex");
  req.session.csrfToken = token;
  return token;
};

// GET /login — render the login form
const getLogin = (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect("/");
  }
  res.render("login", { error: null, csrfToken: generateCsrfToken(req) });
};

// POST /login — validate input, verify CSRF token, then check credentials
const postLogin = async (req, res) => {
  const { username, password, _csrf } = req.body;

  // CSRF verification — token in form must match token stored in session
  if (!_csrf || _csrf !== req.session.csrfToken) {
    return res.status(403).render("login", {
      error: "Invalid request. Please try again.",
      csrfToken: generateCsrfToken(req),
    });
  }

  // Invalidate the used token so it cannot be reused
  req.session.csrfToken = null;

  // Input validation — trim whitespace and reject empty fields
  const cleanUsername = (username || "").trim();
  const cleanPassword = (password || "").trim();

  if (!cleanUsername || !cleanPassword) {
    return res.render("login", {
      error: "Username and password are required.",
      csrfToken: generateCsrfToken(req),
    });
  }

  // Reject input containing HTML tags to prevent XSS
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

// GET /logout — destroy session and redirect to login
const logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
};

// ── DASHBOARD ─────────────────────────────────────────────

// GET / — fetch dashboard data from API, fall back to mock if unavailable
const getDashboard = async (req, res) => {
  const [rawSummary, certifications, employment] = await Promise.all([
    fetchOrMock(`${API_URL}/analytics/summary`, mockData.summary),
    fetchOrMock(`${API_URL}/analytics/certifications`, mockData.certifications),
    fetchOrMock(`${API_URL}/analytics/employment`, mockData.employment),
  ]);

  // Merge API summary with defaults so optional fields are always present
  const summary = { ...mockData.summary, ...rawSummary };

  res.render("dashboard", {
    user: req.session.user,
    summary,
    certifications,
    employment,
    error: null,
  });
};

// ── GRAPHS ────────────────────────────────────────────────

// GET /graphs — fetch charts data from API, fall back to mock if unavailable
// Accepts optional query params: ?programme=BSc+Computer+Science&year=2022
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
    fetchOrMock(buildUrl(`${API_URL}/analytics/certifications`), mockData.certifications),
    fetchOrMock(buildUrl(`${API_URL}/analytics/trends`), mockData.trends),
    fetchOrMock(buildUrl(`${API_URL}/analytics/employment`), mockData.employment),
    fetchOrMock(buildUrl(`${API_URL}/analytics/short-courses`), mockData.courses),
    fetchOrMock(buildUrl(`${API_URL}/analytics/geographic`), mockData.geographic),
  ]);

  res.render("graphs", {
    user: req.session.user,
    certifications,
    trends,
    employment,
    courses,
    geographic,
    filters: { programme, year },
    error: null,
  });
};

// ── ALUMNI ────────────────────────────────────────────────

// GET /alumni — fetch alumni list from API, fall back to empty array
const getAlumni = async (req, res) => {
  const alumni = await fetchOrMock(`${API_URL}/analytics/alumni`, mockData.alumni);

  res.render("alumni", {
    user: req.session.user,
    alumni,
    error: null,
  });
};

// ── EXPORT ────────────────────────────────────────────────

// GET /export/csv — stream alumni data as a CSV file download
const exportCSV = async (_req, res) => {
  const alumni = await fetchOrMock(`${API_URL}/analytics/alumni`, mockData.alumni);

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

// GET /export/pdf — render a print-friendly alumni table
const exportPDF = async (_req, res) => {
  const alumni = await fetchOrMock(`${API_URL}/analytics/alumni`, mockData.alumni);

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
    return res.render("register", {
      error: "All fields are required.",
      csrfToken: generateCsrfToken(req),
    });
  }

  const htmlPattern = /<[^>]*>/;
  if (htmlPattern.test(cleanUsername) || htmlPattern.test(cleanEmail)) {
    return res.render("register", {
      error: "Invalid characters in input.",
      csrfToken: generateCsrfToken(req),
    });
  }

  if (!cleanEmail.endsWith(".ac.uk")) {
    return res.render("register", {
      error: "Registration requires a university email address (.ac.uk).",
      csrfToken: generateCsrfToken(req),
    });
  }

  if (cleanPassword.length < 8) {
    return res.render("register", {
      error: "Password must be at least 8 characters.",
      csrfToken: generateCsrfToken(req),
    });
  }

  if (users.has(cleanUsername)) {
    return res.render("register", {
      error: "Username already taken.",
      csrfToken: generateCsrfToken(req),
    });
  }

  const verifyToken = crypto.randomBytes(3).toString("hex").toUpperCase();
  const passwordHash = await bcrypt.hash(cleanPassword, SALT_ROUNDS);

  users.set(cleanUsername, {
    username: cleanUsername,
    email: cleanEmail,
    passwordHash,
    verified: false,
    verifyToken,
    resetToken: null,
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
  res.render("verify-email", {
    error: null,
    token: user.verifyToken,
    csrfToken: generateCsrfToken(req),
  });
};

// POST /verify-email — compare submitted token against stored token
const postVerifyEmail = (req, res) => {
  const { token, _csrf } = req.body;
  const username = req.session.pendingUser;

  if (!_csrf || _csrf !== req.session.csrfToken) {
    return res.status(403).redirect("/verify-email");
  }
  req.session.csrfToken = null;

  if (!username || !users.has(username)) return res.redirect("/login");

  const user = users.get(username);

  if (!token || token.trim().toUpperCase() !== user.verifyToken) {
    return res.render("verify-email", {
      error: "Invalid verification code. Please try again.",
      token: user.verifyToken,
      csrfToken: generateCsrfToken(req),
    });
  }

  user.verified = true;
  user.verifyToken = null;
  delete req.session.pendingUser;
  req.session.user = { username };
  res.redirect("/");
};

// ── RESET PASSWORD ────────────────────────────────────────

// GET /reset-password
const getResetPassword = (req, res) => {
  res.render("reset-password", {
    error: null,
    success: null,
    stage: "request",
    csrfToken: generateCsrfToken(req),
  });
};

// POST /reset-password — two stages: request token, then set new password
const postResetPassword = async (req, res) => {
  const { stage, email, token, password, _csrf } = req.body;

  if (!_csrf || _csrf !== req.session.csrfToken) {
    return res.status(403).redirect("/reset-password");
  }
  req.session.csrfToken = null;

  if (stage === "request") {
    const user = Array.from(users.values()).find((u) => u.email === (email || "").trim());

    // Always show the token stage — avoids email enumeration
    const resetToken = user ? crypto.randomBytes(3).toString("hex").toUpperCase() : null;
    if (user && resetToken) {
      user.resetToken = resetToken;
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
    const resetEmail = req.session.resetEmail;
    const user = Array.from(users.values()).find((u) => u.email === resetEmail);

    if (!user || !token || token.trim().toUpperCase() !== user.resetToken) {
      return res.render("reset-password", {
        error: "Invalid reset code.",
        success: null,
        stage: "confirm",
        resetToken: null,
        csrfToken: generateCsrfToken(req),
      });
    }

    const cleanPassword = (password || "").trim();
    if (cleanPassword.length < 8) {
      return res.render("reset-password", {
        error: "Password must be at least 8 characters.",
        success: null,
        stage: "confirm",
        resetToken: null,
        csrfToken: generateCsrfToken(req),
      });
    }

    user.passwordHash = await bcrypt.hash(cleanPassword, SALT_ROUNDS);
    user.resetToken = null;
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

const axios = require("axios");
const crypto = require("crypto");

// Returns an error string if the password fails complexity rules, otherwise null
const validatePassword = (password) => {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(password))
    return "Password must contain at least one uppercase letter.";
  if (!/[0-9]/.test(password))
    return "Password must contain at least one number.";
  if (!/[^A-Za-z0-9]/.test(password))
    return "Password must contain at least one special character.";
  return null;
};

// Base URLs for the CW1 backend and API key for analytics
const API_URL = process.env.CW1_API_URL || "http://localhost:3000";
const API_KEY = process.env.ANALYTICS_API_KEY || "";

// Fetches data from the CW1 analytics API — returns null on failure
const fetchFromAPI = async (url) => {
  try {
    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${API_KEY}` },
      timeout: 3000,
    });
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

// POST /login — validate input, verify CSRF, call CW1 API
const postLogin = async (req, res) => {
  const { email, password, _csrf } = req.body;

  if (!_csrf || _csrf !== req.session.csrfToken) {
    return res.status(403).render("login", {
      error: "Invalid request. Please try again.",
      csrfToken: generateCsrfToken(req),
    });
  }
  req.session.csrfToken = null;

  const cleanEmail = (email || "").trim();
  const cleanPassword = (password || "").trim();

  if (!cleanEmail || !cleanPassword) {
    return res.render("login", {
      error: "Email and password are required.",
      csrfToken: generateCsrfToken(req),
    });
  }

  const htmlPattern = /<[^>]*>/;
  if (htmlPattern.test(cleanEmail) || htmlPattern.test(cleanPassword)) {
    return res.render("login", {
      error: "Invalid characters in input.",
      csrfToken: generateCsrfToken(req),
    });
  }

  try {
    const response = await axios.post(
      `${API_URL}/auth/login`,
      { email: cleanEmail, password: cleanPassword },
      { timeout: 3000 },
    );

    if (response.data.token) {
      req.session.user = { email: cleanEmail, token: response.data.token };
      return res.redirect("/");
    }
  } catch (error) {
    return res.render("login", {
      error: error.response?.data?.error || "Invalid email or password.",
      csrfToken: generateCsrfToken(req),
    });
  }

  res.render("login", {
    error: "Login failed. Please try again.",
    csrfToken: generateCsrfToken(req),
  });
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

  const error =
    !summary && !certifications
      ? "Could not connect to the API. Check CW1 is running."
      : null;

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

  const [certifications, trends, employment, courses, geographic] =
    await Promise.all([
      fetchFromAPI(buildUrl(`${API_URL}/analytics/certifications`)),
      fetchFromAPI(buildUrl(`${API_URL}/analytics/trends`)),
      fetchFromAPI(buildUrl(`${API_URL}/analytics/employment`)),
      fetchFromAPI(buildUrl(`${API_URL}/analytics/short-courses`)),
      fetchFromAPI(buildUrl(`${API_URL}/analytics/geographic`)),
    ]);

  const error =
    !certifications && !trends
      ? "Could not connect to the API. Check CW1 is running."
      : null;

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
    error: !alumni
      ? "Could not connect to the API. Check CW1 is running."
      : null,
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
    [
      a.full_name,
      a.email,
      a.degree_name,
      a.year_completed,
      a.company_name,
      a.job_title,
      a.industry,
    ]
      .map((v) => `"${(v || "").toString().replace(/"/g, '""')}"`)
      .join(","),
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

// POST /register — validate input, call CW1 API, redirect to email verification
const postRegister = async (req, res) => {
  const { email, password, _csrf } = req.body;

  if (!_csrf || _csrf !== req.session.csrfToken) {
    return res.status(403).render("register", {
      error: "Invalid request. Please try again.",
      csrfToken: generateCsrfToken(req),
    });
  }
  req.session.csrfToken = null;

  const cleanEmail = (email || "").trim();
  const cleanPassword = (password || "").trim();

  if (!cleanEmail || !cleanPassword) {
    return res.render("register", {
      error: "All fields are required.",
      csrfToken: generateCsrfToken(req),
    });
  }

  const htmlPattern = /<[^>]*>/;
  if (htmlPattern.test(cleanEmail)) {
    return res.render("register", {
      error: "Invalid characters in input.",
      csrfToken: generateCsrfToken(req),
    });
  }

  const passwordError = validatePassword(cleanPassword);
  if (passwordError) {
    return res.render("register", {
      error: passwordError,
      csrfToken: generateCsrfToken(req),
    });
  }

  try {
    const response = await axios.post(
      `${API_URL}/auth/register`,
      { email: cleanEmail, password: cleanPassword },
      { timeout: 3000 },
    );

    if (response.data.verification_token) {
      req.session.pendingUser = cleanEmail;
      req.session.verificationToken = response.data.verification_token;
      return res.redirect("/verify-email");
    }
  } catch (error) {
    return res.render("register", {
      error:
        error.response?.data?.error || "Registration failed. Please try again.",
      csrfToken: generateCsrfToken(req),
    });
  }

  res.render("register", {
    error: "Registration failed. Please try again.",
    csrfToken: generateCsrfToken(req),
  });
};

// ── VERIFY EMAIL ──────────────────────────────────────────

// GET /verify-email
const getVerifyEmail = (req, res) => {
  const email = req.session.pendingUser;
  if (!email) return res.redirect("/register");
  res.render("verify-email", {
    error: null,
    success: null,
    token: null,
    csrfToken: generateCsrfToken(req),
  });
};

// POST /verify-email — call CW1 API to verify token
const postVerifyEmail = async (req, res) => {
  const { _csrf } = req.body;
  const email = req.session.pendingUser;

  if (!_csrf || _csrf !== req.session.csrfToken)
    return res.status(403).redirect("/verify-email");
  req.session.csrfToken = null;

  if (!email) return res.redirect("/register");

  const cleanToken = (req.session.verificationToken || "").trim();

  try {
    const response = await axios.post(
      `${API_URL}/auth/verify-email`,
      { token: cleanToken },
      { timeout: 3000 },
    );

    if (response.data.message) {
      delete req.session.pendingUser;
      delete req.session.verificationToken;
      return res.render("verify-email", {
        error: null,
        success: "Email verified! You can now log in.",
        token: null,
        csrfToken: generateCsrfToken(req),
      });
    }
  } catch (error) {
    return res.render("verify-email", {
      error:
        error.response?.data?.error || "Verification failed. Please try again.",
      success: null,
      token: null,
      csrfToken: generateCsrfToken(req),
    });
  }

  res.render("verify-email", {
    error: "Verification failed. Please try again.",
    success: null,
    token: null,
    csrfToken: generateCsrfToken(req),
  });
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

// POST /reset-password — stage 1: request reset; stage 2: confirm with token and set new password
const postResetPassword = async (req, res) => {
  const { stage, email, token, password, _csrf } = req.body;

  if (!_csrf || _csrf !== req.session.csrfToken)
    return res.status(403).redirect("/reset-password");
  req.session.csrfToken = null;

  if (stage === "request") {
    const cleanEmail = (email || "").trim();

    try {
      const response = await axios.post(
        `${API_URL}/auth/request-password-reset`,
        { email: cleanEmail },
        { timeout: 3000 },
      );

      req.session.resetEmail = cleanEmail;
      req.session.resetToken = response.data.reset_token;
      return res.render("reset-password", {
        error: null,
        success: "If that email is registered, a reset code has been sent.",
        stage: "confirm",
        csrfToken: generateCsrfToken(req),
      });
    } catch (error) {
      return res.render("reset-password", {
        error:
          error.response?.data?.error || "Request failed. Please try again.",
        success: null,
        stage: "request",
        csrfToken: generateCsrfToken(req),
      });
    }
  }

  if (stage === "confirm") {
    const cleanToken = (req.session.resetToken || "").trim();
    const cleanPassword = (password || "").trim();

    const passwordError = validatePassword(cleanPassword);
    if (passwordError) {
      return res.render("reset-password", {
        error: passwordError,
        success: null,
        stage: "confirm",
        csrfToken: generateCsrfToken(req),
      });
    }

    try {
      const response = await axios.put(
        `${API_URL}/auth/reset-password`,
        { token: cleanToken, password: cleanPassword },
        { timeout: 3000 },
      );

      delete req.session.resetEmail;
      delete req.session.resetToken;
      return res.render("reset-password", {
        error: null,
        success: "Password reset successfully. You can now log in.",
        stage: "done",
        csrfToken: generateCsrfToken(req),
      });
    } catch (error) {
      return res.render("reset-password", {
        error: error.response?.data?.error || "Reset failed. Please try again.",
        success: null,
        stage: "confirm",
        csrfToken: generateCsrfToken(req),
      });
    }
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

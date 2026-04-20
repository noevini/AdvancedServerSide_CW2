const axios = require("axios");

// Base URL and API key for the CW1 backend
const API_URL = process.env.CW1_API_URL || "http://localhost:3000";
const API_KEY = process.env.ANALYTICS_API_KEY || "";

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
    totalAlumni: 0,
    totalCertifications: 0,
    employmentRate: 0,
  },
  certifications: { labels: [], values: [] },
  trends: { labels: [], datasets: [] },
  employment: {
    industries: { labels: [], values: [] },
    jobTitles: { labels: [], values: [] },
    employers: { labels: [], values: [] },
  },
  courses: { labels: [], values: [] },
};

// ── LOGIN ─────────────────────────────────────────────────

// GET /login — render the login form
const getLogin = (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect("/");
  }
  res.render("login", { error: null });
};

// POST /login — validate credentials and create session

const postLogin = (req, res) => {
  const { username, password } = req.body;

  const validUsername = process.env.DASHBOARD_USERNAME || "admin";
  const validPassword = process.env.DASHBOARD_PASSWORD || "admin123";

  if (username === validUsername && password === validPassword) {
    // Store user in session to mark as authenticated
    req.session.user = { username };
    return res.redirect("/");
  }

  res.render("login", { error: "Invalid username or password" });
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
  const [summary, certifications, employment] = await Promise.all([
    fetchOrMock(`${API_URL}/analytics/summary`, mockData.summary),
    fetchOrMock(`${API_URL}/analytics/certifications`, mockData.certifications),
    fetchOrMock(`${API_URL}/analytics/employment`, mockData.employment),
  ]);

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
const getGraphs = async (req, res) => {
  const [certifications, trends, employment, courses] = await Promise.all([
    fetchOrMock(`${API_URL}/analytics/certifications`, mockData.certifications),
    fetchOrMock(`${API_URL}/analytics/trends`, mockData.trends),
    fetchOrMock(`${API_URL}/analytics/employment`, mockData.employment),
    fetchOrMock(`${API_URL}/analytics/short-courses`, mockData.courses),
  ]);

  res.render("graphs", {
    user: req.session.user,
    certifications,
    trends,
    employment,
    courses,
    error: null,
  });
};

// ── ALUMNI ────────────────────────────────────────────────

// GET /alumni — fetch alumni list from API, fall back to empty array
const getAlumni = async (req, res) => {
  const alumni = await fetchOrMock(`${API_URL}/analytics/alumni`, []);

  res.render("alumni", {
    user: req.session.user,
    alumni,
    error: null,
  });
};

module.exports = {
  getLogin,
  postLogin,
  logout,
  getDashboard,
  getGraphs,
  getAlumni,
};

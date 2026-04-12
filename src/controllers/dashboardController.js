const axios = require("axios");

// Base URL and API key for the CW1 backend
const API_URL = process.env.CW1_API_URL || "http://localhost:3000";
const API_KEY = process.env.ANALYTICS_API_KEY || "";

// Helper — builds axios headers with the bearer token
// Every request to CW1 must carry this token
const apiHeaders = () => ({
  Authorization: `Bearer ${API_KEY}`,
});

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

// GET / — fetch summary stats from CW1 and render dashboard
const getDashboard = async (req, res) => {
  try {
    const [profilesRes, certificationsRes, employmentRes] = await Promise.all([
      axios.get(`${API_URL}/analytics/summary`, { headers: apiHeaders() }),
      axios.get(`${API_URL}/analytics/certifications`, {
        headers: apiHeaders(),
      }),
      axios.get(`${API_URL}/analytics/employment`, { headers: apiHeaders() }),
    ]);

    res.render("dashboard", {
      user: req.session.user,
      summary: profilesRes.data,
      certifications: certificationsRes.data,
      employment: employmentRes.data,
      error: null,
    });
  } catch (err) {
    console.error("Dashboard fetch error:", err.message);
    res.render("dashboard", {
      user: req.session.user,
      summary: null,
      certifications: null,
      employment: null,
      error: "Could not load data from API. Is the CW1 server running?",
    });
  }
};

// ── GRAPHS ────────────────────────────────────────────────

// GET /graphs — fetch all analytics data needed for all charts
const getGraphs = async (req, res) => {
  try {
    const [certificationsRes, trendsRes, employmentRes, coursesRes] =
      await Promise.all([
        axios.get(`${API_URL}/analytics/certifications`, {
          headers: apiHeaders(),
        }),
        axios.get(`${API_URL}/analytics/trends`, { headers: apiHeaders() }),
        axios.get(`${API_URL}/analytics/employment`, { headers: apiHeaders() }),
        axios.get(`${API_URL}/analytics/short-courses`, {
          headers: apiHeaders(),
        }),
      ]);

    res.render("graphs", {
      user: req.session.user,
      certifications: certificationsRes.data,
      trends: trendsRes.data,
      employment: employmentRes.data,
      courses: coursesRes.data,
      error: null,
    });
  } catch (err) {
    console.error("Graphs fetch error:", err.message);
    res.render("graphs", {
      user: req.session.user,
      certifications: null,
      trends: null,
      employment: null,
      courses: null,
      error: "Could not load data from API. Is the CW1 server running?",
    });
  }
};

// ── ALUMNI ────────────────────────────────────────────────

// GET /alumni — fetch alumni list for the filterable table
const getAlumni = async (req, res) => {
  try {
    const response = await axios.get(`${API_URL}/analytics/alumni`, {
      headers: apiHeaders(),
    });

    res.render("alumni", {
      user: req.session.user,
      alumni: response.data,
      error: null,
    });
  } catch (err) {
    console.error("Alumni fetch error:", err.message);
    res.render("alumni", {
      user: req.session.user,
      alumni: [],
      error: "Could not load alumni data from API.",
    });
  }
};

module.exports = {
  getLogin,
  postLogin,
  logout,
  getDashboard,
  getGraphs,
  getAlumni,
};

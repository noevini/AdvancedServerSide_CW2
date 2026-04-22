const axios = require("axios");
const crypto = require("crypto");

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
    { full_name: "Alice Johnson", email: "alice@example.com", degree_name: "BSc Computer Science", year_completed: 2021, company_name: "Google", job_title: "Software Engineer" },
    { full_name: "Ben Carter", email: "ben@example.com", degree_name: "BSc Data Science", year_completed: 2020, company_name: "Amazon", job_title: "Data Analyst" },
    { full_name: "Clara Smith", email: "clara@example.com", degree_name: "BSc Cybersecurity", year_completed: 2022, company_name: "Microsoft", job_title: "Security Analyst" },
    { full_name: "David Lee", email: "david@example.com", degree_name: "BSc Software Engineering", year_completed: 2021, company_name: "Accenture", job_title: "DevOps Engineer" },
    { full_name: "Emma Brown", email: "emma@example.com", degree_name: "BSc AI", year_completed: 2023, company_name: "IBM", job_title: "ML Engineer" },
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
const postLogin = (req, res) => {
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

  const validUsername = process.env.DASHBOARD_USERNAME || "admin";
  const validPassword = process.env.DASHBOARD_PASSWORD || "admin123";

  if (cleanUsername === validUsername && cleanPassword === validPassword) {
    req.session.user = { username: cleanUsername };
    return res.redirect("/");
  }

  res.render("login", {
    error: "Invalid username or password.",
    csrfToken: generateCsrfToken(req),
  });
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
  const [certifications, trends, employment, courses, geographic] = await Promise.all([
    fetchOrMock(`${API_URL}/analytics/certifications`, mockData.certifications),
    fetchOrMock(`${API_URL}/analytics/trends`, mockData.trends),
    fetchOrMock(`${API_URL}/analytics/employment`, mockData.employment),
    fetchOrMock(`${API_URL}/analytics/short-courses`, mockData.courses),
    fetchOrMock(`${API_URL}/analytics/geographic`, mockData.geographic),
  ]);

  res.render("graphs", {
    user: req.session.user,
    certifications,
    trends,
    employment,
    courses,
    geographic,
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

  const header = "Name,Email,Degree,Year,Employer,Job Title\n";
  const rows = alumni.map((a) =>
    [a.full_name, a.email, a.degree_name, a.year_completed, a.company_name, a.job_title]
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

module.exports = {
  getLogin,
  postLogin,
  logout,
  getDashboard,
  getGraphs,
  getAlumni,
  exportCSV,
  exportPDF,
};

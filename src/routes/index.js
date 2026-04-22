const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");

// Auth guard middleware — redirects to /login if no active session
const requireAuth = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect("/login");
};

// Public routes (no auth required)
router.get("/login", dashboardController.getLogin);
router.post("/login", dashboardController.postLogin);
router.get("/logout", dashboardController.logout);
router.get("/register", dashboardController.getRegister);
router.post("/register", dashboardController.postRegister);
router.get("/verify-email", dashboardController.getVerifyEmail);
router.post("/verify-email", dashboardController.postVerifyEmail);
router.get("/reset-password", dashboardController.getResetPassword);
router.post("/reset-password", dashboardController.postResetPassword);

// Protected routes (auth required)
router.get("/", requireAuth, dashboardController.getDashboard);
router.get("/graphs", requireAuth, dashboardController.getGraphs);
router.get("/alumni", requireAuth, dashboardController.getAlumni);
router.get("/export/csv", requireAuth, dashboardController.exportCSV);
router.get("/export/pdf", requireAuth, dashboardController.exportPDF);

module.exports = router;

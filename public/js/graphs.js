// Graphs page — renders all Chart.js charts using data from the API
// All data variables are passed from the EJS template

// ── Bar Chart — Top 10 Certifications ─────────────────────
const certCtx = document.getElementById("certificationsChart");

new Chart(certCtx, {
  type: "bar",
  data: {
    labels: certData.labels,
    datasets: [
      {
        label: "% of Alumni Acquiring Post-Graduation",
        data: certData.values,
        backgroundColor: function (context) {
          const value = context.parsed.y;
          if (value > 70) return "#EF4444"; // Critical — red
          if (value > 50) return "#F59E0B"; // Significant — amber
          if (value > 30) return "#F97316"; // Emerging — orange
          return "#6B7280"; // Monitor — grey
        },
        borderWidth: 0,
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: true,
  },
});

// ── Line Chart — Emerging Technology Trends ────────────────
const trendsCtx = document.getElementById("trendsChart");

new Chart(trendsCtx, {
  type: "line",
  data: {
    labels: trendsData.labels,
    datasets: trendsData.datasets,
  },
  options: {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { position: "top" },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function (value) {
            return value + "%";
          },
        },
      },
    },
  },
});

// ── Pie Chart — Employment by Industry Sector ──────────────
const indCtx = document.getElementById("industryChart");

new Chart(indCtx, {
  type: "pie",
  data: {
    labels: employmentData.industries.labels,
    datasets: [
      {
        data: employmentData.industries.values,
        borderWidth: 1,
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { position: "right" },
    },
  },
});

// ── Doughnut Chart — Most Common Job Titles ────────────────
const jobCtx = document.getElementById("jobTitlesChart");

new Chart(jobCtx, {
  type: "doughnut",
  data: {
    labels: employmentData.jobTitles.labels,
    datasets: [
      {
        data: employmentData.jobTitles.values,
        borderWidth: 1,
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { position: "right" },
    },
  },
});

// ── Horizontal Bar Chart — Top Employers ───────────────────
const empCtx = document.getElementById("employersChart");

new Chart(empCtx, {
  type: "bar",
  data: {
    labels: employmentData.employers.labels,
    datasets: [
      {
        label: "Number of Alumni",
        data: employmentData.employers.values,
        backgroundColor: "#3B82F6",
        borderWidth: 0,
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: true,
    indexAxis: "y", // makes it horizontal
  },
});

// ── Radar Chart — Short Course Categories ─────────────────
const coursesCtx = document.getElementById("coursesChart");

new Chart(coursesCtx, {
  type: "radar",
  data: {
    labels: coursesData.labels,
    datasets: [
      {
        label: "Number of Alumni",
        data: coursesData.values,
        backgroundColor: "rgba(59, 130, 246, 0.2)",
        borderColor: "#3B82F6",
        borderWidth: 2,
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: true,
  },
});

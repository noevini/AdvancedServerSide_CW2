// Graphs page — renders all Chart.js charts using data from the API
// All data variables are passed from the EJS template

const chartColors = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
  "#06B6D4", "#F97316", "#EC4899", "#6B7280",
];

// ── Bar Chart — Top 10 Certifications ─────────────────────
if (certData.labels.length) {
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
}

// ── Line Chart — Emerging Technology Trends ────────────────
if (trendsData.labels.length) {
  const trendsCtx = document.getElementById("trendsChart");

  new Chart(trendsCtx, {
    type: "line",
    data: {
      labels: trendsData.labels,
      datasets: trendsData.datasets.map((d) => ({
        ...d,
        tension: 0.4,
        fill: true,
        borderWidth: 3,
      })),
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
        },
      },
    },
  });
}

// ── Pie Chart — Employment by Industry Sector ──────────────
if (employmentData.industries.labels.length) {
  const indCtx = document.getElementById("industryChart");

  new Chart(indCtx, {
    type: "pie",
    data: {
      labels: employmentData.industries.labels,
      datasets: [
        {
          data: employmentData.industries.values,
          backgroundColor: chartColors,
          borderWidth: 3,
          borderColor: "#fff",
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
}

// ── Doughnut Chart — Most Common Job Titles ────────────────
if (employmentData.jobTitles.labels.length) {
  const jobCtx = document.getElementById("jobTitlesChart");

  new Chart(jobCtx, {
    type: "doughnut",
    data: {
      labels: employmentData.jobTitles.labels,
      datasets: [
        {
          data: employmentData.jobTitles.values,
          backgroundColor: chartColors,
          borderWidth: 3,
          borderColor: "#fff",
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
}

// ── Horizontal Bar Chart — Top Employers ───────────────────
if (employmentData.employers.labels.length) {
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
          borderColor: "#2563EB",
          borderWidth: 1,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Number of Alumni",
          },
        },
      },
    },
  });
}

// ── Radar Chart — Geographic Distribution ─────────────────
if (geoData.labels.length) {
  const geoCtx = document.getElementById("geographicChart");

  new Chart(geoCtx, {
    type: "radar",
    data: {
      labels: geoData.labels,
      datasets: [
        {
          label: "Number of Alumni",
          data: geoData.values,
          backgroundColor: "rgba(59, 130, 246, 0.2)",
          borderColor: "#3B82F6",
          borderWidth: 2,
          pointBackgroundColor: "#3B82F6",
          pointBorderColor: "#fff",
          pointRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
      },
      scales: {
        r: {
          beginAtZero: true,
        },
      },
    },
  });
}

// ── Radar Chart — Short Course Categories ─────────────────
if (coursesData.labels.length) {
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
          pointBackgroundColor: "#3B82F6",
          pointBorderColor: "#fff",
          pointRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
      },
      scales: {
        r: {
          beginAtZero: true,
        },
      },
    },
  });
}

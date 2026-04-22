// Dashboard page — renders the certifications bar chart
// certData is passed from the EJS template

const certCtx = document.getElementById("certificationsChart");

if (certData && certData.labels && certData.labels.length && certCtx) {
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
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function (context) {
              return context.parsed.y + "% of alumni";
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: function (value) {
              return value + "%";
            },
          },
        },
      },
    },
  });
}

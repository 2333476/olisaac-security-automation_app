const securityCharts = {};

function updateSecurityStatus(windowTotal) {
  const statusSpan = document.getElementById("securityStatus");
  const controlCard = document.querySelector(".security-control-card");

  if (!statusSpan || !controlCard) {
    return;
  }

  statusSpan.classList.remove("status-low", "status-medium", "status-high");
  controlCard.classList.remove("card-low", "card-medium", "card-high");

  let text = "SAFE";

  if (windowTotal == null || windowTotal === 0) {
    statusSpan.classList.add("status-low");
    controlCard.classList.add("card-low");
    text = "SAFE";
  } else if (windowTotal < 20) {
    statusSpan.classList.add("status-medium");
    controlCard.classList.add("card-medium");
    text = "MODERATE";
  } else {
    statusSpan.classList.add("status-high");
    controlCard.classList.add("card-high");
    text = "ALERT";
  }

  statusSpan.textContent = text;
}

function createSecurityChart(canvasId, apiUrl, yMin, yMax, yStep, currentSpanId) {
  fetch(apiUrl)
    .then(r => r.json())
    .then(data => {
      const canvas = document.getElementById(canvasId);
      if (!canvas) {
        console.error("Canvas not found:", canvasId);
        return;
      }

      const ctx = canvas.getContext("2d");

      if (securityCharts[canvasId]) {
        securityCharts[canvasId].destroy();
      }

      securityCharts[canvasId] = new Chart(ctx, {
        type: "bar",
        data: {
          labels: data.labels,
          datasets: data.datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            title: { display: false }
          },
          scales: {
            x: {
              ticks: {
                maxTicksLimit: 12,
                maxRotation: 45,
                minRotation: 45
              },
              grid: { color: "rgba(200, 200, 200, 0.15)" }
            },
            y: {
              beginAtZero: true,
              suggestedMin: yMin,
              suggestedMax: yMax,
              ticks: { stepSize: yStep },
              grid: { color: "rgba(200, 200, 200, 0.15)" }
            }
          }
        }
      });

      const span = document.getElementById(currentSpanId);
      if (span && data.window_total != null) {
        span.textContent = data.window_total.toFixed(0);
      }

      if (canvasId === "motionChart" && data.window_total != null) {
        updateSecurityStatus(data.window_total);
      }
    })
    .catch(err => {
      console.error("Error loading chart data from", apiUrl, err);
    });
}

document.addEventListener("DOMContentLoaded", function () {
  const dateInput = document.getElementById("security_date_input");

  function buildUrl(sensorName) {
    let url = `/api/chart/${sensorName}`;
    if (dateInput && dateInput.value) {
      url += `?date=${dateInput.value}`;
    }
    return url;
  }

  createSecurityChart(
    "motionChart",
    buildUrl("motion"),
    0,
    30,
    5,
    "motionWindowTotal"
  );

  createSecurityChart(
    "smokeChart",
    buildUrl("smoke"),
    0,
    5,
    1,
    "smokeWindowTotal"
  );

  if (dateInput) {
    dateInput.addEventListener("change", function () {
      createSecurityChart(
        "motionChart",
        buildUrl("motion"),
        0,
        30,
        5,
        "motionWindowTotal"
      );

      createSecurityChart(
        "smokeChart",
        buildUrl("smoke"),
        0,
        5,
        1,
        "smokeWindowTotal"
      );
    });
  }
});

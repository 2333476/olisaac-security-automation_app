const charts = {};

function createLineChart(canvasId, apiUrl, yMin, yMax, yStep, currentData) {
  fetch(apiUrl)
    .then(r => r.json())
    .then(data => {

      const canvas = document.getElementById(canvasId);
      if (!canvas) {
        console.error("Canvas not found:", canvasId);
        return;
      }

      const ctx = canvas.getContext("2d");

      if (charts[canvasId]) {
        charts[canvasId].destroy();
      }

      charts[canvasId] = new Chart(ctx, {
        type: "line",
        data: data,
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
              grid: { color: "rgba(200, 200, 200, 0.2)" }
            },
            y: {
              beginAtZero: false,
              suggestedMin: yMin,
              suggestedMax: yMax,
              ticks: { stepSize: yStep },
              grid: { color: "rgba(200, 200, 200, 0.2)" }
            }
          },
          elements: {
            line: { tension: 0.4 },
            point: { radius: 3 }
          }
        }
      });
      const span = document.getElementById(currentData);
    if (span && data.recent_value != null) {
      span.textContent = data.recent_value.toFixed(1);
    }
    })
    .catch(err => {
      console.error("Error loading chart data from", apiUrl, err);
    });
}



document.addEventListener("DOMContentLoaded", function () {

  createLineChart("tempChart", "/api/chart/temperature", 10, 30, 1, "currentTemp");
  createLineChart("humidityChart", "/api/chart/humidity", 30, 100, 5, "currentHum");
  createLineChart("pressureChart", "/api/chart/pressure", 980, 1050, 5, "currentPres");

  const dateInput = document.getElementById("input_date_id");

  if (dateInput) {
    dateInput.addEventListener("change", function () {

      const selectedDate = dateInput.value;

      const tempUrl = `/api/chart/temperature?date=${selectedDate}`;
      const humUrl = `/api/chart/humidity?date=${selectedDate}`;
      const presUrl = `/api/chart/pressure?date=${selectedDate}`;

      createLineChart("tempChart", tempUrl, 10, 30, 1,"currentTemp");
      createLineChart("humidityChart", humUrl, 30, 100, 5, "currentHum");
      createLineChart("pressureChart", presUrl, 980, 1050, 5, "currentPres");
    });
  }

});

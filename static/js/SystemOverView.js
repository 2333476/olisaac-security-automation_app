function loadSensor(sensorName, valueSpanId, updateSpanId) {
  fetch("/api/sensor/" + sensorName)
    .then(function (response) {
      return response.json();
    })
    .then(function (data) {
      if (!data || data.error) {
        console.error("Error loading sensor", sensorName, data);
        return;
      }

      var valueSpan = document.getElementById(valueSpanId);
      var updateSpan = document.getElementById(updateSpanId);

      if (valueSpan && data.latest_value != null) {
        var num = parseFloat(data.latest_value);
        if (!Number.isNaN(num)) {
          valueSpan.textContent = num.toFixed(1);
        } else {
          valueSpan.textContent = data.latest_value;
        }
      }

      if (updateSpan && data.last_update) {
        updateSpan.textContent = data.last_update;
      }
    })
    .catch(function (err) {
      console.error("Error fetching sensor", sensorName, err);
    });
}

function loadSecurityOverview() {
  fetch("/api/chart/motion")
    .then(function (response) {
      return response.json();
    })
    .then(function (motionData) {
      fetch("/api/chart/smoke")
        .then(function (response) {
          return response.json();
        })
        .then(function (smokeData) {
          if ((!motionData || motionData.error) && (!smokeData || smokeData.error)) {
            console.error("No security data available");
            return;
          }

          var motionTotal = 0;
          if (
            motionData &&
            !motionData.error &&
            typeof motionData.window_total === "number"
          ) {
            motionTotal = motionData.window_total;
          }

          var smokeTotal = 0;
          if (
            smokeData &&
            !smokeData.error &&
            typeof smokeData.window_total === "number"
          ) {
            smokeTotal = smokeData.window_total;
          }

          var lastEventText = "--";
          if (
            motionData &&
            Array.isArray(motionData.labels) &&
            motionData.labels.length > 0
          ) {
            lastEventText = motionData.labels[0];
          } else if (
            smokeData &&
            Array.isArray(smokeData.labels) &&
            smokeData.labels.length > 0
          ) {
            lastEventText = smokeData.labels[0];
          }

          var motionSpan = document.getElementById("sec-motion-count");
          var smokeSpan = document.getElementById("sec-smoke-count");
          var lastSpan = document.getElementById("sec-last-update");
          var pill = document.getElementById("sec-status-pill");
          var icon = document.getElementById("sec-main-icon");

          if (motionSpan) {
            motionSpan.textContent = motionTotal.toFixed(0);
          }
          if (smokeSpan) {
            smokeSpan.textContent = smokeTotal.toFixed(0);
          }
          if (lastSpan) {
            lastSpan.textContent = lastEventText;
          }

          var totalEvents = motionTotal + smokeTotal;
          var level = "safe";
          var labelText = "SAFE";
          var iconFile = "shield_green.svg";

          if (totalEvents > 5 && totalEvents <= 15) {
            level = "moderate";
            labelText = "MODERATE";
            iconFile = "shield_yellow.svg";
          } else if (totalEvents > 15) {
            level = "alert";
            labelText = "ALERT";
            iconFile = "shield_red.svg";
          }

          if (pill) {
            pill.textContent = labelText;
            pill.classList.remove("sec-safe", "sec-moderate", "sec-alert");

            if (level === "safe") {
              pill.classList.add("sec-safe");
            } else if (level === "moderate") {
              pill.classList.add("sec-moderate");
            } else if (level === "alert") {
              pill.classList.add("sec-alert");
            }
          }

          if (icon) {
            icon.src = "/static/images/" + iconFile;
          }
        })
        .catch(function (err) {
          console.error("Error fetching smoke chart", err);
        });
    })
    .catch(function (err) {
      console.error("Error fetching motion chart", err);
    });
}

document.addEventListener("DOMContentLoaded", function () {
  loadSensor("temperature", "temp-value", "temp-update");
  loadSensor("humidity", "humidity-value", "humidity-update");
  loadSensor("pressure", "pressure-value", "pressure-update");
  loadSecurityOverview();
});

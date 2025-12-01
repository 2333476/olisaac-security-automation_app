// static/js/DeviceControl.js

const apiUrl = "/api/device_control";

function setState(stateEl, mode) {
  const cleanMode = mode.toLowerCase();

  if (cleanMode === "on") {
    stateEl.textContent = "ON";
    stateEl.classList.remove("off");
    stateEl.classList.add("on");
  } else {
    stateEl.textContent = "OFF";
    stateEl.classList.remove("on");
    stateEl.classList.add("off");
  }

  const box = stateEl.closest(".box");
  if (box) {
    if (cleanMode === "on") {
      box.classList.remove("off-state");
      box.classList.add("on-state");
    } else {
      box.classList.remove("on-state");
      box.classList.add("off-state");
    }
  }
}

/*
  Ajoute un listener sur un bouton.
  Quand on clique:
  - POST vers le backend
  - si succès => update UI
  - si erreur => on ne change rien
*/
function wireButton(device, mode, buttonSelector, stateId) {
  const button = document.querySelector(buttonSelector);
  if (!button) return;

  button.addEventListener("click", async () => {
    const stateEl = document.getElementById(stateId);
    if (!stateEl) return;

    try {
      const response = await fetch(`${apiUrl}/${device}/${mode}`, {
        method: "POST"
      });

      if (!response.ok) return;

      setState(stateEl, mode);

    } catch (err) {
      return;
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {


  wireButton("green", "on",  'button[name="GREEN_LIGHT_ON"]',  "greenState");
  wireButton("green", "off", 'button[name="GREEN_LIGHT_OFF"]', "greenState");

  wireButton("red", "on",    'button[name="RED_LIGHT_ON"]',    "redState");
  wireButton("red", "off",   'button[name="RED_LIGHT_OFF"]',   "redState");

  wireButton("yellow", "on",  'button[name="YELLOW_LIGHT_ON"]',  "yellowState");
  wireButton("yellow", "off", 'button[name="YELLOW_LIGHT_OFF"]', "yellowState");


  wireButton("buzzer", "on",  'button[name="BUZZER_ON"]',  "buzzerState");
  wireButton("buzzer", "off", 'button[name="BUZZER_OFF"]', "buzzerState");


  wireButton("lcd", "on",  'button[name="LCD_ON"]',  "lcdState");
  wireButton("lcd", "off", 'button[name="LCD_OFF"]', "lcdState");


  const allToggleBtn = document.getElementById("allToggle");
  const allStateEl = document.getElementById("allState"); // hidden

  async function toggleAllLeds() {
    if (!allToggleBtn || !allStateEl) return;

    const current = allStateEl.textContent.trim().toLowerCase();
    const nextMode = (current === "on") ? "off" : "on";

    try {
      const res = await fetch(`${apiUrl}/all/${nextMode}`, {
        method: "POST"
      });

      if (!res.ok) return;

      setState(allStateEl, nextMode);

      if (nextMode === "on") {
        allToggleBtn.textContent = "TURN ALL OFF";
        setState(document.getElementById("greenState"), "on");
        setState(document.getElementById("redState"), "on");
        setState(document.getElementById("yellowState"), "on");
      } else {
        allToggleBtn.textContent = "TURN ALL ON";
        setState(document.getElementById("greenState"), "off");
        setState(document.getElementById("redState"), "off");
        setState(document.getElementById("yellowState"), "off");
      }

    } catch (e) {
      return;
    }
  }

  if (allToggleBtn) {
    allToggleBtn.addEventListener("click", toggleAllLeds);
  }


  async function syncUI() {
    try {
      const res = await fetch(`${apiUrl}/green/on`, { method: "GET" });
      if (!res.ok) return;

      const states = await res.json();

      setState(document.getElementById("greenState"),  states.green);
      setState(document.getElementById("redState"),    states.red);
      setState(document.getElementById("yellowState"), states.yellow);

      setState(document.getElementById("buzzerState"), states.buzzer);
      setState(document.getElementById("lcdState"),    states.lcd);

      if (states.all === "on") {
        setState(allStateEl, "on");
        if (allToggleBtn) allToggleBtn.textContent = "TURN ALL OFF";
      } else {
        setState(allStateEl, "off");
        if (allToggleBtn) allToggleBtn.textContent = "TURN ALL ON";
      }

    } catch (e) {
      return;
    }
  }

  syncUI();
});

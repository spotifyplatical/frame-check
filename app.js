// app.js
// Connects the form inputs to the logic in the other files, and updates
// the live meter + results whenever something changes.

const gpuInput = document.getElementById("gpuInput");
const cpuInput = document.getElementById("cpuInput");
const targetFPSSelect = document.getElementById("targetFPSSelect");
const resolutionInput = document.getElementById("resolutionInput");
const targetFPSInput = document.getElementById("targetFPSInput");
const shaderInput = document.getElementById("shaderInput");
const sodiumInput = document.getElementById("sodiumInput");

const gpuConfidenceEl = document.getElementById("gpuConfidence");
const cpuConfidenceEl = document.getElementById("cpuConfidence");

const estimatedFPSEl = document.getElementById("estimatedFPS");
const targetFPSDisplayEl = document.getElementById("targetFPSDisplay");
const meterFillEl = document.getElementById("meterFill");
const meterTargetLineEl = document.getElementById("meterTargetLine");
const meterMessageEl = document.getElementById("meterMessage");

const vanillaResultsEl = document.getElementById("vanillaResults");
const shaderResultsBlockEl = document.getElementById("shaderResultsBlock");
const shaderAdjustmentsEl = document.getElementById("shaderAdjustments");

// ---- Combobox: typeable input + filterable dropdown list ----
// Matches regardless of capitalization or word order - typing "4060",
// "rtx 4060", or "4060 rtx" all find "RTX 4060".
function matchesQuery(candidate, query) {
  const tokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const target = candidate.toLowerCase();
  return tokens.every((t) => target.includes(t));
}

function setupCombobox(input, toggleBtn, listEl, dataList, onSelect) {
  let activeIndex = -1;

  function renderList(query) {
    const matches = dataList.filter((item) => matchesQuery(item, query));
    listEl.innerHTML = "";
    activeIndex = -1;

    if (matches.length === 0) {
      listEl.hidden = true;
      input.setAttribute("aria-expanded", "false");
      return;
    }

    matches.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      li.setAttribute("role", "option");
      li.addEventListener("mousedown", (e) => {
        // mousedown (not click) so this fires before the input's blur event
        e.preventDefault();
        input.value = item;
        closeList();
        onSelect();
      });
      listEl.appendChild(li);
    });

    listEl.hidden = false;
    input.setAttribute("aria-expanded", "true");
  }

  function closeList() {
    listEl.hidden = true;
    input.setAttribute("aria-expanded", "false");
    activeIndex = -1;
  }

  function setActive(index) {
    const items = listEl.querySelectorAll("li");
    items.forEach((li) => li.classList.remove("active"));
    if (index >= 0 && index < items.length) {
      items[index].classList.add("active");
      items[index].scrollIntoView({ block: "nearest" });
    }
    activeIndex = index;
  }

  input.addEventListener("input", () => renderList(input.value));
  input.addEventListener("focus", () => renderList(input.value));

  toggleBtn.addEventListener("click", () => {
    if (listEl.hidden) {
      input.focus();
      renderList(""); // show the full list, unfiltered
    } else {
      closeList();
    }
  });

  input.addEventListener("keydown", (e) => {
    const items = listEl.querySelectorAll("li");
    if (listEl.hidden || items.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(Math.min(activeIndex + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(Math.max(activeIndex - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      input.value = items[activeIndex].textContent;
      closeList();
      onSelect();
    } else if (e.key === "Escape") {
      closeList();
    }
  });

  input.addEventListener("blur", () => {
    // slight delay so a click on an option registers first
    setTimeout(closeList, 120);
  });
}

// ---- Number count-up animation ----
// Animates the FPS number from its current displayed value to a new one,
// instead of it just snapping - a small thing, but it's the difference
// between the number feeling "reported" vs "reacting" to what you typed.
let currentDisplayedFPS = null;
let fpsAnimationFrame = null;
let previousAchievable = null;

function animateFPSTo(target) {
  const prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) {
    estimatedFPSEl.textContent = target;
    currentDisplayedFPS = target;
    return;
  }

  const start = currentDisplayedFPS ?? target;
  const startTime = performance.now();
  const duration = 500;

  if (fpsAnimationFrame) cancelAnimationFrame(fpsAnimationFrame);

  function tick(now) {
    const elapsed = now - startTime;
    const t = Math.min(1, elapsed / duration);
    // ease-out-expo: fast start, gentle settle - reads as "snappy" not "sluggish"
    const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    const value = Math.round(start + (target - start) * eased);
    estimatedFPSEl.textContent = value;
    if (t < 1) {
      fpsAnimationFrame = requestAnimationFrame(tick);
    } else {
      currentDisplayedFPS = target;
    }
  }
  fpsAnimationFrame = requestAnimationFrame(tick);
}

// ---- Sound: small synthesized tones, no audio files to load ----
// Off by default - sound-by-default is one of the fastest ways to make
// someone close a tab. Preference persists across visits.
let audioCtx = null;
let soundOn = localStorage.getItem("frameCheckSound") === "on";

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(freq, duration, type = "sine", startGain = 0.06) {
  if (!soundOn) return;
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(startGain, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

function playTick() {
  playTone(600, 0.08);
}

function playSuccessChime() {
  playTone(660, 0.12);
  setTimeout(() => playTone(880, 0.18), 90);
}

function setSoundToggleUI(toggleEl) {
  toggleEl.textContent = soundOn ? "🔊" : "🔇";
  toggleEl.setAttribute("aria-label", soundOn ? "Sound on, click to mute" : "Sound off, click to enable");
}


function init() {
  const soundToggleEl = document.getElementById("soundToggle");
  setSoundToggleUI(soundToggleEl);
  soundToggleEl.addEventListener("click", () => {
    soundOn = !soundOn;
    localStorage.setItem("frameCheckSound", soundOn ? "on" : "off");
    setSoundToggleUI(soundToggleEl);
    if (soundOn) playTick(); // immediate feedback that it's actually on now
  });

  const updateWithTick = () => {
    playTick();
    updatePage();
  };

  setupCombobox(gpuInput, document.getElementById("gpuToggle"), document.getElementById("gpuList"), GPU_LIST, updateWithTick);
  setupCombobox(cpuInput, document.getElementById("cpuToggle"), document.getElementById("cpuList"), CPU_LIST, updateWithTick);

  SHADER_PACKS.forEach((pack, index) => {
    const preset = pack.presets[0];
    const option = document.createElement("option");
    option.value = index;
    option.textContent = `${pack.name} (${preset})`;
    shaderInput.appendChild(option);
  });

  targetFPSSelect.addEventListener("change", () => {
    if (targetFPSSelect.value === "custom") {
      targetFPSInput.hidden = false;
      targetFPSInput.focus();
    } else {
      targetFPSInput.hidden = true;
      targetFPSInput.value = targetFPSSelect.value;
    }
    updateWithTick();
  });

  [gpuInput, cpuInput, resolutionInput, targetFPSInput, shaderInput, sodiumInput].forEach((el) => {
    el.addEventListener("input", updatePage);
    el.addEventListener("change", updateWithTick);
  });

  // Show the vanilla settings immediately, before the user types anything
  renderVanillaSettings({ gpuScore: 4.5, cpuScore: 4.5, targetFPS: 60 });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

function updatePage() {
  const gpuName = gpuInput.value.trim();
  const cpuName = cpuInput.value.trim();
  const resolution = resolutionInput.value;
  const targetFPS = parseInt(targetFPSInput.value) || 60;
  const shaderIndex = shaderInput.value;
  const shader = shaderIndex !== "" ? SHADER_PACKS[shaderIndex] : null;

  targetFPSDisplayEl.textContent = `${targetFPS} FPS`;

  // Nothing entered yet - don't guess
  if (!gpuName && !cpuName) {
    estimatedFPSEl.textContent = "—";
    meterFillEl.style.width = "0%";
    meterMessageEl.textContent = "Fill in your specs above to see your estimate.";
    currentDisplayedFPS = null;
    previousAchievable = null;
    return;
  }

  const gpu = scoreGPU(gpuName || "unknown");
  const cpu = scoreCPU(cpuName || "unknown");

  showConfidence(gpuConfidenceEl, gpu, gpuName);
  showConfidence(cpuConfidenceEl, cpu, cpuName);

  const result = getRecommendation({ gpuName: gpuName || "unknown", cpuName: cpuName || "unknown", targetFPS, resolution, shader, sodium: sodiumInput.checked });

  animateFPSTo(result.estimatedFPS);
  estimatedFPSEl.classList.toggle("not-achievable", !result.achievable);

  // Only chime at the actual moment of crossing into "achievable" - not
  // on every render, or it'd play constantly while someone's just typing
  if (result.achievable && previousAchievable === false) {
    playSuccessChime();
  }
  previousAchievable = result.achievable;

  // Meter fill: scale so 200 FPS = full bar (adjust as needed)
  const meterMax = 200;
  const fillPct = Math.min(100, (result.estimatedFPS / meterMax) * 100);
  const targetPct = Math.min(100, (targetFPS / meterMax) * 100);
  meterFillEl.style.width = `${fillPct}%`;
  meterTargetLineEl.style.left = `${targetPct}%`;

  meterMessageEl.textContent = result.message;

  // renderDistance comes from the same calculation as the FPS estimate now,
  // instead of vanilla-settings.js guessing independently
  renderVanillaSettings({ gpuScore: gpu.score, cpuScore: cpu.score, targetFPS, renderDistance: result.renderDistance });
  renderShaderAdjustments(result, shader);
}

function showConfidence(el, scoreResult, rawInput) {
  if (!rawInput) {
    el.textContent = "";
    return;
  }
  if (scoreResult.confidence === "unknown") {
    el.textContent = "Not recognized — using a middle-of-the-road estimate. Try the full model name.";
    el.className = "field-hint unknown";
  } else {
    el.textContent = `Recognized (score ${scoreResult.score}/10)`;
    el.className = "field-hint matched";
  }
}

function renderVanillaSettings(ctx) {
  vanillaResultsEl.innerHTML = "";
  VANILLA_SETTINGS.forEach((setting) => {
    const value = setting.recommend(ctx);
    const item = document.createElement("div");
    item.className = "setting-item";
    item.innerHTML = `
      <div class="setting-label">${setting.label}</div>
      <div class="setting-value">${value}</div>
      <div class="setting-why">${setting.why}</div>
    `;
    vanillaResultsEl.appendChild(item);
  });
}

function renderShaderAdjustments(result, shader) {
  if (!shader) {
    shaderResultsBlockEl.hidden = true;
    return;
  }
  shaderResultsBlockEl.hidden = false;
  shaderAdjustmentsEl.innerHTML = "";

  if (result.adjustments.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No adjustments needed, your target should be met at default settings.";
    shaderAdjustmentsEl.appendChild(li);
    return;
  }

  result.adjustments.forEach((adj) => {
    const li = document.createElement("li");
    li.textContent = adj;
    shaderAdjustmentsEl.appendChild(li);
  });
}



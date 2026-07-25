// recommend.js
// Estimates FPS and works out settings to hit a target.
//
// Calibration note: this formula was tuned against one real reported
// result (RTX 4060 + Ryzen 5 7600, 1440p, Sodium + Lithium, 8 chunks
// render distance, no shader -> ~250 FPS measured; this model predicts
// ~247 FPS for that exact input). One data point isn't a lab, so treat
// the constants below as a reasonable starting model to refine further
// as more real results come in, not a finished, universally-accurate one.
//
// Important invariant: render distance is decided ONCE, from the
// vanilla (no-shader) case only, and never changes based on whether a
// shader is selected. Earlier this ran independently for each case,
// which could land shader and no-shader on different render distances
// and let the shader case come out with a HIGHER estimate than vanilla
// with zero explanation (dropping render distance further can buy back
// more FPS than a shader costs). Keeping one fixed render distance as
// the comparison basis guarantees a shader's estimate can only be lower
// than vanilla's, unless additional adjustments are explicitly listed.

function estimateFPS({ gpuScore, cpuScore, resolution, renderDistance, sodium, shaderCost }) {
  const resMult = { "1080p": 1, "1440p": 0.65, "4K": 0.4 }[resolution] || 1;

  // Render distance is one of the single biggest FPS levers in Minecraft.
  // 12 chunks is the reference point; going lower buys real FPS back.
  const rdFactor = Math.pow(12 / renderDistance, 1.3);

  // Sodium/Lithium/Embeddium-class performance mods meaningfully change
  // the ceiling - most shader users have these anyway since Iris requires
  // Sodium.
  const sodiumGpuMult = sodium ? 1.6 : 1;
  const sodiumCpuMult = sodium ? 1.4 : 1;

  let gpuFPS = (30 + gpuScore * 22) * resMult * rdFactor * sodiumGpuMult;
  let cpuCeiling = (40 + cpuScore * 25) * sodiumCpuMult * Math.pow(rdFactor, 0.5);

  if (shaderCost) {
    const shaderMult = 1 - shaderCost / 14;
    gpuFPS *= shaderMult;
  }

  return Math.max(5, Math.min(gpuFPS, cpuCeiling));
}

function getRecommendation({ gpuName, cpuName, targetFPS, resolution, shader, sodium }) {
  const gpu = scoreGPU(gpuName);
  const cpu = scoreCPU(cpuName);

  // ---- Phase 1: vanilla-only render distance, always computed with
  // shaderCost 0, regardless of whether a shader is selected. This is
  // the single source of truth for "Render Distance" in the vanilla
  // settings section, and it never changes based on the shader dropdown. ----
  let renderDistance =
    gpu.score < 2 ? 8 : gpu.score < 4 ? 10 : gpu.score < 6 ? 16 : gpu.score < 8 ? 24 : 32;

  let vanillaFPS = estimateFPS({ gpuScore: gpu.score, cpuScore: cpu.score, resolution, renderDistance, sodium, shaderCost: 0 });

  const vanillaAdjustments = [];
  const renderSteps = [32, 24, 20, 16, 12, 10, 8, 6];

  for (const step of renderSteps) {
    if (vanillaFPS >= targetFPS) break;
    if (step >= renderDistance) continue;
    renderDistance = step;
    vanillaFPS = estimateFPS({ gpuScore: gpu.score, cpuScore: cpu.score, resolution, renderDistance, sodium, shaderCost: 0 });
    vanillaAdjustments.push(`Lower render distance to ${renderDistance} chunks`);
  }

  if (!shader) {
    return {
      gpuConfidence: gpu.confidence,
      cpuConfidence: cpu.confidence,
      estimatedFPS: Math.round(vanillaFPS),
      targetFPS,
      achievable: vanillaFPS >= targetFPS,
      renderDistance,
      adjustments: vanillaAdjustments,
      message:
        vanillaFPS >= targetFPS
          ? `Target of ${targetFPS} FPS looks achievable${vanillaAdjustments.length ? ", with the adjustments below" : ""}.`
          : `Honest answer: ${targetFPS} FPS isn't realistic on this hardware with these settings. Closest estimate is ~${Math.round(vanillaFPS)} FPS.`,
    };
  }

  // ---- Phase 2: shader estimate, calculated at the SAME render distance
  // as vanilla above. Since shaderCost always multiplies FPS down, this
  // is guaranteed to start at or below the vanilla number - it can never
  // silently come out higher. ----
  let shaderFPS = estimateFPS({ gpuScore: gpu.score, cpuScore: cpu.score, resolution, renderDistance, sodium, shaderCost: shader.cost });

  const adjustments = [];
  if (shaderFPS < targetFPS) {
    const shaderSteps = [
      { label: "Reduce shadow distance/quality", gain: 1.12 },
      { label: "Disable volumetric lighting/clouds", gain: 1.1 },
      { label: "Lower resolution scale to 85%", gain: 1.2 },
    ];
    for (const step of shaderSteps) {
      if (shaderFPS >= targetFPS) break;
      shaderFPS *= step.gain;
      adjustments.push(step.label);
    }
  }

  // Hard invariant: rendering more (a shader) can never be faster than
  // rendering less (vanilla) at the same render distance. The step-based
  // adjustments above can overshoot past this when several stack up -
  // clamp it rather than let that slip through as a confusing result.
  shaderFPS = Math.min(shaderFPS, vanillaFPS);

  const achievable = shaderFPS >= targetFPS;

  return {
    gpuConfidence: gpu.confidence,
    cpuConfidence: cpu.confidence,
    estimatedFPS: Math.round(shaderFPS),
    targetFPS,
    achievable,
    renderDistance,
    adjustments,
    message: achievable
      ? `Target of ${targetFPS} FPS looks achievable${adjustments.length ? ", with the adjustments below" : ""}.`
      : `Honest answer: ${targetFPS} FPS isn't realistic on this hardware with these settings. Closest estimate is ~${Math.round(shaderFPS)} FPS.`,
  };
}

// shader-packs.js
// Shader packs grouped by relative GPU cost (1 = light, 10 = extremely heavy).
// Sourced from current shader guides, cross-checked across multiple sites, July 2026.

const SHADER_PACKS = [
  // LIGHT - runs on low-end/integrated GPUs
  { name: "MakeUp Ultra Fast", cost: 2, presets: ["Default"] },
  { name: "Sildur's Lite", cost: 2, presets: ["Low", "Medium"] },
  { name: "Complementary Unbound", cost: 3, presets: ["Lite"] },

  // MEDIUM - the sweet spot for most players
  { name: "BSL Shaders", cost: 4, presets: ["Vanilla Plus", "Default"] },
  { name: "Complementary Reimagined", cost: 5, presets: ["Balanced"] },
  { name: "Solas Shader", cost: 5, presets: ["Default"] },

  // HEAVY - needs a solid mid-to-high end GPU
  { name: "Complementary Unbound", cost: 7, presets: ["High"] },
  { name: "Sildur's Vibrant", cost: 7, presets: ["High"] },

  // VERY HEAVY / CINEMATIC - high-end GPU required
  { name: "Rethinking Voxels", cost: 9, presets: ["Default"] },
  { name: "Photon", cost: 8.5, presets: ["Default"] },
  { name: "SEUS PTGI", cost: 9.5, presets: ["Default"] },
  { name: "Continuum RT", cost: 10, presets: ["Default (paid, real ray tracing)"] },
];


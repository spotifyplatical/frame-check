// gpu-tiers.js
// Scores a GPU from 0 (weakest) to 10 (strongest) based on its name.
// We DON'T hardcode every GPU ever made - instead we detect the brand,
// series, and tier number from the name itself. This keeps working
// even for GPUs that release after we write this code.
//
// Bug fix note: every family below now looks up its score by the EXACT
// numeric string it captures, rather than trying to derive a tier from
// "first digit + 0". That derivation trick happened to work for NVIDIA
// (whose naming really is a clean 2-digit generation + 2-digit tier),
// but every AMD pattern using it was silently broken and never matched
// a single real RX card - "RX 6600" and "RX 7800 XT" both fell through
// to the generic "unknown" fallback despite being common, listed GPUs.

const GPU_FAMILIES = [
  // NVIDIA RTX 50 series
  { pattern: /rtx\s?50(\d0)/i, baseScore: 6, tierMap: { "90": 10, "80": 9, "70": 7.5, "60": 6, "50": 4.5 } },
  // NVIDIA RTX 40 series
  { pattern: /rtx\s?40(\d0)/i, baseScore: 5, tierMap: { "90": 9.5, "80": 8.3, "70": 6.8, "60": 5, "50": 3.5 } },
  // NVIDIA RTX 30 series
  { pattern: /rtx\s?30(\d0)/i, baseScore: 4, tierMap: { "90": 8, "80": 7, "70": 6, "60": 4.5, "50": 3 } },
  // NVIDIA RTX 20 series
  { pattern: /rtx\s?20(\d0)/i, baseScore: 3, tierMap: { "80": 5.5, "70": 4.5, "60": 3.5, "50": 2.5 } },
  // NVIDIA GTX 16 series
  { pattern: /gtx\s?16(\d0)/i, baseScore: 2.5, tierMap: { "60": 3.5, "50": 2 } },
  // NVIDIA GTX 10 series
  { pattern: /gtx\s?10(\d0)/i, baseScore: 2, tierMap: { "80": 4, "70": 3, "60": 2.5, "50": 1.2 } },
  // NVIDIA GTX 900 series (older, still common)
  { pattern: /gtx\s?9(\d0)\b/i, baseScore: 1.5, tierMap: { "80": 3, "70": 2.2, "60": 1.6 } },
  // NVIDIA GTX 700 series (older, still around on budget/older PCs)
  { pattern: /gtx\s?7(\d0)\b/i, baseScore: 1, tierMap: { "80": 2, "70": 1.5, "60": 1.1, "50": 0.8 } },

  // AMD RX 9000 series (naming is "9070"/"9060" - captures the last two digits)
  { pattern: /rx\s?90(\d{2})/i, baseScore: 5, tierMap: { "70": 8, "60": 6 } },
  // AMD RX 7000 series (naming is "7900"/"7800"/"7700"/"7600" - captures the 3-digit suffix)
  { pattern: /rx\s?7(\d{3})/i, baseScore: 4, tierMap: { "900": 8.5, "800": 7, "700": 6, "600": 4.5 } },
  // AMD RX 6000 series
  { pattern: /rx\s?6(\d{3})/i, baseScore: 3, tierMap: { "950": 7, "900": 7, "800": 6.3, "750": 5.8, "700": 5.5, "650": 4.8, "600": 4, "500": 2.5, "400": 1.8 } },
  // AMD RX 5000 series (modern RDNA1 - 4 digit: 5700/5600/5500/5300)
  { pattern: /rx\s?5(\d{3})/i, baseScore: 2, tierMap: { "700": 4, "600": 3, "500": 2, "300": 1.2 } },
  // AMD RX 400/500 series (older, 3-digit total: 580, 570, 480, 470, etc) -
  // checked after the modern 4-digit patterns above so it can't misfire on them
  { pattern: /rx\s?[45](\d0)\b/i, baseScore: 1.5, tierMap: { "90": 2.2, "80": 2, "70": 1.6, "60": 1.2, "50": 0.9 } },
];

// Intel Arc doesn't follow the "generation digits + tier digits" pattern
// the families above use, so it gets its own explicit list instead of
// forcing it through logic that doesn't fit (that mismatch is what
// crashed the scorer before - the old Arc pattern had no capture group
// at all, so any Arc GPU threw a runtime error the instant it was typed).
const ARC_GPUS = [
  { pattern: /arc\s?b580/i, score: 5.5 },
  { pattern: /arc\s?b570/i, score: 5.2 },
  { pattern: /arc\s?a770/i, score: 4.5 },
  { pattern: /arc\s?a750/i, score: 4.3 },
  { pattern: /arc\s?a580/i, score: 3.2 },
  { pattern: /arc\s?a380/i, score: 2.2 },
];

// Modifiers based on suffixes in the GPU name
const SUFFIX_MODIFIERS = [
  { pattern: /\bti\s?super\b/i, modifier: 0.6 },
  { pattern: /\bsuper\b/i, modifier: 0.4 },
  { pattern: /\bti\b/i, modifier: 0.5 },
  { pattern: /\bxt\b/i, modifier: 0.4 },
];

// Known laptop/integrated GPUs that don't follow desktop naming
const INTEGRATED_GPUS = [
  { pattern: /intel\s?(uhd|iris|hd graphics)/i, score: 0.8 },
  { pattern: /radeon\s?(graphics|vega\s?\d)/i, score: 1.2 }, // AMD APU graphics
  { pattern: /apple\s?m[1-4]/i, score: 4 }, // Apple Silicon, rough estimate
];

// Common GPUs shown in the dropdown suggestion list. Not exhaustive -
// typing something not on this list still works fine via the pattern
// matcher above, and every pattern here has now actually been verified
// to match, not just assumed to.
const GPU_LIST = [
  "RTX 5090", "RTX 5080", "RTX 5070 Ti", "RTX 5070", "RTX 5060 Ti", "RTX 5060", "RTX 5050",
  "RTX 4090", "RTX 4080 Super", "RTX 4080", "RTX 4070 Ti Super", "RTX 4070 Ti", "RTX 4070 Super", "RTX 4070", "RTX 4060 Ti", "RTX 4060", "RTX 4050",
  "RTX 3090 Ti", "RTX 3090", "RTX 3080 Ti", "RTX 3080", "RTX 3070 Ti", "RTX 3070", "RTX 3060 Ti", "RTX 3060", "RTX 3050",
  "RTX 2080 Ti", "RTX 2080 Super", "RTX 2080", "RTX 2070 Super", "RTX 2070", "RTX 2060 Super", "RTX 2060",
  "GTX 1660 Ti", "GTX 1660 Super", "GTX 1660", "GTX 1650 Super", "GTX 1650",
  "GTX 1080 Ti", "GTX 1080", "GTX 1070 Ti", "GTX 1070", "GTX 1060", "GTX 1050 Ti", "GTX 1050",
  "GTX 980 Ti", "GTX 980", "GTX 970", "GTX 960",
  "GTX 780 Ti", "GTX 780", "GTX 770", "GTX 760", "GTX 750 Ti",
  "RX 9070 XT", "RX 9070", "RX 9060 XT",
  "RX 7900 XTX", "RX 7900 XT", "RX 7900 GRE", "RX 7800 XT", "RX 7700 XT", "RX 7600 XT", "RX 7600",
  "RX 6950 XT", "RX 6900 XT", "RX 6800 XT", "RX 6800", "RX 6750 XT", "RX 6700 XT", "RX 6650 XT", "RX 6600 XT", "RX 6600", "RX 6500 XT", "RX 6400",
  "RX 5700 XT", "RX 5700", "RX 5600 XT", "RX 5500 XT",
  "RX 590", "RX 580", "RX 570", "RX 560", "RX 550", "RX 480", "RX 470", "RX 460",
  "Arc B580", "Arc B570", "Arc A770", "Arc A750", "Arc A580", "Arc A380",
  "Apple M4", "Apple M3", "Apple M2", "Apple M1",
  "Intel Iris Xe Graphics", "Intel UHD Graphics", "AMD Radeon Graphics (integrated)",
];

function scoreGPU(gpuName) {
  const name = gpuName.trim();

  // Check integrated/laptop GPUs first
  for (const gpu of INTEGRATED_GPUS) {
    if (gpu.pattern.test(name)) {
      return { score: gpu.score, confidence: "estimated", matched: "integrated graphics" };
    }
  }

  // Intel Arc has its own naming shape, handled with explicit scores
  for (const arc of ARC_GPUS) {
    if (arc.pattern.test(name)) {
      let score = arc.score;
      if (/laptop|mobile/i.test(name)) score *= 0.85;
      return { score: Math.round(score * 10) / 10, confidence: "matched", matched: "intel arc" };
    }
  }

  // Try to match a desktop GPU family. Every family looks up its score by
  // the exact captured numeric string (tierMap[match[1]]) rather than
  // deriving one, so there's no room for the silent AMD mismatch bug to
  // reappear even if a new generation gets added later.
  for (const family of GPU_FAMILIES) {
    const match = name.match(family.pattern);
    if (match) {
      let score = family.tierMap[match[1]] ?? family.baseScore;

      for (const suffix of SUFFIX_MODIFIERS) {
        if (suffix.pattern.test(name)) {
          score += suffix.modifier;
        }
      }

      // Laptop GPUs are typically weaker than their desktop namesake
      if (/laptop|mobile|\bmax-q\b|\bm\b(?!\d)/i.test(name)) {
        score *= 0.75;
      }

      return { score: Math.min(10, Math.round(score * 10) / 10), confidence: "matched", matched: family.pattern.source };
    }
  }

  // Fallback: we don't recognize this GPU at all
  return { score: 4, confidence: "unknown", matched: null };
}

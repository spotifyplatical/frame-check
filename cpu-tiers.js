// cpu-tiers.js
// Scores a CPU from 0-10. Important context: Minecraft Java is heavily
// single-thread bound for world generation and chunk loading, and
// shaders themselves are mostly GPU-bound. So CPU score mainly affects
// how much render/simulation distance headroom you get, not raw FPS
// from the shader itself.

const CPU_FAMILIES = [
  // Intel Core (13th-15th gen, "Core Ultra" naming started gen 14 on some lines)
  { pattern: /core\s?ultra\s?9/i, score: 9 },
  { pattern: /core\s?ultra\s?7/i, score: 7.5 },
  { pattern: /core\s?ultra\s?5/i, score: 6 },
  { pattern: /i9-1[3-5]\d{3}/i, score: 9 },
  { pattern: /i7-1[3-5]\d{3}/i, score: 7.5 },
  { pattern: /i5-1[3-5]\d{3}/i, score: 6 },
  { pattern: /i3-1[3-5]\d{3}/i, score: 4 },
  // Intel Core (10th-12th gen)
  { pattern: /i9-1[0-2]\d{3}/i, score: 7.5 },
  { pattern: /i7-1[0-2]\d{3}/i, score: 6.3 },
  { pattern: /i5-1[0-2]\d{3}/i, score: 5 },
  { pattern: /i3-1[0-2]\d{3}/i, score: 3 },
  // Intel Core (older, 6th-9th gen)
  { pattern: /i9-[6-9]\d{3}/i, score: 6 },
  { pattern: /i7-[6-9]\d{3}/i, score: 4.5 },
  { pattern: /i5-[6-9]\d{3}/i, score: 3.5 },
  { pattern: /i3-[6-9]\d{3}/i, score: 2 },
  // AMD Ryzen 9000 series
  { pattern: /ryzen\s?9\s?9\d{3}/i, score: 9.5 },
  { pattern: /ryzen\s?7\s?9\d{3}/i, score: 8 },
  { pattern: /ryzen\s?5\s?9\d{3}/i, score: 6.5 },
  // AMD Ryzen 7000 series
  { pattern: /ryzen\s?9\s?7\d{3}/i, score: 8.5 },
  { pattern: /ryzen\s?7\s?7\d{3}/i, score: 7 },
  { pattern: /ryzen\s?5\s?7\d{3}/i, score: 5.5 },
  { pattern: /ryzen\s?3\s?7\d{3}/i, score: 3.5 },
  // AMD Ryzen 5000 series
  { pattern: /ryzen\s?9\s?5\d{3}/i, score: 7 },
  { pattern: /ryzen\s?7\s?5\d{3}/i, score: 5.8 },
  { pattern: /ryzen\s?5\s?5\d{3}/i, score: 4.5 },
  { pattern: /ryzen\s?3\s?5\d{3}/i, score: 2.8 },
  // AMD Ryzen 3000 series and older
  { pattern: /ryzen\s?9\s?3\d{3}/i, score: 5.5 },
  { pattern: /ryzen\s?7\s?3\d{3}/i, score: 4.3 },
  { pattern: /ryzen\s?5\s?3\d{3}/i, score: 3.3 },
  { pattern: /ryzen\s?3\s?3\d{3}/i, score: 2 },
  // Apple Silicon (rough single/multi-core blended estimate)
  { pattern: /apple\s?m[4]/i, score: 8 },
  { pattern: /apple\s?m[3]/i, score: 7 },
  { pattern: /apple\s?m[2]/i, score: 6 },
  { pattern: /apple\s?m1/i, score: 5 },
];

// Common CPUs shown in the dropdown suggestion list. Not exhaustive -
// typing something not on this list still works fine via the pattern
// matching scorer above.
const CPU_LIST = [
  "Core Ultra 9 285K", "Core Ultra 7 265K", "Core Ultra 5 245K",
  "Core i9-14900K", "Core i7-14700K", "Core i5-14600K", "Core i5-14400", "Core i3-14100",
  "Core i9-13900K", "Core i7-13700K", "Core i5-13600K", "Core i5-13400", "Core i3-13100",
  "Core i9-12900K", "Core i7-12700K", "Core i5-12600K", "Core i5-12400", "Core i3-12100",
  "Core i9-9900K", "Core i7-9700K", "Core i5-9600K", "Core i5-9400", "Core i3-9100",
  "Ryzen 9 9950X3D", "Ryzen 9 9950X", "Ryzen 9 9900X3D", "Ryzen 9 9900X", "Ryzen 7 9800X3D", "Ryzen 7 9700X", "Ryzen 5 9600X", "Ryzen 5 9600",
  "Ryzen 9 7950X3D", "Ryzen 9 7950X", "Ryzen 9 7900X3D", "Ryzen 9 7900X", "Ryzen 7 7800X3D", "Ryzen 7 7700X", "Ryzen 5 7600X", "Ryzen 5 7600",
  "Ryzen 9 5950X", "Ryzen 9 5900X", "Ryzen 7 5800X3D", "Ryzen 7 5700X", "Ryzen 5 5600X", "Ryzen 5 5600", "Ryzen 3 5300G",
  "Ryzen 9 3900X", "Ryzen 7 3700X", "Ryzen 5 3600", "Ryzen 3 3300X",
  "Apple M4", "Apple M3", "Apple M2", "Apple M1",
];

function scoreCPU(cpuName) {
  const name = cpuName.trim();

  for (const cpu of CPU_FAMILIES) {
    if (cpu.pattern.test(name)) {
      let score = cpu.score;
      if (/laptop|mobile|\bh\b|\bu\b|\bhs\b/i.test(name)) {
        score *= 0.85; // mobile CPUs run cooler/slower than desktop counterparts
      }
      return { score: Math.round(score * 10) / 10, confidence: "matched" };
    }
  }

  // Fallback for unrecognized CPUs - use a safe middle estimate
  return { score: 4.5, confidence: "unknown" };
}


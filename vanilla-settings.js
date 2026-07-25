// vanilla-settings.js
// Vanilla Minecraft video settings, what to recommend, and why it matters.
//
// Render Distance no longer has its own separate guess - it now reads
// ctx.renderDistance, the exact number the FPS-estimate formula in
// recommend.js already worked out. Before this fix, the settings shown
// here and the FPS number in the meter were computed independently and
// could disagree with each other, which was a real bug.

const VANILLA_SETTINGS = [
  {
    id: "renderDistance",
    label: "Render Distance",
    why: "The single biggest FPS lever in vanilla rendering - this number is the same one used to calculate your FPS estimate above, not a separate guess.",
    recommend(ctx) {
      if (ctx.renderDistance) return `${ctx.renderDistance} chunks`;
      const g = ctx.gpuScore;
      if (g < 2) return "6-8 chunks";
      if (g < 4) return "8-10 chunks";
      if (g < 6) return "12-16 chunks";
      if (g < 8) return "16-24 chunks";
      return "24-32 chunks";
    },
  },
  {
    id: "simulationDistance",
    label: "Simulation Distance",
    why: "Governs how many chunks actively tick entities, crops, and redstone. Mostly CPU-bound, not GPU-bound, so it doesn't need to match your render distance.",
    recommend(ctx) {
      const c = ctx.cpuScore;
      if (c < 3) return "5-6 chunks";
      if (c < 5) return "8 chunks";
      if (c < 7) return "10-12 chunks";
      return "12-16 chunks";
    },
  },
  {
    id: "graphicsQuality",
    label: "Graphics (Fast/Fancy/Fabulous)",
    why: "Fabulous adds an entire extra screen-space render pass for transparency effects - it's a bigger cost than the name suggests.",
    recommend(ctx) {
      const g = ctx.gpuScore;
      if (g < 3) return "Fast";
      if (g < 6) return "Fancy";
      return "Fancy (Fabulous only if you have FPS to spare)";
    },
  },
  {
    id: "smoothLighting",
    label: "Smooth Lighting",
    why: "Cheap on most hardware - only worth disabling if you're on genuinely weak integrated graphics.",
    recommend(ctx) {
      return ctx.gpuScore < 2 ? "Off" : "Maximum";
    },
  },
  {
    id: "particles",
    label: "Particles",
    why: "Usually background cost, but explosions, campfires, and potion effects can spawn hundreds at once - a real spike, not just idle overhead.",
    recommend(ctx) {
      const g = ctx.gpuScore;
      if (g < 3) return "Minimal";
      if (g < 6) return "Decreased";
      return "All";
    },
  },
  {
    id: "entityShadows",
    label: "Entity Shadows",
    why: "One extra draw call per visible mob - adds up fast around farms, villages, or crowded builds.",
    recommend(ctx) {
      return ctx.gpuScore < 4 ? "Off" : "On";
    },
  },
  {
    id: "clouds",
    label: "Clouds",
    why: "Purely decorative, no gameplay effect - free FPS to turn down if you don't care about the sky.",
    recommend(ctx) {
      const g = ctx.gpuScore;
      if (g < 2) return "Off";
      if (g < 5) return "Fast";
      return "Fancy";
    },
  },
  {
    id: "biomeBlend",
    label: "Biome Blend",
    why: "Smooths color transitions between biomes - cost scales with the blend radius, rarely worth maxing out.",
    recommend(ctx) {
      return ctx.gpuScore < 3 ? "None (or 3x3)" : "5x5";
    },
  },
  {
    id: "vsync",
    label: "VSync",
    why: "Hard-caps your FPS to your monitor's refresh rate - if your target is above that, VSync will silently stop you from ever hitting it.",
    recommend(ctx) {
      const monitorHz = ctx.monitorHz || 60;
      return ctx.targetFPS > monitorHz ? "Off (VSync would cap you below your target)" : "Optional";
    },
  },
  {
    id: "mipmapLevels",
    label: "Mipmap Levels",
    why: "Texture filtering at a distance - one of the cheapest settings in the whole menu, safe to leave maxed.",
    recommend() {
      return "4";
    },
  },
];

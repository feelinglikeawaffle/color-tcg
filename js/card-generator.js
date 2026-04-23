// ===============================
//  COLOR GENERATOR
// ===============================

export function randomHex() {
  const hex = Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, "0");
  return `#${hex}`;
}

// ===============================
//  HEX → HSL
// ===============================

export function hexToHSL(hex) {
  let r = parseInt(hex.substr(1,2),16) / 255;
  let g = parseInt(hex.substr(3,2),16) / 255;
  let b = parseInt(hex.substr(5,2),16) / 255;

  let max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h, s, l = (max + min) / 2;

  if(max === min){
    h = s = 0;
  } else {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch(max){
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

// ===============================
//  RARITY SYSTEM
// ===============================

export function getRarity(hsl) {
  const { s, l } = hsl;

  if (s >= 85 && l >= 45 && l <= 55) return "Legendary";
  if (s >= 75 && l >= 40 && l <= 60) return "Epic";
  if (s >= 60 && l >= 35 && l <= 65) return "Rare";
  if (s >= 30 && l >= 25 && l <= 75) return "Uncommon";
  return "Common";
}

// ===============================
//  MASSIVE NAME GENERATOR
// ===============================

// Hue → base color family
const hueNames = [
  { min: 0,   max: 15,  name: "Crimson" },
  { min: 15,  max: 45,  name: "Amber" },
  { min: 45,  max: 75,  name: "Gold" },
  { min: 75,  max: 150, name: "Verdant" },
  { min: 150, max: 210, name: "Cyan" },
  { min: 210, max: 260, name: "Azure" },
  { min: 260, max: 290, name: "Violet" },
  { min: 290, max: 330, name: "Magenta" },
  { min: 330, max: 360, name: "Scarlet" }
];

// Rarity → adjective pool
const rarityAdjectives = {
  Common: ["Dull", "Muted", "Soft", "Plain", "Dusty"],
  Uncommon: ["Bright", "Fresh", "Clean", "Pure", "Smooth"],
  Rare: ["Vivid", "Radiant", "Deep", "Bold", "Rich"],
  Epic: ["Luminous", "Prismatic", "Vibrant", "Shimmering", "Brilliant"],
  Legendary: ["Mythic", "Celestial", "Eternal", "Transcendent", "Divine"]
};

// Extra descriptors for uniqueness
const descriptors = [
  "Flare", "Bloom", "Echo", "Pulse", "Shade", "Gleam",
  "Whisper", "Nova", "Drift", "Spirit", "Wave", "Burst",
  "Dream", "Frost", "Flame", "Storm", "Glow", "Dust"
];

// ===============================
//  UNIQUE NAME GENERATOR
// ===============================

export function generateName(hsl, rarity) {
  const hueName = hueNames.find(h => hsl.h >= h.min && hsl.h < h.max).name;

  const adjList = rarityAdjectives[rarity];
  const adj = adjList[Math.floor(Math.random() * adjList.length)];

  const desc = descriptors[Math.floor(Math.random() * descriptors.length)];

  // Final name format:
  // "Luminous Azure Bloom"
  return `${adj} ${hueName} ${desc}`;
}

// ===============================
//  CARD OBJECT GENERATOR
// ===============================

export function generateCard() {
  const hex = randomHex();
  const hsl = hexToHSL(hex);
  const rarity = getRarity(hsl);
  const name = generateName(hsl, rarity);

  return {
    id: crypto.randomUUID(),
    hex,
    hsl,
    rarity,
    name,
    created: Date.now()
  };
}

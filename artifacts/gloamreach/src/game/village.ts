import {
  EVA_X,
  FLOOR_Y,
  VILLAGE_WIDTH,
  WORLD_HEIGHT,
  type GameState,
} from "./engine";

type HeroRenderer = (
  ctx: CanvasRenderingContext2D,
  state: GameState,
  time: number,
) => void;

const HOUSES = [
  { x: 48, width: 186, height: 118, seed: 0 },
  { x: 338, width: 228, height: 156, seed: 1 },
  { x: 840, width: 196, height: 126, seed: 2 },
  { x: 1194, width: 240, height: 164, seed: 3 },
] as const;

const LANTERNS = [272, 805, 1107, 1464];
const SHRUBS = [246, 311, 536, 735, 1010, 1147, 1437, 1518];

function drawFir(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  height: number,
  color: string,
  seed: number,
) {
  const trunkWidth = Math.max(5, height * 0.055);
  ctx.fillStyle = "#111b1c";
  ctx.fillRect(x - trunkWidth / 2, baseY - height * 0.26, trunkWidth, height * 0.29);

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, baseY - height);
  for (let tier = 0; tier < 5; tier++) {
    const tierY = baseY - height * (0.84 - tier * 0.155);
    const half = height * (0.1 + tier * 0.047);
    const notch = ((seed + tier * 3) % 5) * 1.7;
    ctx.lineTo(x - half * 0.43, tierY + notch);
    ctx.quadraticCurveTo(x - half * 0.63, tierY + height * 0.1, x - half, tierY + height * 0.12);
    ctx.lineTo(x - half * 0.3, tierY + height * 0.105);
    ctx.lineTo(x + half * 0.26, tierY + height * 0.13);
    ctx.quadraticCurveTo(x + half * 0.7, tierY + height * 0.16, x + half, tierY + height * 0.18);
  }
  ctx.lineTo(x + trunkWidth, baseY);
  ctx.lineTo(x - trunkWidth, baseY);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(126,157,125,.12)";
  ctx.lineWidth = Math.max(1, height * 0.009);
  ctx.beginPath();
  ctx.moveTo(x - height * 0.035, baseY - height * 0.32);
  ctx.lineTo(x - height * 0.025, baseY - height * 0.88);
  ctx.stroke();
}

function drawForestLine(
  ctx: CanvasRenderingContext2D,
  cameraX: number,
  viewWidth: number,
  screenHeight: number,
  speed: number,
  spacing: number,
  baseFactor: number,
  color: string,
  heightFactor: number,
) {
  const shift = cameraX * speed;
  const first = Math.floor(shift / spacing) - 2;
  const last = Math.ceil((shift + viewWidth) / spacing) + 2;
  const baseY = screenHeight * baseFactor;
  for (let index = first; index <= last; index++) {
    const jitter = ((index * 47 % 37) + 37) % 37;
    const x = index * spacing - shift + jitter;
    const treeHeight = screenHeight * (heightFactor + ((index * 19 % 25) + 25) % 25 / 100);
    drawFir(ctx, x, baseY, treeHeight, color, index + 70);
  }
}

function drawVillageSky(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cameraX: number,
  time: number,
) {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#10151f");
  sky.addColorStop(0.37, "#1c2731");
  sky.addColorStop(0.74, "#293438");
  sky.addColorStop(1, "#353b35");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  const moonX = width * 0.77 - cameraX * 0.035;
  const moonY = height * 0.2;
  const moonGlow = ctx.createRadialGradient(moonX, moonY, 3, moonX, moonY, height * 0.49);
  moonGlow.addColorStop(0, "rgba(211,188,145,.2)");
  moonGlow.addColorStop(0.28, "rgba(159,168,144,.1)");
  moonGlow.addColorStop(1, "rgba(101,131,130,0)");
  ctx.fillStyle = moonGlow;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#d5c9a9";
  ctx.globalAlpha = 0.72;
  ctx.beginPath();
  ctx.arc(moonX, moonY, Math.min(width, height) * 0.066, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(111,124,117,.27)";
  ctx.beginPath(); ctx.arc(moonX - 9, moonY - 5, 4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(moonX + 10, moonY + 8, 6, 0, Math.PI * 2); ctx.fill();

  for (let star = 0; star < 38; star++) {
    const x = ((star * 167 + 43) % 1200) / 1200 * width;
    const y = ((star * 71 + 17) % 205) / 600 * height;
    const alpha = 0.23 + 0.22 * Math.sin(time * 0.7 + star * 2.1);
    ctx.fillStyle = `rgba(221,218,190,${Math.max(0.08, alpha)})`;
    ctx.beginPath(); ctx.arc(x, y, star % 7 === 0 ? 1.4 : 0.8, 0, Math.PI * 2); ctx.fill();
  }

  const farHills = ctx.createLinearGradient(0, height * 0.36, 0, height * 0.85);
  farHills.addColorStop(0, "#202c30");
  farHills.addColorStop(1, "#283333");
  ctx.fillStyle = farHills;
  ctx.beginPath();
  ctx.moveTo(0, height * 0.73);
  ctx.bezierCurveTo(width * 0.18, height * 0.42, width * 0.3, height * 0.57, width * 0.47, height * 0.69);
  ctx.bezierCurveTo(width * 0.68, height * 0.42, width * 0.81, height * 0.48, width, height * 0.67);
  ctx.lineTo(width, height); ctx.lineTo(0, height); ctx.closePath(); ctx.fill();

  drawForestLine(ctx, cameraX, width, height, 0.08, 94, 0.81, "#172226", 0.23);
  drawForestLine(ctx, cameraX, width, height, 0.17, 74, 0.86, "#111c1d", 0.2);

  const forestHaze = ctx.createLinearGradient(0, height * 0.57, 0, height * 0.92);
  forestHaze.addColorStop(0, "rgba(117,150,137,0)");
  forestHaze.addColorStop(0.64, "rgba(132,159,137,.075)");
  forestHaze.addColorStop(1, "rgba(115,142,128,0)");
  ctx.fillStyle = forestHaze;
  ctx.fillRect(0, height * 0.54, width, height * 0.4);
}

function drawHouse(
  ctx: CanvasRenderingContext2D,
  house: (typeof HOUSES)[number],
  time: number,
) {
  const { x, width, height, seed } = house;
  const top = FLOOR_Y - height;
  const wall = ctx.createLinearGradient(x, top, x + width, FLOOR_Y);
  wall.addColorStop(0, seed % 2 ? "#665e50" : "#635e53");
  wall.addColorStop(0.45, "#4b4d45");
  wall.addColorStop(1, "#303b39");

  // Uneven masonry walls, slightly bowed from age.
  ctx.fillStyle = wall;
  ctx.beginPath();
  ctx.moveTo(x + 4, FLOOR_Y); ctx.lineTo(x + 7, top + 22);
  ctx.quadraticCurveTo(x + width / 2, top - 4, x + width - 7, top + 22);
  ctx.lineTo(x + width - 3, FLOOR_Y); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(199,177,139,.2)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // A steep shingle roof, with a softly irregular ridge.
  ctx.fillStyle = "#292f30";
  ctx.beginPath();
  ctx.moveTo(x - 16, top + 24);
  ctx.lineTo(x + width * 0.42, top - 40 - seed * 2);
  ctx.quadraticCurveTo(x + width * 0.5, top - 47 - seed * 2, x + width * 0.58, top - 38 - seed * 2);
  ctx.lineTo(x + width + 17, top + 25);
  ctx.lineTo(x + width - 1, top + 31);
  ctx.lineTo(x + width * 0.54, top - 13);
  ctx.lineTo(x + 12, top + 33);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(169,160,130,.3)"; ctx.lineWidth = 2; ctx.stroke();

  for (let row = 0; row < 3; row++) {
    const y = top + 5 + row * 12;
    ctx.strokeStyle = row % 2 ? "rgba(143,145,126,.17)" : "rgba(207,188,146,.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 8 + row * 5, y + 18);
    ctx.lineTo(x + width * 0.43, y - 37);
    ctx.moveTo(x + width * 0.59, y - 34);
    ctx.lineTo(x + width - 8 - row * 5, y + 18);
    ctx.stroke();
  }

  // A soot-dark chimney and a few drifting wisps.
  const chimneyX = x + width * (seed % 2 ? 0.73 : 0.2);
  ctx.fillStyle = "#343b38";
  ctx.fillRect(chimneyX, top - 47, 19, 43);
  ctx.fillStyle = "#1a2425";
  ctx.fillRect(chimneyX - 3, top - 49, 25, 5);
  ctx.strokeStyle = "rgba(190,198,171,.18)";
  ctx.lineWidth = 1;
  for (let wisp = 0; wisp < 3; wisp++) {
    const drift = Math.sin(time * 0.45 + seed + wisp) * 5;
    ctx.beginPath();
    ctx.moveTo(chimneyX + 9 + drift, top - 51 - wisp * 12);
    ctx.quadraticCurveTo(chimneyX + 2 + drift, top - 59 - wisp * 12, chimneyX + 13 + drift, top - 67 - wisp * 12);
    ctx.stroke();
  }

  // Window light pools and leaded panes.
  const windowPositions = [x + width * 0.22, x + width * 0.66];
  for (const windowX of windowPositions) {
    const windowY = top + height * 0.37;
    const windowGlow = ctx.createRadialGradient(windowX + 13, windowY + 16, 2, windowX + 13, windowY + 16, 74);
    windowGlow.addColorStop(0, "rgba(255,190,103,.25)");
    windowGlow.addColorStop(1, "rgba(240,158,77,0)");
    ctx.fillStyle = windowGlow;
    ctx.fillRect(windowX - 58, windowY - 58, 142, 145);

    const flicker = 0.86 + Math.sin(time * 1.15 + seed * 2 + windowX) * 0.06;
    ctx.fillStyle = `rgba(239,177,96,${flicker})`;
    ctx.strokeStyle = "#292c29";
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.roundRect(windowX, windowY, 27, 36, [12, 12, 3, 3]); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "rgba(74,54,38,.9)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(windowX + 13.5, windowY + 2); ctx.lineTo(windowX + 13.5, windowY + 35); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(windowX + 1, windowY + 18); ctx.lineTo(windowX + 26, windowY + 18); ctx.stroke();
  }

  // Door, iron latch, and stone lintel.
  const doorX = x + width * 0.45;
  ctx.fillStyle = "#252a29";
  ctx.beginPath(); ctx.roundRect(doorX, FLOOR_Y - 63, 42, 65, [20, 20, 2, 2]); ctx.fill();
  ctx.strokeStyle = "rgba(184,164,127,.34)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(doorX + 21, FLOOR_Y - 63, 20, Math.PI, 0); ctx.stroke();
  ctx.strokeStyle = "rgba(147,127,99,.24)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(doorX + 9, FLOOR_Y - 18); ctx.lineTo(doorX + 34, FLOOR_Y - 18); ctx.stroke();
  ctx.fillStyle = "#c39a5e";
  ctx.beginPath(); ctx.arc(doorX + 34, FLOOR_Y - 32, 2, 0, Math.PI * 2); ctx.fill();

  // Block courses, chipped corners, and moss caught in the joints.
  ctx.strokeStyle = "rgba(17,26,26,.43)"; ctx.lineWidth = 1.3;
  for (let row = 0; row < 4; row++) {
    const y = top + 30 + row * 23;
    ctx.beginPath(); ctx.moveTo(x + 8, y); ctx.lineTo(x + width - 7, y + (row % 2 ? 1 : -1)); ctx.stroke();
    const offset = row % 2 ? 21 : 0;
    for (let joint = x + 24 + offset; joint < x + width - 7; joint += 48) {
      ctx.beginPath(); ctx.moveTo(joint, y - 1); ctx.lineTo(joint - 2, y + 20); ctx.stroke();
    }
  }
  ctx.fillStyle = "rgba(122,151,107,.33)";
  for (let moss = 0; moss < 4; moss++) {
    ctx.beginPath();
    ctx.ellipse(x + 18 + moss * 37, FLOOR_Y - 4 - (moss % 2) * 4, 12, 3, -0.1, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWell(ctx: CanvasRenderingContext2D, x: number, time: number) {
  const y = FLOOR_Y;
  const glow = ctx.createRadialGradient(x, y - 36, 2, x, y - 36, 120);
  glow.addColorStop(0, "rgba(226,187,126,.14)");
  glow.addColorStop(1, "rgba(226,187,126,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(x - 126, y - 160, 252, 170);

  // Wooden supports and the little peaked roof.
  ctx.fillStyle = "#382f29";
  ctx.fillRect(x - 40, y - 105, 8, 77);
  ctx.fillRect(x + 32, y - 105, 8, 77);
  ctx.strokeStyle = "#71614a"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x - 38, y - 102); ctx.lineTo(x - 38, y - 32); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 34, y - 102); ctx.lineTo(x + 34, y - 32); ctx.stroke();
  ctx.fillStyle = "#333536";
  ctx.beginPath();
  ctx.moveTo(x - 57, y - 101); ctx.lineTo(x - 3, y - 140);
  ctx.quadraticCurveTo(x, y - 144, x + 5, y - 140);
  ctx.lineTo(x + 58, y - 101); ctx.lineTo(x + 49, y - 96);
  ctx.lineTo(x, y - 128); ctx.lineTo(x - 49, y - 96); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(198,177,140,.27)"; ctx.lineWidth = 2; ctx.stroke();
  for (let shingle = 0; shingle < 4; shingle++) {
    ctx.strokeStyle = "rgba(168,157,128,.25)";
    ctx.beginPath();
    ctx.moveTo(x - 43 + shingle * 10, y - 103 - shingle * 7);
    ctx.lineTo(x - 2, y - 130 - shingle * 2);
    ctx.lineTo(x + 43 - shingle * 10, y - 103 - shingle * 7);
    ctx.stroke();
  }

  // The pulley and a rope that disappears into black water.
  ctx.fillStyle = "#887253";
  ctx.beginPath(); ctx.arc(x, y - 105, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#252929"; ctx.beginPath(); ctx.arc(x, y - 105, 4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#b7a47e"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x, y - 96); ctx.lineTo(x + 7, y - 42); ctx.stroke();
  ctx.fillStyle = "#775b3e";
  ctx.beginPath(); ctx.roundRect(x + 1, y - 51, 19, 16, 2); ctx.fill();
  ctx.strokeStyle = "rgba(201,169,120,.48)";
  ctx.beginPath(); ctx.moveTo(x + 2, y - 47); ctx.lineTo(x + 19, y - 47); ctx.stroke();

  // Hand-set stone ring with a dark, reflective opening.
  ctx.fillStyle = "#373b37";
  ctx.beginPath(); ctx.ellipse(x, y - 24, 52, 20, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#151e20";
  ctx.beginPath(); ctx.ellipse(x, y - 30, 36, 12, 0, 0, Math.PI * 2); ctx.fill();
  const water = ctx.createLinearGradient(x - 24, y - 40, x + 24, y - 21);
  water.addColorStop(0, "rgba(91,129,132,.56)");
  water.addColorStop(1, "rgba(19,39,46,.3)");
  ctx.fillStyle = water;
  ctx.beginPath(); ctx.ellipse(x, y - 31, 27, 7, -0.06, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#4a5049";
  ctx.beginPath(); ctx.ellipse(x, y - 15, 50, 18, 0, 0, Math.PI); ctx.fill();
  ctx.fillRect(x - 50, y - 25, 100, 11);

  for (let stone = 0; stone < 7; stone++) {
    const angle = Math.PI + (stone / 6) * Math.PI;
    const px = x + Math.cos(angle) * 42;
    const py = y - 23 + Math.sin(angle) * 15;
    ctx.fillStyle = stone % 2 ? "#687066" : "#85816e";
    ctx.beginPath(); ctx.roundRect(px - 11, py - 7, 22, 12, 3); ctx.fill();
    ctx.strokeStyle = "rgba(212,193,153,.2)"; ctx.lineWidth = 1;
    ctx.stroke();
  }

  // A gentle ripple marks the water far below.
  ctx.strokeStyle = `rgba(172,198,170,${0.18 + 0.07 * Math.sin(time * 1.4)})`;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(x - 4, y - 30, 16 + Math.sin(time) * 2, 3, -0.08, 0, Math.PI); ctx.stroke();
}

function drawLantern(ctx: CanvasRenderingContext2D, x: number, time: number, index: number) {
  const glowStrength = 0.12 + 0.035 * Math.sin(time * 1.6 + index);
  const glow = ctx.createRadialGradient(x, FLOOR_Y - 92, 2, x, FLOOR_Y - 92, 98);
  glow.addColorStop(0, `rgba(255,190,112,${glowStrength})`);
  glow.addColorStop(1, "rgba(255,165,83,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(x - 100, FLOOR_Y - 193, 200, 205);

  ctx.strokeStyle = "#353a36"; ctx.lineWidth = 5; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(x, FLOOR_Y - 2); ctx.lineTo(x, FLOOR_Y - 87); ctx.stroke();
  ctx.strokeStyle = "rgba(172,151,112,.6)"; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(x - 1, FLOOR_Y - 5); ctx.lineTo(x - 1, FLOOR_Y - 83); ctx.stroke();

  ctx.fillStyle = "#2d3431";
  ctx.beginPath(); ctx.moveTo(x - 13, FLOOR_Y - 86); ctx.lineTo(x - 9, FLOOR_Y - 106);
  ctx.lineTo(x + 9, FLOOR_Y - 106); ctx.lineTo(x + 13, FLOOR_Y - 86); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#82775e"; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = "#f4c781";
  ctx.shadowColor = "#ffc36e"; ctx.shadowBlur = 17;
  ctx.beginPath(); ctx.ellipse(x, FLOOR_Y - 95, 4, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#41443b";
  ctx.beginPath(); ctx.moveTo(x - 18, FLOOR_Y - 107); ctx.lineTo(x, FLOOR_Y - 115);
  ctx.lineTo(x + 18, FLOOR_Y - 107); ctx.lineTo(x + 13, FLOOR_Y - 102);
  ctx.lineTo(x - 13, FLOOR_Y - 102); ctx.closePath(); ctx.fill();
  ctx.fillRect(x - 17, FLOOR_Y - 83, 34, 4);
}

function drawShrub(ctx: CanvasRenderingContext2D, x: number, time: number, index: number) {
  ctx.save();
  ctx.translate(x, FLOOR_Y);
  ctx.strokeStyle = "#304137"; ctx.lineWidth = 2; ctx.lineCap = "round";
  for (let leaf = 0; leaf < 5; leaf++) {
    const side = leaf % 2 ? 1 : -1;
    const height = 9 + ((leaf * 7 + index) % 8);
    const lx = side * (5 + leaf * 2);
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(lx * 0.45, -height * 0.56, lx, -height);
    ctx.stroke();
    ctx.fillStyle = leaf % 2 ? "#65714d" : "#485c48";
    ctx.beginPath();
    ctx.ellipse(lx, -height, 3.2, 6.2, side * -0.42, 0, Math.PI * 2);
    ctx.fill();
  }
  if (index % 3 === 0) {
    ctx.fillStyle = "#d6a96d";
    ctx.shadowColor = "#e6bd7c"; ctx.shadowBlur = 7;
    ctx.beginPath(); ctx.arc(Math.sin(time + index) * 2, -13, 2, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }
  ctx.restore();
}

function drawRootGate(ctx: CanvasRenderingContext2D, x: number) {
  ctx.save();
  ctx.translate(x, FLOOR_Y);
  const root = ctx.createLinearGradient(-46, -220, 57, 0);
  root.addColorStop(0, "#303a35"); root.addColorStop(0.53, "#202d2b"); root.addColorStop(1, "#131d1e");
  ctx.fillStyle = root;
  ctx.beginPath(); ctx.moveTo(-94, 1); ctx.lineTo(-70, -112);
  ctx.bezierCurveTo(-62, -175, -37, -201, 0, -204);
  ctx.bezierCurveTo(45, -205, 70, -173, 77, -116);
  ctx.lineTo(97, 1); ctx.lineTo(59, -5); ctx.lineTo(43, -111);
  ctx.bezierCurveTo(34, -159, 18, -172, 0, -173);
  ctx.bezierCurveTo(-22, -173, -39, -154, -45, -108);
  ctx.lineTo(-57, 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(143,163,126,.2)"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-70, -8); ctx.bezierCurveTo(-51, -139, -47, -191, 0, -201);
  ctx.bezierCurveTo(58, -193, 60, -137, 78, -6); ctx.stroke();

  for (let vine = 0; vine < 7; vine++) {
    const side = vine % 2 ? 1 : -1;
    const start = -64 + vine * 20;
    ctx.strokeStyle = vine % 3 ? "#34463b" : "#526043";
    ctx.lineWidth = 2 + vine % 2;
    ctx.beginPath(); ctx.moveTo(start, -166 + (vine % 3) * 13);
    ctx.bezierCurveTo(start + side * 25, -125, start - side * 13, -76, start + side * 6, -27);
    ctx.stroke();
  }

  const opening = ctx.createRadialGradient(0, -82, 4, 0, -82, 92);
  opening.addColorStop(0, "rgba(113,151,128,.15)");
  opening.addColorStop(1, "rgba(18,30,31,0)");
  ctx.fillStyle = opening;
  ctx.beginPath(); ctx.ellipse(0, -85, 55, 97, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawCobblestones(ctx: CanvasRenderingContext2D, time: number) {
  const path = ctx.createLinearGradient(0, FLOOR_Y - 35, 0, FLOOR_Y + 9);
  path.addColorStop(0, "rgba(126,128,112,.13)");
  path.addColorStop(1, "rgba(98,103,93,.28)");
  ctx.fillStyle = path;
  ctx.beginPath();
  ctx.moveTo(0, FLOOR_Y - 20);
  ctx.bezierCurveTo(VILLAGE_WIDTH * 0.26, FLOOR_Y - 39, VILLAGE_WIDTH * 0.52, FLOOR_Y - 12, VILLAGE_WIDTH, FLOOR_Y - 32);
  ctx.lineTo(VILLAGE_WIDTH, FLOOR_Y + 12);
  ctx.bezierCurveTo(VILLAGE_WIDTH * 0.59, FLOOR_Y + 2, VILLAGE_WIDTH * 0.3, FLOOR_Y + 17, 0, FLOOR_Y + 9);
  ctx.closePath(); ctx.fill();

  for (let row = 0; row < 3; row++) {
    const offset = row % 2 ? 13 : 0;
    for (let x = -18 + offset; x < VILLAGE_WIDTH + 24; x += 34) {
      const wave = Math.sin(x * 0.009 + row * 1.7) * 8;
      const y = FLOOR_Y - 23 + row * 12 + wave;
      ctx.fillStyle = (Math.floor(x / 34) + row) % 3 === 0 ? "#62665d" : "#555d58";
      ctx.globalAlpha = 0.42 + 0.05 * Math.sin(time * 0.25 + x);
      ctx.beginPath();
      ctx.ellipse(x + 13, y, 13 + (Math.floor(x / 34) % 3), 5.5, -0.06, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(181,177,148,.16)"; ctx.lineWidth = 1; ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

function drawEva(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.translate(EVA_X, FLOOR_Y);

  ctx.fillStyle = "rgba(3,10,12,.4)";
  ctx.beginPath(); ctx.ellipse(0, -2, 18, 4.3, 0, 0, Math.PI * 2); ctx.fill();

  // Short boots and a soft blue-green traveling dress.
  ctx.fillStyle = "#292f32";
  ctx.beginPath(); ctx.roundRect(-10, -13, 8, 13, [3, 3, 2, 2]); ctx.fill();
  ctx.beginPath(); ctx.roundRect(3, -13, 8, 13, [3, 3, 2, 2]); ctx.fill();
  ctx.fillStyle = "#53685e";
  ctx.beginPath(); ctx.moveTo(-8, -40); ctx.quadraticCurveTo(-14, -20, -14, -8);
  ctx.quadraticCurveTo(0, -2, 15, -8); ctx.lineTo(9, -40); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(181,194,157,.45)"; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-10, -13); ctx.lineTo(11, -13); ctx.stroke();

  // Sleeves, hands, and a little golden scarf.
  ctx.strokeStyle = "#bb967b"; ctx.lineWidth = 4.5; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-7, -34); ctx.quadraticCurveTo(-15, -29, -13, -22); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(7, -34); ctx.quadraticCurveTo(14, -30, 13, -24); ctx.stroke();
  ctx.fillStyle = "#e4bd98";
  ctx.beginPath(); ctx.arc(-13, -21, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(13, -23, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#c18b55";
  ctx.beginPath(); ctx.moveTo(-7, -41); ctx.quadraticCurveTo(0, -36, 9, -42);
  ctx.lineTo(7, -35); ctx.lineTo(2, -32); ctx.lineTo(-5, -36); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(4, -36); ctx.lineTo(11, -26); ctx.lineTo(7, -24); ctx.lineTo(1, -34); ctx.closePath(); ctx.fill();

  // A pale face framed by a chestnut bob, without movement or locomotion.
  ctx.fillStyle = "#e6bea0";
  ctx.beginPath(); ctx.ellipse(0, -51, 9, 11, -0.04, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#513d3a";
  ctx.beginPath();
  ctx.moveTo(-9, -53); ctx.quadraticCurveTo(-14, -67, -3, -68);
  ctx.quadraticCurveTo(9, -69, 10, -57); ctx.lineTo(8, -45);
  ctx.quadraticCurveTo(4, -41, 1, -44); ctx.lineTo(-1, -52);
  ctx.quadraticCurveTo(-7, -46, -10, -47); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#252b2b";
  ctx.beginPath(); ctx.arc(3, -52, 1.15, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#9b6658"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(2, -47); ctx.quadraticCurveTo(4, -46, 6, -47); ctx.stroke();

  // Tiny clasp and a leaf-shaped hairpin distinguish Eva from Lisa.
  ctx.fillStyle = "#d1ad6d";
  ctx.beginPath(); ctx.arc(-1, -38, 2.1, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#829274";
  ctx.beginPath(); ctx.ellipse(8, -61, 2.3, 5, -0.7, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function drawVillageWorld(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  width: number,
  height: number,
  scale: number,
  drawHero: HeroRenderer,
) {
  const { cameraX, cameraY, elapsed } = state;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  drawVillageSky(ctx, width, height, cameraX, elapsed);

  ctx.save();
  ctx.setTransform(scale, 0, 0, scale, -cameraX * scale, -cameraY * scale);
  const earth = ctx.createLinearGradient(0, FLOOR_Y, 0, WORLD_HEIGHT);
  earth.addColorStop(0, "#303632");
  earth.addColorStop(0.08, "#262f2d");
  earth.addColorStop(1, "#131d20");
  ctx.fillStyle = earth;
  ctx.fillRect(0, FLOOR_Y, VILLAGE_WIDTH, WORLD_HEIGHT - FLOOR_Y);

  drawCobblestones(ctx, elapsed);

  // The warm windows sit against old, cool forest silhouettes.
  for (const house of HOUSES) drawHouse(ctx, house, elapsed);

  // Tree boughs overlap the buildings at the forest edge.
  for (let tree = 0; tree < 11; tree++) {
    const x = tree * 166 + 25;
    const height = 155 + ((tree * 37) % 74);
    drawFir(ctx, x, FLOOR_Y - 4, height, tree % 2 ? "#1b2927" : "#202d2a", tree);
  }

  drawRootGate(ctx, VILLAGE_WIDTH - 68);
  for (let index = 0; index < LANTERNS.length; index++) {
    drawLantern(ctx, LANTERNS[index], elapsed, index);
  }
  for (let index = 0; index < SHRUBS.length; index++) {
    drawShrub(ctx, SHRUBS[index], elapsed, index);
  }

  // An old well marks the place where Eva waits.
  drawWell(ctx, EVA_X + 55, elapsed);
  drawEva(ctx);

  // Quiet flecks of firefly light move between the path and the trees.
  for (let mote = 0; mote < 38; mote++) {
    const x = (mote * 113 + 42) % VILLAGE_WIDTH;
    const y = 255 + ((mote * 67 + 29) % 240);
    const drift = Math.sin(elapsed * 0.6 + mote * 2) * 5;
    const alpha = 0.14 + 0.12 * (0.5 + 0.5 * Math.sin(elapsed + mote));
    ctx.fillStyle = mote % 5 === 0
      ? `rgba(246,192,117,${alpha})`
      : `rgba(178,210,172,${alpha})`;
    ctx.beginPath(); ctx.arc(x + drift, y, mote % 6 === 0 ? 1.8 : 1.1, 0, Math.PI * 2); ctx.fill();
  }

  // Low blue-gray mist softens the edge of the forest without covering faces.
  const fog = ctx.createLinearGradient(cameraX, FLOOR_Y - 82, cameraX, FLOOR_Y + 16);
  fog.addColorStop(0, "rgba(148,171,151,0)");
  fog.addColorStop(0.55, "rgba(133,162,147,.09)");
  fog.addColorStop(1, "rgba(113,144,134,0)");
  ctx.fillStyle = fog;
  ctx.fillRect(cameraX, FLOOR_Y - 82 + Math.sin(elapsed * 0.24) * 4, width, 98);

  drawHero(ctx, state, elapsed);

  const vignette = ctx.createRadialGradient(
    cameraX + width * 0.5, cameraY + height * 0.5, height * 0.2,
    cameraX + width * 0.5, cameraY + height * 0.5, width * 0.76,
  );
  vignette.addColorStop(0.56, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(7,10,13,.44)");
  ctx.fillStyle = vignette;
  ctx.fillRect(cameraX, cameraY, width, height);
  ctx.restore();
}

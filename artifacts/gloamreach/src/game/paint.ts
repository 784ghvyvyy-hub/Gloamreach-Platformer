import {
  FLOOR_Y,
  PLATFORMS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  type GameState,
} from "./engine";

const MUSHROOMS = [
  [84, 514, 1], [259, 509, 0.7], [375, 431, 0.8], [525, 515, 0.8],
  [654, 355, 0.75], [822, 512, 1.1], [942, 424, 0.7], [1118, 512, 0.9],
  [1248, 348, 0.75], [1420, 513, 0.8], [1550, 418, 0.8], [1750, 513, 1],
  [1870, 348, 0.7], [2065, 513, 1], [2188, 432, 0.7], [2340, 513, 0.85],
] as const;

const PLANTS = [
  [178, 540, 0.85], [300, 540, 0.55], [471, 438, 0.62], [786, 540, 0.9],
  [1050, 430, 0.72], [1158, 540, 0.7], [1390, 540, 0.95], [1678, 424, 0.58],
  [1770, 540, 0.65], [2024, 540, 0.88], [2290, 540, 0.74],
] as const;

const MOTES = Array.from({ length: 88 }, (_, i) => ({
  x: (i * 137 + 31) % WORLD_WIDTH,
  y: 28 + ((i * 83 + 17) % 490),
  radius: 0.7 + (i % 4) * 0.38,
  phase: i * 1.71,
  amber: i % 9 === 0,
}));

function drawBackdrop(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cameraX: number,
  time: number,
) {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#080d16");
  sky.addColorStop(0.34, "#121c26");
  sky.addColorStop(0.72, "#1e2a2b");
  sky.addColorStop(1, "#2b3430");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  const distantLight = ctx.createRadialGradient(
    width * 0.64, height * 0.31, 3, width * 0.64, height * 0.31, width * 0.66,
  );
  distantLight.addColorStop(0, "rgba(108,158,146,.17)");
  distantLight.addColorStop(0.42, "rgba(62,112,111,.08)");
  distantLight.addColorStop(1, "rgba(21,37,47,0)");
  ctx.fillStyle = distantLight;
  ctx.fillRect(0, 0, width, height);

  // The cavern's distant vaults move at different speeds from the walkable world.
  const layers = [
    { speed: 0.1, period: 430, color: "#101a24", alpha: 0.86, lift: 0 },
    { speed: 0.19, period: 330, color: "#15232a", alpha: 0.82, lift: 35 },
  ];
  for (const layer of layers) {
    const shift = cameraX * layer.speed;
    const first = Math.floor(shift / layer.period) - 1;
    const last = Math.ceil((shift + width) / layer.period) + 1;
    ctx.save();
    ctx.globalAlpha = layer.alpha;
    for (let i = first; i <= last; i++) {
      const x = i * layer.period - shift;
      const crown = 92 + ((i * 41 % 72) + 72) % 72 + layer.lift;
      ctx.fillStyle = layer.color;
      ctx.beginPath();
      ctx.moveTo(x - 95, height * 0.79);
      ctx.lineTo(x - 18, height * 0.36);
      ctx.quadraticCurveTo(x + 72, crown - 28, x + 154, height * 0.31);
      ctx.quadraticCurveTo(x + 250, crown - 18, x + 335, height * 0.79);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "rgba(141,173,155,.12)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + 2, height * 0.73);
      ctx.lineTo(x + 44, height * 0.4);
      ctx.quadraticCurveTo(x + 139, crown + 2, x + 193, height * 0.38);
      ctx.lineTo(x + 277, height * 0.73);
      ctx.stroke();
      ctx.strokeStyle = "rgba(5,12,20,.4)";
      ctx.lineWidth = 11;
      ctx.beginPath();
      ctx.moveTo(x + 5, height * 0.76);
      ctx.lineTo(x + 47, height * 0.4);
      ctx.stroke();

      // Tiny, distant windows make the nave read as architecture, not a flat cave.
      ctx.fillStyle = `rgba(163,202,170,${0.08 + 0.04 * Math.sin(time * 0.7 + i)})`;
      for (let pane = 0; pane < 3; pane++) {
        ctx.beginPath();
        ctx.ellipse(x + 115 + pane * 24, height * 0.48, 2.2, 9, -0.12, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // Broken teeth of the cave roof, with cool mineral highlights.
  const toothShift = cameraX * 0.24;
  for (
    let i = Math.floor(toothShift / 152) - 1;
    i <= Math.ceil((toothShift + width) / 152) + 1;
    i++
  ) {
    const x = i * 152 - toothShift;
    const drop = 23 + ((i * 29 % 62) + 62) % 62;
    const tooth = ctx.createLinearGradient(x, 0, x + 34, drop);
    tooth.addColorStop(0, "#0b1119");
    tooth.addColorStop(1, "#1c292c");
    ctx.fillStyle = tooth;
    ctx.beginPath();
    ctx.moveTo(x - 22, 0); ctx.lineTo(x + 44, 0);
    ctx.lineTo(x + 35, drop); ctx.lineTo(x + 24, drop - 11);
    ctx.lineTo(x + 16, drop + 2); ctx.lineTo(x + 6, drop - 4);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(150,172,153,.1)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x + 7, 2); ctx.lineTo(x + 25, drop - 9); ctx.stroke();
  }

  // Thin drifting mist at three depths.
  for (let band = 0; band < 3; band++) {
    const y = height * (0.69 + band * 0.073);
    const fog = ctx.createLinearGradient(0, y - 32, 0, y + 62);
    fog.addColorStop(0, "rgba(140,177,158,0)");
    fog.addColorStop(0.5, `rgba(119,160,143,${0.035 + band * 0.013})`);
    fog.addColorStop(1, "rgba(83,123,113,0)");
    ctx.fillStyle = fog;
    ctx.save();
    ctx.translate(
      Math.sin(time * (0.12 + band * 0.035) + band) * 34 -
        (cameraX * 0.035) % 100,
      0,
    );
    ctx.fillRect(-40, y - 32, width + 100, 94);
    ctx.restore();
  }
}

function drawRuins(ctx: CanvasRenderingContext2D, cameraX: number, viewWidth: number) {
  const period = 430;
  const first = Math.floor(cameraX / period) - 1;
  const last = Math.ceil((cameraX + viewWidth) / period) + 1;
  for (let i = first; i <= last; i++) {
    const x = i * period + 20;
    const variation = ((i * 37 % 64) + 64) % 64;
    const crownY = FLOOR_Y - 268 - variation;
    const masonry = ctx.createLinearGradient(x - 25, crownY, x + 220, FLOOR_Y);
    masonry.addColorStop(0, "#3a4747");
    masonry.addColorStop(0.42, "#29383b");
    masonry.addColorStop(1, "#19252c");
    ctx.fillStyle = masonry;

    // A carved arch ring with an open centre.
    ctx.beginPath();
    ctx.moveTo(x - 22, FLOOR_Y + 3); ctx.lineTo(x - 22, crownY + 88);
    ctx.quadraticCurveTo(x + 7, crownY + 8, x + 92, crownY);
    ctx.quadraticCurveTo(x + 178, crownY + 9, x + 207, crownY + 88);
    ctx.lineTo(x + 207, FLOOR_Y + 3); ctx.closePath();
    ctx.moveTo(x + 18, FLOOR_Y + 3); ctx.lineTo(x + 18, crownY + 96);
    ctx.quadraticCurveTo(x + 38, crownY + 43, x + 92, crownY + 37);
    ctx.quadraticCurveTo(x + 147, crownY + 43, x + 167, crownY + 96);
    ctx.lineTo(x + 167, FLOOR_Y + 3); ctx.closePath();
    ctx.fill("evenodd");

    ctx.strokeStyle = "rgba(151,177,156,.23)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 17, FLOOR_Y - 3); ctx.lineTo(x - 17, crownY + 87);
    ctx.quadraticCurveTo(x + 9, crownY + 15, x + 92, crownY + 6);
    ctx.quadraticCurveTo(x + 174, crownY + 15, x + 202, crownY + 87);
    ctx.lineTo(x + 202, FLOOR_Y - 3); ctx.stroke();

    for (const side of [x - 23, x + 181]) {
      const column = ctx.createLinearGradient(side, 0, side + 28, 0);
      column.addColorStop(0, "#202d32"); column.addColorStop(0.28, "#4b5650");
      column.addColorStop(0.53, "#303d3e"); column.addColorStop(1, "#1a272c");
      ctx.fillStyle = column;
      ctx.fillRect(side, crownY + 78, 27, FLOOR_Y - crownY - 78);
      ctx.fillStyle = "#59645b";
      ctx.fillRect(side - 6, crownY + 74, 39, 10);
      ctx.fillStyle = "#293639";
      ctx.fillRect(side - 9, FLOOR_Y - 15, 45, 16);
      ctx.fillStyle = "rgba(190,198,163,.16)";
      ctx.fillRect(side + 4, crownY + 96, 2, FLOOR_Y - crownY - 125);

      for (let seam = crownY + 132; seam < FLOOR_Y - 22; seam += 68) {
        ctx.strokeStyle = "rgba(10,18,22,.54)";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(side + 1, seam); ctx.lineTo(side + 26, seam + 2); ctx.stroke();
        ctx.strokeStyle = "rgba(174,188,159,.12)";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(side + 3, seam + 3); ctx.lineTo(side + 24, seam + 5); ctx.stroke();
      }

      ctx.strokeStyle = "rgba(189,198,164,.17)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(side + 13, crownY + 116);
      ctx.bezierCurveTo(side + 4, crownY + 136, side + 23, crownY + 145, side + 13, crownY + 164);
      ctx.moveTo(side + 13, crownY + 132);
      ctx.quadraticCurveTo(side + 4, crownY + 124, side + 5, crownY + 118);
      ctx.moveTo(side + 14, crownY + 145);
      ctx.quadraticCurveTo(side + 23, crownY + 137, side + 22, crownY + 131);
      ctx.stroke();
    }

    // A cracked fallen block at the foot of each column.
    ctx.fillStyle = "#35423e";
    ctx.beginPath();
    ctx.moveTo(x + 42, FLOOR_Y - 14); ctx.lineTo(x + 58, FLOOR_Y - 21);
    ctx.lineTo(x + 76, FLOOR_Y - 12); ctx.lineTo(x + 69, FLOOR_Y - 3);
    ctx.lineTo(x + 39, FLOOR_Y - 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(183,199,158,.13)";
    ctx.beginPath(); ctx.moveTo(x + 54, FLOOR_Y - 18);
    ctx.lineTo(x + 67, FLOOR_Y - 13); ctx.lineTo(x + 61, FLOOR_Y - 9); ctx.closePath(); ctx.fill();
  }
}

function drawPlatform(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const floor = y >= FLOOR_Y;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  const face = ctx.createLinearGradient(x, y, x, y + Math.max(h, 1));
  face.addColorStop(0, floor ? "#687469" : "#858b7b");
  face.addColorStop(0.12, floor ? "#414b46" : "#535c53");
  face.addColorStop(0.56, floor ? "#303c3b" : "#394443");
  face.addColorStop(1, "#202b30");
  ctx.fillStyle = face; ctx.fillRect(x, y, w, h);

  // Chipped limestone lip and a thin wet highlight.
  ctx.fillStyle = floor ? "#778475" : "#989987";
  ctx.beginPath(); ctx.moveTo(x - 3, y + 2); ctx.lineTo(x + 11, y);
  for (let px = x + 11; px < x + w; px += 42) {
    const nick = ((Math.floor(px / 13) * 11) % 5) - 2;
    ctx.lineTo(Math.min(px + 23, x + w), y + nick);
    ctx.lineTo(Math.min(px + 41, x + w), y + ((nick + 1) % 3));
  }
  ctx.lineTo(x + w + 3, y + 6); ctx.lineTo(x + w, y + 8);
  ctx.lineTo(x, y + 8); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(218,220,187,.54)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x, y + 1); ctx.lineTo(x + w, y + 1); ctx.stroke();

  // Ashlar courses, broken mortar and branching hairline cracks.
  const blockWidth = floor ? 104 : 64;
  const top = y + (floor ? 26 : 9);
  for (let bx = x + 1, row = 0; bx < x + w; bx += blockWidth, row++) {
    const offset = row % 2 === 0 ? 0 : blockWidth * 0.44;
    const left = bx + offset;
    const shade = 0.035 + (((Math.floor(bx / 17) * 7) % 6) * 0.009);
    ctx.fillStyle = `rgba(176,185,157,${shade})`;
    ctx.fillRect(left + 3, top + 3, blockWidth * 0.62, floor ? 22 : Math.max(5, h - 12));
    ctx.strokeStyle = "rgba(12,20,23,.48)";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(left, top); ctx.lineTo(left, Math.min(y + h, top + (floor ? 27 : h)));
    if (left + blockWidth < x + w) {
      ctx.moveTo(left + blockWidth, y + (floor ? 2 : 1));
      ctx.lineTo(left + blockWidth, Math.min(y + h, y + (floor ? 24 : h)));
    }
    ctx.stroke();
    if (floor && row % 2 === 1) {
      ctx.beginPath(); ctx.moveTo(left + 15, top + 26); ctx.lineTo(left + blockWidth - 10, top + 26); ctx.stroke();
    }

    const crackX = left + 17 + ((row * 19) % 27);
    ctx.strokeStyle = "rgba(13,21,22,.57)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(crackX, top + 4);
    ctx.lineTo(crackX - 4, top + 10); ctx.lineTo(crackX + 2, top + 14);
    ctx.lineTo(crackX - 1, top + 20); ctx.stroke();
    ctx.strokeStyle = "rgba(190,199,165,.15)";
    ctx.beginPath(); ctx.moveTo(left + 8, top + 5); ctx.lineTo(left + 26, top + 5); ctx.stroke();
  }

  if (!floor) {
    ctx.fillStyle = "rgba(139,174,126,.66)";
    for (let tuft = x + 12; tuft < x + w - 12; tuft += 71) {
      const length = 5 + (Math.floor(tuft / 11) % 6);
      ctx.beginPath(); ctx.moveTo(tuft, y + 2);
      ctx.quadraticCurveTo(tuft + 4, y - length, tuft + 7, y + 1);
      ctx.quadraticCurveTo(tuft + 12, y - length * 0.45, tuft + 15, y + 2);
      ctx.closePath(); ctx.fill();
    }
  }
  if (floor) {
    const damp = ctx.createLinearGradient(x, y + 4, x, y + 40);
    damp.addColorStop(0, "rgba(140,180,148,.12)");
    damp.addColorStop(1, "rgba(140,180,148,0)");
    ctx.fillStyle = damp; ctx.fillRect(x, y + 3, w, 38);
  }
  ctx.restore();
}

function drawMushroom(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  time: number,
) {
  const pulse = 0.8 + 0.2 * Math.sin(time * 2.2 + x * 0.03);
  const amber = Math.floor(x / 127) % 4 === 1;
  const glowColor = amber ? "239,167,105" : "134,218,182";
  const capLight = amber ? "#f0c18b" : "#c5ebcb";
  const capShade = amber ? "#9a6254" : "#5c907d";

  ctx.save();
  ctx.translate(x, y); ctx.scale(scale, scale);
  const aura = ctx.createRadialGradient(0, -19, 1, 0, -19, 61);
  aura.addColorStop(0, `rgba(${glowColor},${0.22 * pulse})`);
  aura.addColorStop(0.42, `rgba(${glowColor},${0.09 * pulse})`);
  aura.addColorStop(1, `rgba(${glowColor},0)`);
  ctx.fillStyle = aura; ctx.beginPath(); ctx.arc(0, -19, 61, 0, Math.PI * 2); ctx.fill();

  const stem = ctx.createLinearGradient(-5, -5, 6, -5);
  stem.addColorStop(0, "#688174"); stem.addColorStop(0.48, "#e0d7b5"); stem.addColorStop(1, "#7e9e87");
  ctx.fillStyle = stem;
  ctx.beginPath(); ctx.moveTo(-3, -8); ctx.quadraticCurveTo(-5, -20, -3, -34);
  ctx.quadraticCurveTo(0, -38, 3, -33); ctx.lineTo(5, -8);
  ctx.quadraticCurveTo(1, -5, -3, -8); ctx.fill();
  ctx.strokeStyle = "rgba(250,241,210,.55)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-1, -13); ctx.quadraticCurveTo(-2, -24, 0, -34); ctx.stroke();

  const cap = ctx.createLinearGradient(0, -49, 0, -16);
  cap.addColorStop(0, capLight); cap.addColorStop(0.32, capShade); cap.addColorStop(1, "#354f4a");
  ctx.fillStyle = cap;
  ctx.beginPath(); ctx.moveTo(-24, -29);
  ctx.bezierCurveTo(-19, -45, -8, -50, 1, -49);
  ctx.bezierCurveTo(14, -49, 23, -40, 25, -29);
  ctx.quadraticCurveTo(13, -21, 0, -23);
  ctx.quadraticCurveTo(-15, -21, -24, -29); ctx.fill();
  ctx.strokeStyle = "rgba(238,239,207,.8)";
  ctx.lineWidth = 1.7;
  ctx.beginPath(); ctx.moveTo(-22, -29); ctx.quadraticCurveTo(0, -21, 23, -29); ctx.stroke();
  ctx.strokeStyle = "rgba(239,237,202,.42)";
  ctx.lineWidth = 1;
  for (let gill = -15; gill <= 15; gill += 6) {
    ctx.beginPath(); ctx.moveTo(gill, -25);
    ctx.quadraticCurveTo(gill * 0.7, -18, gill * 0.65, -13); ctx.stroke();
  }
  ctx.fillStyle = "rgba(255,239,195,.88)";
  ctx.beginPath();
  ctx.ellipse(-11, -35, 3, 1.5, -0.3, 0, Math.PI * 2);
  ctx.ellipse(1, -42, 1.9, 1.3, 0.2, 0, Math.PI * 2);
  ctx.ellipse(14, -32, 2.2, 1.4, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.6 + 0.35 * pulse;
  ctx.fillStyle = "#fbf6d7";
  ctx.beginPath(); ctx.arc(-1, -29, 1.6, 0, Math.PI * 2); ctx.fill();

  // Two smaller caps make each glowing cluster feel like a living colony.
  for (const [dx, factor] of [[-19, 0.48], [20, 0.38]] as const) {
    ctx.save(); ctx.translate(dx, -5); ctx.scale(factor, factor);
    ctx.fillStyle = amber ? "#c58a68" : "#afceb0";
    ctx.beginPath(); ctx.moveTo(-11, -12); ctx.quadraticCurveTo(-8, -23, 0, -22);
    ctx.quadraticCurveTo(10, -21, 12, -12); ctx.quadraticCurveTo(0, -8, -11, -12); ctx.fill();
    ctx.fillStyle = "#8d9d82";
    ctx.beginPath(); ctx.moveTo(-2, -12); ctx.quadraticCurveTo(-3, -6, -2, 0);
    ctx.lineTo(3, 0); ctx.lineTo(2, -12); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawPlant(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  time: number,
) {
  const sway = Math.sin(time * 1.65 + x * 0.021) * 2.2;
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  ctx.lineCap = "round";
  for (let leaf = 0; leaf < 5; leaf++) {
    const side = leaf % 2 === 0 ? -1 : 1;
    const rise = 12 + leaf * 4.7;
    const lean = side * (7 + leaf * 2.5) + sway;
    ctx.strokeStyle = "#668771";
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(lean * 0.25, -rise * 0.55, lean, -rise); ctx.stroke();
    const leafColor = ctx.createLinearGradient(0, -rise * 0.6, lean, -rise);
    leafColor.addColorStop(0, "#456f5c"); leafColor.addColorStop(1, "#a2b789");
    ctx.fillStyle = leafColor;
    ctx.beginPath(); ctx.moveTo(lean * 0.35, -rise * 0.56);
    ctx.quadraticCurveTo(lean + side * 11, -rise * 0.93, lean, -rise);
    ctx.quadraticCurveTo(lean - side * 7, -rise * 0.82, lean * 0.35, -rise * 0.56); ctx.fill();
    ctx.strokeStyle = "rgba(221,225,180,.4)";
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(lean * 0.45, -rise * 0.62); ctx.lineTo(lean, -rise); ctx.stroke();
  }
  const seedGlow = ctx.createRadialGradient(sway, -34, 0, sway, -34, 15);
  seedGlow.addColorStop(0, "rgba(231,211,144,.75)");
  seedGlow.addColorStop(1, "rgba(189,194,130,0)");
  ctx.fillStyle = seedGlow; ctx.beginPath(); ctx.arc(sway, -34, 15, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#e0d19a"; ctx.beginPath(); ctx.arc(sway, -34, 2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawHero(ctx: CanvasRenderingContext2D, state: GameState, time: number) {
  const p = state.player;
  const running = Math.abs(p.vx) > 22 && p.grounded;
  const airborne = !p.grounded;
  const rising = airborne && p.vy < -90;
  const falling = airborne && p.vy > 90;
  const stride = running ? Math.sin(time * 15) : 0;
  const bob = running ? Math.abs(Math.sin(time * 15)) * 2.2 : p.grounded ? Math.sin(time * 2.4) * 0.7 : rising ? -1 : 1;
  const attack = p.attackTimer > 0;
  const slash = attack ? 1 - p.attackTimer / 0.32 : 0;
  const lean = running ? -0.055 : rising ? -0.09 : falling ? 0.07 : 0;

  ctx.save();
  ctx.translate(p.x + p.width / 2, p.y + p.height + 1);
  const shadowScale = p.grounded ? 1 : Math.max(0.42, 1 - Math.abs(p.vy) * 0.0007);
  ctx.fillStyle = "rgba(3,7,10,.42)";
  ctx.beginPath(); ctx.ellipse(0, 0, 22 * shadowScale, 5 * shadowScale, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(p.x + p.width / 2, p.y + p.height - bob);
  ctx.scale(p.facing, 1); ctx.rotate(lean);
  if (p.invulnerable > 0 && Math.floor(time * 18) % 2 === 0) ctx.globalAlpha = 0.58;

  // Legs articulate independently; knees tuck up in the leap and extend on the fall.
  const legSwing = airborne ? (rising ? 0.68 : -0.5) : stride * 0.68;
  const kneeLift = airborne ? (rising ? -5 : -3) : Math.abs(stride) * 2;
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.strokeStyle = "#25272c"; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(-4, -17);
  ctx.quadraticCurveTo(-8 + legSwing * 7, -11 + kneeLift, -9 + legSwing * 11, -4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(4, -17);
  ctx.quadraticCurveTo(8 - legSwing * 7, -11 - kneeLift, 10 - legSwing * 11, -4); ctx.stroke();
  ctx.fillStyle = "#171c21";
  ctx.beginPath();
  ctx.ellipse(-9 + legSwing * 11, -3, 6, 3.2, -0.12, 0, Math.PI * 2);
  ctx.ellipse(10 - legSwing * 11, -3, 6, 3.2, 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(193,190,165,.42)"; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-13 + legSwing * 11, -4); ctx.lineTo(-7 + legSwing * 11, -4);
  ctx.moveTo(6 - legSwing * 11, -4); ctx.lineTo(12 - legSwing * 11, -4); ctx.stroke();

  // Dark shorts, waistband and tiny brass fastening.
  ctx.fillStyle = "#34343a";
  ctx.beginPath(); ctx.moveTo(-8, -24); ctx.lineTo(8, -24); ctx.lineTo(10, -15);
  ctx.quadraticCurveTo(2, -12, -1, -15); ctx.quadraticCurveTo(-5, -12, -10, -15);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(212,186,139,.45)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-8, -22); ctx.lineTo(8, -22); ctx.stroke();
  ctx.fillStyle = "#ddc78f"; ctx.beginPath(); ctx.arc(0, -22, 1.2, 0, Math.PI * 2); ctx.fill();

  // Left arm swings to counterbalance her stride.
  const armSwing = running ? stride * 4 : airborne ? (rising ? 3 : -2) : 0;
  ctx.strokeStyle = "#b77e62"; ctx.lineWidth = 4; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-6, -39);
  ctx.quadraticCurveTo(-13, -32 + armSwing, -12, -25 + armSwing); ctx.stroke();
  ctx.strokeStyle = "#e5b18b"; ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.moveTo(-11, -29 + armSwing); ctx.lineTo(-12, -25 + armSwing); ctx.stroke();

  // Bright orange tee, shaped sleeves, rolled cuffs, collar and fabric folds.
  const shirt = ctx.createLinearGradient(-10, -43, 12, -23);
  shirt.addColorStop(0, "#f3a45e"); shirt.addColorStop(0.37, "#df7c42"); shirt.addColorStop(1, "#a94c35");
  ctx.fillStyle = shirt;
  ctx.beginPath(); ctx.moveTo(-7, -42); ctx.quadraticCurveTo(0, -45, 8, -41);
  ctx.lineTo(11, -34); ctx.lineTo(8, -31); ctx.lineTo(10, -23);
  ctx.quadraticCurveTo(0, -20, -10, -23); ctx.lineTo(-8, -32);
  ctx.lineTo(-12, -34); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#bd603a";
  ctx.beginPath(); ctx.moveTo(-8, -40); ctx.lineTo(-14, -36); ctx.lineTo(-11, -31); ctx.lineTo(-6, -34); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(7, -40); ctx.lineTo(13, -36); ctx.lineTo(10, -31); ctx.lineTo(5, -34); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(255,202,133,.7)"; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-9, -39); ctx.lineTo(-12, -36); ctx.moveTo(8, -39); ctx.lineTo(11, -36); ctx.stroke();
  ctx.strokeStyle = "rgba(255,194,122,.65)"; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-2, -36); ctx.quadraticCurveTo(-4, -31, -2, -27);
  ctx.moveTo(4, -34); ctx.lineTo(5, -30);
  ctx.moveTo(-7, -25); ctx.quadraticCurveTo(0, -23, 7, -25); ctx.stroke();
  ctx.fillStyle = "#f0d5a9";
  ctx.beginPath(); ctx.ellipse(0, -41, 3.5, 1.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,218,166,.48)";
  ctx.beginPath(); ctx.ellipse(-3, -37, 1.1, 4, -0.1, 0, Math.PI * 2); ctx.fill();

  // Face, warm cheek and bright eyes below a softly lit dark bob.
  const skin = ctx.createLinearGradient(-7, -62, 9, -43);
  skin.addColorStop(0, "#f4c79c"); skin.addColorStop(0.64, "#dca986"); skin.addColorStop(1, "#b97864");
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.ellipse(1, -53, 9.5, 11, -0.08, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(199,113,103,.65)";
  ctx.beginPath(); ctx.ellipse(8, -51, 2, 1.15, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#211b20";
  ctx.beginPath();
  ctx.ellipse(5.7, -54, 1.05, 1.8, -0.15, 0, Math.PI * 2);
  ctx.ellipse(1.4, -55, 0.7, 1.25, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#fff0ce";
  ctx.beginPath(); ctx.arc(6.1, -54.7, 0.45, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#633b36"; ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.moveTo(5, -57); ctx.quadraticCurveTo(6, -58, 7, -57); ctx.stroke();
  ctx.strokeStyle = "#a96959"; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(4, -47); ctx.quadraticCurveTo(6, -46, 8, -47); ctx.stroke();

  const hair = ctx.createLinearGradient(-15, -72, 10, -39);
  hair.addColorStop(0, "#151820"); hair.addColorStop(0.45, "#34333b"); hair.addColorStop(1, "#11151c");
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.moveTo(-8, -54); ctx.quadraticCurveTo(-16, -68, -3, -72);
  ctx.quadraticCurveTo(11, -75, 12, -61); ctx.quadraticCurveTo(15, -53, 12, -43);
  ctx.quadraticCurveTo(9, -40, 7, -47); ctx.lineTo(4, -53);
  ctx.quadraticCurveTo(0, -48, -4, -49); ctx.quadraticCurveTo(-7, -44, -11, -45);
  ctx.quadraticCurveTo(-14, -49, -8, -54); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(159,158,164,.48)"; ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-9, -67); ctx.quadraticCurveTo(-4, -70, 2, -68);
  ctx.moveTo(-10, -54); ctx.quadraticCurveTo(-12, -50, -10, -47);
  ctx.moveTo(10, -61); ctx.quadraticCurveTo(14, -53, 10, -46); ctx.stroke();

  // Oversized black side bow, with folded fabric loops and two narrow tails.
  ctx.fillStyle = "#11131a";
  ctx.beginPath();
  ctx.moveTo(-8, -62); ctx.quadraticCurveTo(-25, -82, -30, -68);
  ctx.quadraticCurveTo(-28, -57, -10, -57); ctx.quadraticCurveTo(-4, -80, 8, -75);
  ctx.quadraticCurveTo(16, -67, -5, -58); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#22232b";
  ctx.beginPath();
  ctx.moveTo(-9, -60); ctx.quadraticCurveTo(-22, -76, -26, -69);
  ctx.quadraticCurveTo(-22, -64, -9, -60); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-4, -61); ctx.quadraticCurveTo(6, -74, 9, -72);
  ctx.quadraticCurveTo(7, -66, -4, -61); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#151820";
  ctx.beginPath();
  ctx.moveTo(-12, -60); ctx.quadraticCurveTo(-16, -53, -14, -47);
  ctx.quadraticCurveTo(-11, -50, -9, -58); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(151,125,132,.55)"; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-11, -63); ctx.quadraticCurveTo(-23, -77, -27, -69);
  ctx.moveTo(-5, -63); ctx.quadraticCurveTo(4, -74, 9, -72); ctx.stroke();
  ctx.fillStyle = "#37303a";
  ctx.beginPath(); ctx.ellipse(-7, -62, 3.2, 2.8, -0.2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "rgba(215,182,161,.65)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-8, -63); ctx.lineTo(-6, -61); ctx.stroke();

  // Sword arm reaches forward on a cut; the blade is a long, bright nail shape.
  const handY = attack ? -29 + Math.sin(slash * Math.PI) * 2 : -29;
  ctx.strokeStyle = "#bd8568"; ctx.lineWidth = 4; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(5, -38); ctx.quadraticCurveTo(11, -35, 13, handY); ctx.stroke();
  ctx.fillStyle = "#e7b48d"; ctx.beginPath(); ctx.arc(13, handY, 2.4, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.translate(13, handY);
  ctx.rotate(attack ? -0.9 + slash * 1.45 : -0.23);
  const bladeLength = attack ? 49 : 29;
  ctx.strokeStyle = "#4a2d27"; ctx.lineWidth = 5; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(8, 0); ctx.stroke();
  ctx.strokeStyle = "#c58e5f"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-4, -2); ctx.lineTo(6, -2); ctx.stroke();
  const steel = ctx.createLinearGradient(6, -3, bladeLength, 3);
  steel.addColorStop(0, "#afb4aa"); steel.addColorStop(0.48, "#f1ebd2"); steel.addColorStop(1, "#7f8b89");
  ctx.fillStyle = steel;
  ctx.beginPath(); ctx.moveTo(5, -3); ctx.lineTo(bladeLength - 8, -2.4);
  ctx.lineTo(bladeLength, 0); ctx.lineTo(bladeLength - 8, 2.4);
  ctx.lineTo(5, 3); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(255,255,224,.82)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(9, -1.4); ctx.lineTo(bladeLength - 8, -1); ctx.stroke();
  ctx.restore();

  if (attack) {
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(211,235,208,${0.8 - slash * 0.38})`;
    ctx.lineWidth = 3; ctx.shadowColor = "#c1e9d1"; ctx.shadowBlur = 13;
    ctx.beginPath(); ctx.arc(15, -31, 33, -0.98, 0.83); ctx.stroke();
    ctx.strokeStyle = "rgba(250,221,168,.62)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(15, -31, 39, -0.78, 0.61); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function drawCreature(ctx: CanvasRenderingContext2D, state: GameState, time: number) {
  const e = state.enemy;
  const gait = e.mood === "stalk" ? Math.sin(time * 8) : 0;
  const bob = e.mood === "stalk" ? Math.sin(time * 4.4) * 2 : e.mood === "windup" ? -2 : 1;
  const dead = e.mood === "dead";
  ctx.save();
  ctx.translate(e.x + e.width / 2, e.y + e.height);
  ctx.scale(e.facing, 1);
  if (dead) { ctx.rotate(-0.28); ctx.globalAlpha = 0.52; }
  else if (e.mood === "windup") { ctx.rotate(0.12); ctx.translate(3, -1); }
  else if (e.mood === "recover") ctx.scale(1.04, 0.92);

  // Fine feelers trail behind its shell and tremble while it stalks.
  ctx.save(); ctx.translate(-3, -35 + bob);
  for (let tendril = 0; tendril < 2; tendril++) {
    const wave = Math.sin(time * 4 + tendril * 2) * 4;
    ctx.strokeStyle = "#182023"; ctx.lineWidth = 4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-15, 6 + tendril * 5);
    ctx.bezierCurveTo(-27, -3 + wave, -32, 5 - wave, -39 - tendril * 3, -5 + wave); ctx.stroke();
    ctx.strokeStyle = "rgba(143,182,147,.55)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-19, 4 + tendril * 4);
    ctx.quadraticCurveTo(-29, wave, -37, -4 + wave); ctx.stroke();
  }
  ctx.restore();

  // Four jointed legs give the creature a skittering, insect-like gait.
  ctx.strokeStyle = "#141c20"; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.lineJoin = "round";
  for (let leg = 0; leg < 4; leg++) {
    const side = leg < 2 ? -1 : 1;
    const pair = leg % 2;
    const phase = gait * (pair === 0 ? 1 : -1) * (side === 1 ? 1 : 0.75);
    const hipX = (pair === 0 ? -9 : 8) + side * 1.2;
    const kneeX = hipX + phase * 5 + side * 3;
    const toeX = kneeX + phase * 4 + side * 4;
    ctx.beginPath(); ctx.moveTo(hipX, -18 + bob);
    ctx.quadraticCurveTo(kneeX - side * 2, -9 + phase * 2, kneeX, -5);
    ctx.quadraticCurveTo(toeX + 3, -1, toeX + 6, 0); ctx.stroke();
    ctx.strokeStyle = "rgba(159,180,146,.42)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(hipX, -17 + bob); ctx.lineTo(kneeX, -6); ctx.stroke();
    ctx.strokeStyle = "#141c20"; ctx.lineWidth = 5;
  }

  // Ribbed carapace with a cold slate-to-moss gradient.
  const shell = ctx.createLinearGradient(-25, -50 + bob, 23, -8);
  shell.addColorStop(0, e.hurtTimer > 0 ? "#d2a18a" : "#637669");
  shell.addColorStop(0.27, e.hurtTimer > 0 ? "#926b67" : "#3c5147");
  shell.addColorStop(0.7, e.hurtTimer > 0 ? "#59494b" : "#202f31");
  shell.addColorStop(1, "#121a20");
  ctx.fillStyle = shell;
  ctx.beginPath(); ctx.moveTo(-25, -15 + bob);
  ctx.quadraticCurveTo(-29, -35 + bob, -13, -43 + bob);
  ctx.quadraticCurveTo(0, -52 + bob, 12, -42 + bob);
  ctx.quadraticCurveTo(25, -36 + bob, 25, -22 + bob);
  ctx.quadraticCurveTo(22, -9, 6, -8); ctx.quadraticCurveTo(-14, -7, -25, -15 + bob);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(171,196,157,.46)"; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(-20, -29 + bob);
  ctx.quadraticCurveTo(-15, -48 + bob, -1, -47 + bob);
  ctx.quadraticCurveTo(12, -45 + bob, 18, -34 + bob); ctx.stroke();

  // Four overlapping shell plates and pale growth marks.
  for (let plate = 0; plate < 4; plate++) {
    const px = -15 + plate * 9;
    const py = -33 - Math.sin((plate / 3) * Math.PI) * 4 + bob;
    ctx.fillStyle = plate % 2 === 0 ? "rgba(155,181,141,.22)" : "rgba(9,18,23,.3)";
    ctx.beginPath(); ctx.ellipse(px, py, 6.8, 10, -0.22 + plate * 0.1, Math.PI, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(185,202,157,.29)"; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(px, py + 2, 5, Math.PI * 1.05, Math.PI * 1.85); ctx.stroke();
  }
  ctx.fillStyle = "rgba(199,211,162,.3)";
  for (let mark = 0; mark < 5; mark++) {
    const mx = -16 + mark * 8;
    const my = -39 + (mark % 2) * 6 + bob;
    ctx.beginPath(); ctx.ellipse(mx, my, 1.3, 2.6, -0.4, 0, Math.PI * 2); ctx.fill();
  }

  // Mantled head, branching horns, and two warm eyes.
  const head = ctx.createLinearGradient(8, -50 + bob, 35, -23);
  head.addColorStop(0, "#526756"); head.addColorStop(0.62, "#2b3e3c"); head.addColorStop(1, "#172326");
  ctx.fillStyle = head;
  ctx.beginPath(); ctx.moveTo(8, -35 + bob);
  ctx.quadraticCurveTo(10, -51 + bob, 25, -48 + bob);
  ctx.quadraticCurveTo(38, -42 + bob, 34, -28 + bob);
  ctx.quadraticCurveTo(28, -19, 15, -24); ctx.quadraticCurveTo(7, -26, 8, -35 + bob); ctx.fill();
  ctx.fillStyle = "#182226";
  ctx.beginPath(); ctx.moveTo(17, -44 + bob);
  ctx.quadraticCurveTo(11, -58 + bob, 20, -54 + bob); ctx.lineTo(25, -45 + bob); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(27, -43 + bob);
  ctx.quadraticCurveTo(37, -55 + bob, 34, -42 + bob); ctx.lineTo(31, -38 + bob); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(185,199,157,.4)"; ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.moveTo(15, -42 + bob);
  ctx.quadraticCurveTo(28, -46 + bob, 32, -36 + bob); ctx.stroke();

  ctx.save();
  ctx.shadowColor = "#f2ac67"; ctx.shadowBlur = e.mood === "windup" ? 19 : 10;
  ctx.fillStyle = e.mood === "windup" ? "#ffd08b" : "#df9a61";
  ctx.beginPath(); ctx.ellipse(29, -36 + bob, 3.3, 2.2, -0.15, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#fff0c3"; ctx.beginPath(); ctx.arc(30, -36.5 + bob, 0.8, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Split mandible, throat seam, and needle spines along its back.
  ctx.strokeStyle = "rgba(204,186,145,.68)"; ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(26, -27 + bob); ctx.quadraticCurveTo(31, -24 + bob, 35, -27 + bob);
  ctx.moveTo(30, -27 + bob); ctx.lineTo(29, -23 + bob); ctx.lineTo(33, -22 + bob); ctx.stroke();
  ctx.strokeStyle = "rgba(198,150,97,.62)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(17, -24 + bob);
  ctx.quadraticCurveTo(23, -20 + bob, 29, -23 + bob); ctx.stroke();
  for (let spine = 0; spine < 5; spine++) {
    const sx = -18 + spine * 8;
    const sy = -40 + Math.abs(2 - spine) * 2 + bob;
    ctx.fillStyle = spine % 2 ? "#294039" : "#3d5647";
    ctx.beginPath(); ctx.moveTo(sx - 2, sy + 5);
    ctx.quadraticCurveTo(sx - 4, sy - 8, sx + 1, sy - 12);
    ctx.quadraticCurveTo(sx + 3, sy - 4, sx + 3, sy + 5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(197,215,157,.54)";
    ctx.beginPath(); ctx.arc(sx + 1, sy - 10, 1, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

export function drawPaintedWorld(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  width: number,
  height: number,
  scale: number,
) {
  const { cameraX, cameraY, player, enemy, elapsed } = state;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  drawBackdrop(ctx, width, height, cameraX, elapsed);

  ctx.save();
  ctx.setTransform(scale, 0, 0, scale, -cameraX * scale, -cameraY * scale);
  const deepFloor = ctx.createLinearGradient(0, FLOOR_Y, 0, WORLD_HEIGHT);
  deepFloor.addColorStop(0, "#1b2729"); deepFloor.addColorStop(1, "#10191e");
  ctx.fillStyle = deepFloor;
  ctx.fillRect(cameraX, FLOOR_Y, width, WORLD_HEIGHT - FLOOR_Y);

  // Quiet columns, fallen blocks and a second silhouette of the ruined nave.
  drawRuins(ctx, cameraX, width);
  for (const platform of PLATFORMS) drawPlatform(ctx, platform.x, platform.y, platform.width, platform.height);
  for (const [x, y, plantScale] of PLANTS) drawPlant(ctx, x, y, plantScale, elapsed);
  for (const [x, y, mushroomScale] of MUSHROOMS) drawMushroom(ctx, x, y, mushroomScale, elapsed);

  // Bioluminescent dust rises and falls slowly in the shafts of light.
  for (const mote of MOTES) {
    const x = mote.x + Math.sin(elapsed * 0.24 + mote.phase) * 9;
    const y = mote.y + Math.sin(elapsed * 0.62 + mote.phase) * 6;
    const alpha = 0.15 + 0.16 * (0.5 + 0.5 * Math.sin(elapsed + mote.phase));
    ctx.fillStyle = mote.amber
      ? `rgba(228,184,125,${alpha})`
      : `rgba(211,228,193,${alpha})`;
    ctx.beginPath(); ctx.arc(x, y, mote.radius, 0, Math.PI * 2); ctx.fill();
  }

  // Separate ground pools give nearby stone a soft reflected mushroom light.
  for (const [x, y, mushroomScale] of MUSHROOMS) {
    const amber = Math.floor(x / 127) % 4 === 1;
    const pool = ctx.createRadialGradient(x, y - 2, 1, x, y - 2, 76 * mushroomScale);
    pool.addColorStop(0, amber ? "rgba(225,166,113,.1)" : "rgba(125,207,168,.09)");
    pool.addColorStop(1, "rgba(118,179,150,0)");
    ctx.fillStyle = pool;
    ctx.beginPath(); ctx.ellipse(x, y - 2, 76 * mushroomScale, 35 * mushroomScale, 0, 0, Math.PI * 2); ctx.fill();
  }

  // Low, translucent fog winds between the stones and never obscures the sprites.
  const floorFog = ctx.createLinearGradient(cameraX, FLOOR_Y - 76, cameraX, FLOOR_Y + 22);
  floorFog.addColorStop(0, "rgba(128,164,150,0)");
  floorFog.addColorStop(0.55, "rgba(119,159,145,.075)");
  floorFog.addColorStop(1, "rgba(103,145,134,0)");
  ctx.fillStyle = floorFog;
  ctx.fillRect(cameraX, FLOOR_Y - 76 + Math.sin(elapsed * 0.3) * 4, width, 98);

  if (enemy.hp > 0 || enemy.mood === "dead") drawCreature(ctx, state, elapsed);
  drawHero(ctx, state, elapsed);

  // Vignette and warm, fading glow follow the camera without flattening the art.
  const vignette = ctx.createRadialGradient(
    cameraX + width / 2, cameraY + height / 2, height * 0.2,
    cameraX + width / 2, cameraY + height / 2, width * 0.75,
  );
  vignette.addColorStop(0.54, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(3,7,12,.5)");
  ctx.fillStyle = vignette;
  ctx.fillRect(cameraX, cameraY, width, height);
  ctx.restore();
}

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import {
  advanceVillageDialogue,
  createGameState,
  startGame,
  resetGame,
  updateGame,
  PLATFORMS,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  FLOOR_Y,
  type GameInput,
  type GameState,
} from './engine';
import { drawPaintedWorld } from './paint';

type Controls = { left: boolean; right: boolean; jump: boolean };
const VILLAGE_DIALOGUE = [
  { speaker: 'Ева', initial: 'Е', text: 'Лиза, ты обещала показать мне тайную тропинку!' },
  { speaker: 'Лиза', initial: 'Л', text: 'Помню. Только далеко не уходи, хорошо?' },
  { speaker: 'Ева', initial: 'Е', text: 'Обещаю!' },
] as const;

function makeHud(state: GameState) {
  return {
    phase: state.phase,
    hp: state.player.hp,
    maxHp: state.player.maxHp,
    enemyHp: state.enemy.hp,
    enemyMaxHp: state.enemy.maxHp,
    location: state.location,
    dialogueLine: state.dialogueLine,
  };
}

const MUSHROOMS = [
  [84, 514, 1], [259, 509, .7], [375, 431, .8], [525, 515, .8],
  [654, 355, .75], [822, 512, 1.1], [942, 424, .7], [1118, 512, .9],
  [1248, 348, .75], [1420, 513, .8], [1550, 418, .8], [1750, 513, 1],
  [1870, 348, .7], [2065, 513, 1], [2188, 432, .7], [2340, 513, .85],
] as const;
const PLANTS = [
  [178, 540, .85], [300, 540, .55], [471, 438, .62], [786, 540, .9],
  [1050, 430, .72], [1158, 540, .7], [1390, 540, .95], [1678, 424, .58],
  [1770, 540, .65], [2024, 540, .88], [2290, 540, .74],
] as const;
const DUST = Array.from({ length: 78 }, (_, i) => ({
  x: (i * 137 + 31) % WORLD_WIDTH,
  y: 36 + ((i * 83 + 17) % 478),
  r: .7 + (i % 4) * .42,
  phase: i * 1.71,
}));

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function drawBackdrop(ctx: CanvasRenderingContext2D, width: number, height: number, cameraX: number, time: number) {
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, '#090f19'); bg.addColorStop(.3, '#111c26'); bg.addColorStop(.72, '#1d292b'); bg.addColorStop(1, '#293331');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height);
  const moonwash = ctx.createRadialGradient(width * .68, height * .28, 4, width * .68, height * .28, width * .56);
  moonwash.addColorStop(0, 'rgba(111,165,151,.14)');
  moonwash.addColorStop(.48, 'rgba(57,105,104,.07)');
  moonwash.addColorStop(1, 'rgba(20,39,47,0)');
  ctx.fillStyle = moonwash; ctx.fillRect(0, 0, width, height);

  // A distant cathedral vault, carved into the cave wall in two parallax planes.
  for (const layer of [
    { speed: .1, period: 430, color: '#101b25', alpha: .7, lift: 0 },
    { speed: .18, period: 330, color: '#142128', alpha: .7, lift: 34 },
  ]) {
    const shift = cameraX * layer.speed;
    const first = Math.floor(shift / layer.period) - 1;
    const last = Math.ceil((shift + width) / layer.period) + 1;
    ctx.save(); ctx.globalAlpha = layer.alpha;
    for (let i = first; i <= last; i++) {
      const x = i * layer.period - shift;
      const rise = 76 + ((i * 41 % 70) + 70) % 70;
      ctx.fillStyle = layer.color;
      ctx.beginPath();
      ctx.moveTo(x - 100, height * .78);
      ctx.lineTo(x - 20, height * .35);
      ctx.quadraticCurveTo(x + 76, layer.lift + rise - 16, x + 151, height * .3);
      ctx.quadraticCurveTo(x + 245, layer.lift + rise - 7, x + 334, height * .78);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(137,170,153,.11)'; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + 2, height * .7);
      ctx.lineTo(x + 45, height * .39);
      ctx.quadraticCurveTo(x + 143, layer.lift + rise + 10, x + 193, height * .37);
      ctx.lineTo(x + 274, height * .7);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(8,14,21,.5)'; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(x + 4, height * .76); ctx.lineTo(x + 48, height * .4); ctx.stroke();
    }
    ctx.restore();
  }

  // Jagged ceiling teeth and broken mineral seams.
  const ceilingShift = cameraX * .24;
  const firstTooth = Math.floor(ceilingShift / 152) - 1;
  const lastTooth = Math.ceil((ceilingShift + width) / 152) + 1;
  for (let i = firstTooth; i <= lastTooth; i++) {
    const x = i * 152 - ceilingShift;
    const tooth = 24 + ((i * 29 % 61) + 61) % 61;
    const grad = ctx.createLinearGradient(x, 0, x + 35, tooth);
    grad.addColorStop(0, '#0b111a'); grad.addColorStop(1, '#1b272b');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.moveTo(x - 22, 0); ctx.lineTo(x + 43, 0);
    ctx.lineTo(x + 34, tooth); ctx.lineTo(x + 25, tooth - 12);
    ctx.lineTo(x + 16, tooth + 3); ctx.lineTo(x + 7, tooth - 5); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(142,164,150,.1)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x + 7, 2); ctx.lineTo(x + 25, tooth - 10); ctx.stroke();
  }

  // Thin drifting mist at several depths; all movement is deterministic.
  for (let band = 0; band < 3; band++) {
    const y = height * (.69 + band * .075);
    const fog = ctx.createLinearGradient(0, y - 34, 0, y + 60);
    fog.addColorStop(0, 'rgba(137,177,157,0)');
    fog.addColorStop(.5, `rgba(119,160,143,${.035 + band * .012})`);
    fog.addColorStop(1, 'rgba(83,123,113,0)');
    ctx.fillStyle = fog;
    ctx.save();
    ctx.translate(Math.sin(time * (.12 + band * .035) + band) * 34 - (cameraX * .035) % 100, 0);
    ctx.fillRect(-40, y - 34, width + 100, 94);
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
    const stone = ctx.createLinearGradient(x - 28, crownY, x + 218, FLOOR_Y);
    stone.addColorStop(0, '#354346'); stone.addColorStop(.45, '#263439'); stone.addColorStop(1, '#19242b');

    // Deep arch ring, with an open centre cut from the stone.
    ctx.fillStyle = stone;
    ctx.beginPath();
    ctx.moveTo(x - 22, FLOOR_Y + 3); ctx.lineTo(x - 22, crownY + 88);
    ctx.quadraticCurveTo(x + 7, crownY + 8, x + 92, crownY);
    ctx.quadraticCurveTo(x + 178, crownY + 9, x + 207, crownY + 88);
    ctx.lineTo(x + 207, FLOOR_Y + 3); ctx.closePath();
    ctx.moveTo(x + 18, FLOOR_Y + 3); ctx.lineTo(x + 18, crownY + 96);
    ctx.quadraticCurveTo(x + 38, crownY + 43, x + 92, crownY + 37);
    ctx.quadraticCurveTo(x + 147, crownY + 43, x + 167, crownY + 96);
    ctx.lineTo(x + 167, FLOOR_Y + 3); ctx.closePath();
    ctx.fill('evenodd');

    ctx.strokeStyle = 'rgba(140,166,153,.24)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x - 17, FLOOR_Y - 3); ctx.lineTo(x - 17, crownY + 87);
    ctx.quadraticCurveTo(x + 9, crownY + 15, x + 92, crownY + 6);
    ctx.quadraticCurveTo(x + 174, crownY + 15, x + 202, crownY + 87);
    ctx.lineTo(x + 202, FLOOR_Y - 3); ctx.stroke();
    ctx.strokeStyle = 'rgba(6,12,18,.5)'; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(x + 8, FLOOR_Y); ctx.lineTo(x + 8, crownY + 93);
    ctx.quadraticCurveTo(x + 27, crownY + 47, x + 91, crownY + 39);
    ctx.stroke();

    // Fluted pillars, stacked capitals and worn block joints.
    for (const side of [x - 23, x + 181]) {
      const column = ctx.createLinearGradient(side, 0, side + 28, 0);
      column.addColorStop(0, '#202d32'); column.addColorStop(.28, '#45504c');
      column.addColorStop(.52, '#303d3e'); column.addColorStop(1, '#1b282d');
      ctx.fillStyle = column; ctx.fillRect(side, crownY + 78, 27, FLOOR_Y - crownY - 78);
      ctx.fillStyle = '#53605a'; ctx.fillRect(side - 6, crownY + 74, 39, 10);
      ctx.fillStyle = '#293639'; ctx.fillRect(side - 9, FLOOR_Y - 15, 45, 16);
      ctx.fillStyle = 'rgba(185,191,160,.15)'; ctx.fillRect(side + 4, crownY + 96, 2, FLOOR_Y - crownY - 125);
      for (let y = crownY + 132; y < FLOOR_Y - 22; y += 68) {
        ctx.strokeStyle = 'rgba(10,18,22,.54)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(side + 1, y); ctx.lineTo(side + 26, y + 2); ctx.stroke();
        ctx.strokeStyle = 'rgba(164,175,151,.09)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(side + 3, y + 3); ctx.lineTo(side + 24, y + 5); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(177,190,164,.16)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(side + 13, crownY + 116);
      ctx.bezierCurveTo(side + 4, crownY + 136, side + 23, crownY + 145, side + 13, crownY + 164);
      ctx.moveTo(side + 13, crownY + 132); ctx.quadraticCurveTo(side + 4, crownY + 124, side + 5, crownY + 118);
      ctx.moveTo(side + 14, crownY + 145); ctx.quadraticCurveTo(side + 23, crownY + 137, side + 22, crownY + 131);
      ctx.stroke();
    }

    ctx.fillStyle = '#34413e';
    ctx.beginPath(); ctx.moveTo(x + 42, FLOOR_Y - 14); ctx.lineTo(x + 58, FLOOR_Y - 21);
    ctx.lineTo(x + 76, FLOOR_Y - 12); ctx.lineTo(x + 69, FLOOR_Y - 3); ctx.lineTo(x + 39, FLOOR_Y - 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(168,190,154,.11)';
    ctx.beginPath(); ctx.moveTo(x + 54, FLOOR_Y - 18); ctx.lineTo(x + 67, FLOOR_Y - 13); ctx.lineTo(x + 61, FLOOR_Y - 9); ctx.closePath(); ctx.fill();
  }
}

function drawMushroom(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, time: number) {
  const pulse = .78 + .22 * Math.sin(time * 2.3 + x * .03);
  const amber = Math.floor(x / 127) % 4 === 1;
  const glowColor = amber ? '235,166,105' : '134,211,174';
  const capLight = amber ? '#e4b281' : '#b5dec0';
  const capShade = amber ? '#785a55' : '#527e73';
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  const glow = ctx.createRadialGradient(0, -17, 1, 0, -17, 54);
  glow.addColorStop(0, `rgba(${glowColor},${.25 * pulse})`);
  glow.addColorStop(.38, `rgba(${glowColor},${.1 * pulse})`);
  glow.addColorStop(1, `rgba(${glowColor},0)`);
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, -17, 54, 0, Math.PI * 2); ctx.fill();

  const stem = ctx.createLinearGradient(-5, -5, 6, -5);
  stem.addColorStop(0, '#677c70'); stem.addColorStop(.48, '#d3d0ad'); stem.addColorStop(1, '#7e9b83');
  ctx.fillStyle = stem;
  ctx.beginPath(); ctx.moveTo(-3, -8); ctx.quadraticCurveTo(-5, -17, -3, -29);
  ctx.quadraticCurveTo(0, -33, 3, -28); ctx.lineTo(5, -8); ctx.quadraticCurveTo(1, -5, -3, -8); ctx.fill();
  ctx.strokeStyle = 'rgba(236,233,199,.45)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-1, -12); ctx.quadraticCurveTo(-2, -21, 0, -27); ctx.stroke();

  const cap = ctx.createLinearGradient(0, -39, 0, -14);
  cap.addColorStop(0, capLight); cap.addColorStop(.35, capShade); cap.addColorStop(1, '#344e4b');
  ctx.fillStyle = cap;
  ctx.beginPath(); ctx.moveTo(-21, -26);
  ctx.bezierCurveTo(-18, -39, -7, -43, 1, -42);
  ctx.bezierCurveTo(12, -42, 21, -35, 22, -26);
  ctx.quadraticCurveTo(11, -19, 0, -21);
  ctx.quadraticCurveTo(-13, -19, -21, -26); ctx.fill();
  ctx.strokeStyle = 'rgba(225,228,192,.68)'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(-19, -26); ctx.quadraticCurveTo(0, -20, 20, -26); ctx.stroke();
  ctx.strokeStyle = 'rgba(230,228,192,.33)'; ctx.lineWidth = 1;
  for (let gill = -12; gill <= 12; gill += 6) {
    ctx.beginPath(); ctx.moveTo(gill, -23); ctx.quadraticCurveTo(gill * .7, -17, gill * .65, -13); ctx.stroke();
  }

  ctx.fillStyle = 'rgba(244,230,183,.84)';
  ctx.beginPath(); ctx.ellipse(-9, -31, 2.5, 1.4, -.3, 0, Math.PI * 2);
  ctx.ellipse(2, -36, 1.6, 1.2, .2, 0, Math.PI * 2);
  ctx.ellipse(12, -29, 2, 1.2, .4, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = .58 + .32 * pulse;
  ctx.fillStyle = '#eff1d4'; ctx.beginPath(); ctx.arc(-1, -27, 1.4, 0, Math.PI * 2); ctx.fill();

  for (const [dx, factor] of [[-18, .49], [19, .38]] as const) {
    ctx.save(); ctx.translate(dx, -4); ctx.scale(factor, factor);
    ctx.fillStyle = '#a9c4a7';
    ctx.beginPath(); ctx.moveTo(-10, -12); ctx.quadraticCurveTo(-8, -22, 0, -21);
    ctx.quadraticCurveTo(9, -20, 11, -12); ctx.quadraticCurveTo(0, -8, -10, -12); ctx.fill();
    ctx.fillStyle = '#869b83'; roundedRect(ctx, -2, -12, 4, 12, 2); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawPlant(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, time: number) {
  const sway = Math.sin(time * 1.7 + x * .021) * 2.1;
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  ctx.strokeStyle = '#7b9a80'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  for (let leaf = 0; leaf < 4; leaf++) {
    const side = leaf % 2 === 0 ? -1 : 1;
    const rise = 13 + leaf * 5;
    const lean = side * (8 + leaf * 2) + sway;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(lean * .25, -rise * .55, lean, -rise); ctx.stroke();
    ctx.fillStyle = leaf % 2 === 0 ? '#607f6b' : '#8da984';
    ctx.beginPath(); ctx.moveTo(lean * .35, -rise * .56);
    ctx.quadraticCurveTo(lean + side * 10, -rise * .92, lean, -rise);
    ctx.quadraticCurveTo(lean - side * 7, -rise * .83, lean * .35, -rise * .56); ctx.fill();
    ctx.strokeStyle = 'rgba(205,218,170,.35)'; ctx.lineWidth = .8;
    ctx.beginPath(); ctx.moveTo(lean * .45, -rise * .62); ctx.lineTo(lean, -rise); ctx.stroke();
    ctx.strokeStyle = '#7b9a80'; ctx.lineWidth = 2;
  }
  const seed = ctx.createRadialGradient(sway, -34, 0, sway, -34, 12);
  seed.addColorStop(0, 'rgba(219,203,139,.7)'); seed.addColorStop(1, 'rgba(189,194,130,0)');
  ctx.fillStyle = seed; ctx.beginPath(); ctx.arc(sway, -34, 12, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#dbcf99'; ctx.beginPath(); ctx.arc(sway, -34, 2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawPlatform(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const floor = y >= FLOOR_Y;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  const face = ctx.createLinearGradient(x, y, x, y + Math.max(h, 1));
  face.addColorStop(0, floor ? '#657165' : '#7f8778');
  face.addColorStop(.1, floor ? '#414b46' : '#525b51');
  face.addColorStop(.55, floor ? '#303c3b' : '#394443');
  face.addColorStop(1, '#202b30');
  ctx.fillStyle = face; ctx.fillRect(x, y, w, h);

  // Worn, irregular limestone lip and cool moonlit edge.
  ctx.fillStyle = floor ? '#718071' : '#929584';
  ctx.beginPath(); ctx.moveTo(x - 3, y + 2); ctx.lineTo(x + 11, y);
  for (let px = x + 11; px < x + w; px += 42) {
    const nick = ((Math.floor(px / 13) * 11) % 5) - 2;
    ctx.lineTo(Math.min(px + 23, x + w), y + nick);
    ctx.lineTo(Math.min(px + 41, x + w), y + ((nick + 1) % 3));
  }
  ctx.lineTo(x + w + 3, y + 6); ctx.lineTo(x + w, y + 8); ctx.lineTo(x, y + 8); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(206,212,181,.5)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x, y + 1); ctx.lineTo(x + w, y + 1); ctx.stroke();

  // Ashlar blocks, chipped corners, mortar, and hairline fractures.
  const blockWidth = floor ? 104 : 64;
  const top = y + (floor ? 26 : 9);
  for (let bx = x + 1, row = 0; bx < x + w; bx += blockWidth, row++) {
    const offset = row % 2 === 0 ? 0 : blockWidth * .44;
    const left = bx + offset;
    const shade = .035 + (((Math.floor(bx / 17) * 7) % 6) * .009);
    ctx.fillStyle = `rgba(176,185,157,${shade})`;
    ctx.fillRect(left + 3, top + 3, blockWidth * .62, floor ? 22 : Math.max(5, h - 12));
    ctx.strokeStyle = 'rgba(12,20,23,.47)'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(left, top); ctx.lineTo(left, Math.min(y + h, top + (floor ? 27 : h)));
    if (left + blockWidth < x + w) {
      ctx.moveTo(left + blockWidth, y + (floor ? 2 : 1));
      ctx.lineTo(left + blockWidth, Math.min(y + h, y + (floor ? 24 : h)));
    }
    ctx.stroke();
    if (floor && row % 2 === 1) {
      ctx.beginPath(); ctx.moveTo(left + 15, top + 26); ctx.lineTo(left + blockWidth - 10, top + 26); ctx.stroke();
    }
    const crackX = left + 17 + ((row * 19) % 27);
    ctx.strokeStyle = 'rgba(13,21,22,.52)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(crackX, top + 4); ctx.lineTo(crackX - 4, top + 10);
    ctx.lineTo(crackX + 2, top + 14); ctx.lineTo(crackX - 1, top + 20); ctx.stroke();
    ctx.strokeStyle = 'rgba(177,188,160,.13)'; ctx.lineWidth = .8;
    ctx.beginPath(); ctx.moveTo(left + 8, top + 5); ctx.lineTo(left + 26, top + 5); ctx.stroke();
  }

  if (!floor) {
    ctx.fillStyle = 'rgba(130,167,126,.62)';
    for (let tuft = x + 12; tuft < x + w - 12; tuft += 71) {
      const length = 5 + (Math.floor(tuft / 11) % 6);
      ctx.beginPath(); ctx.moveTo(tuft, y + 2);
      ctx.quadraticCurveTo(tuft + 4, y - length, tuft + 7, y + 1);
      ctx.quadraticCurveTo(tuft + 12, y - length * .45, tuft + 15, y + 2);
      ctx.closePath(); ctx.fill();
    }
  }
  if (floor) {
    const damp = ctx.createLinearGradient(x, y + 4, x, y + 40);
    damp.addColorStop(0, 'rgba(140,180,148,.12)'); damp.addColorStop(1, 'rgba(140,180,148,0)');
    ctx.fillStyle = damp; ctx.fillRect(x, y + 3, w, 38);
  }
  ctx.restore();
}

function drawHero(ctx: CanvasRenderingContext2D, s: GameState, time: number) {
  const p = s.player;
  const running = Math.abs(p.vx) > 22 && p.grounded;
  const stride = running ? Math.sin(time * 15) : Math.sin(time * 2.4) * .04;
  const bob = running ? Math.abs(Math.sin(time * 15)) * 2 : p.grounded ? Math.sin(time * 2.4) : 0;
  const attack = p.attackTimer > 0;
  ctx.save(); ctx.translate(p.x + p.width / 2, p.y + p.height - bob); ctx.scale(p.facing, 1);
  if (p.invulnerable > 0 && Math.floor(time * 18) % 2 === 0) ctx.globalAlpha = .5;
  // Little shoes and animated legs
  ctx.strokeStyle = '#242329'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-3, -13); ctx.lineTo(-5 + stride * 4, -2); ctx.lineTo(-9 + stride * 5, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(4, -13); ctx.lineTo(5 - stride * 4, -2); ctx.lineTo(10 - stride * 5, 0); ctx.stroke();
  // Dress silhouette
  ctx.fillStyle = '#30313a'; ctx.beginPath(); ctx.moveTo(-7, -34); ctx.quadraticCurveTo(0, -38, 7, -33); ctx.lineTo(12, -10); ctx.quadraticCurveTo(0, -6, -12, -10); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#77777b'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-8, -19); ctx.lineTo(7, -18); ctx.stroke();
  // Arms
  ctx.strokeStyle = '#c5a991'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-5, -29); ctx.lineTo(-11, -20 + stride * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(5, -29); ctx.lineTo(11 + (attack ? 9 : 0), -21); ctx.stroke();
  // Face and hair
  ctx.fillStyle = '#d2b49b'; ctx.beginPath(); ctx.ellipse(0, -42, 8, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1d2027'; ctx.beginPath(); ctx.arc(0, -45, 9, Math.PI, Math.PI * 2); ctx.lineTo(9, -37); ctx.quadraticCurveTo(3, -40, -2, -37); ctx.lineTo(-8, -39); ctx.closePath(); ctx.fill();
  // Oversized dark ribbon bow, with a muted wine-red seam.
  ctx.fillStyle = '#101219';
  ctx.beginPath(); ctx.moveTo(-7, -49); ctx.quadraticCurveTo(-25, -68, -27, -55); ctx.quadraticCurveTo(-24, -46, -9, -47); ctx.quadraticCurveTo(-2, -66, 8, -61); ctx.quadraticCurveTo(12, -51, -5, -46); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#55343b'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-9, -51); ctx.quadraticCurveTo(-21, -63, -23, -56); ctx.moveTo(-4, -51); ctx.quadraticCurveTo(4, -62, 6, -59); ctx.stroke();
  ctx.fillStyle = '#17191e'; ctx.beginPath(); ctx.ellipse(-6, -50, 3, 2.5, -.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#edc3a7'; ctx.beginPath(); ctx.arc(4, -43, 1, 0, Math.PI * 2); ctx.fill();
  // A narrow, tapered nail-blade stays in her hand and sweeps forward on a strike.
  const progress = attack ? 1 - p.attackTimer / .32 : 0;
  ctx.save();
  ctx.translate(12, -23);
  ctx.rotate(attack ? -.78 + progress * 1.2 : -.34);
  const bladeLength = attack ? 45 : 23;
  ctx.strokeStyle = '#554a42'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(8, 0); ctx.stroke();
  ctx.fillStyle = '#c8c5ad';
  ctx.beginPath(); ctx.moveTo(6, -2.2); ctx.lineTo(bladeLength - 5, -1.5); ctx.lineTo(bladeLength, 0); ctx.lineTo(bladeLength - 5, 1.5); ctx.lineTo(6, 2.2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#ece6cc'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(9, -1); ctx.lineTo(bladeLength - 5, -.7); ctx.stroke();
  ctx.restore();
  if (attack) {
    ctx.strokeStyle = `rgba(213,225,196,${.78 - progress * .4})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(17, -29, 30, -.92, .95); ctx.stroke();
    ctx.strokeStyle = 'rgba(241,229,192,.55)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(17, -29, 36, -.7, .62); ctx.stroke();
  }
  ctx.restore();
}

function drawCreature(ctx: CanvasRenderingContext2D, s: GameState, time: number) {
  const e = s.enemy;
  ctx.save(); ctx.translate(e.x + e.width / 2, e.y + e.height); ctx.scale(e.facing, 1);
  const gait = e.mood === 'stalk' ? Math.sin(time * 7) * 2 : 0;
  if (e.mood === 'dead') { ctx.rotate(-Math.PI / 2); ctx.globalAlpha = .5; }
  if (e.mood === 'windup') { ctx.translate(-4, 0); }
  ctx.fillStyle = e.hurtTimer > 0 ? '#d1a58f' : '#25282c';
  ctx.beginPath(); ctx.ellipse(0, -17, 23, 16, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(13, -32, 13, 11, -.15, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#191d20'; ctx.beginPath(); ctx.moveTo(8, -39); ctx.lineTo(5, -51); ctx.lineTo(16, -41); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(20, -39); ctx.lineTo(26, -48); ctx.lineTo(25, -34); ctx.closePath(); ctx.fill();
  ctx.fillStyle = e.mood === 'windup' ? '#ecae78' : '#c98f72';
  ctx.shadowColor = '#df8a68'; ctx.shadowBlur = e.mood === 'windup' ? 13 : 5;
  ctx.beginPath(); ctx.ellipse(18, -33, 2.3, 1.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
  ctx.strokeStyle = '#171a1c'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  for (const leg of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(-9, -12); ctx.lineTo(-12 + gait * leg, -4); ctx.lineTo(-17 + gait * leg, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(8, -12); ctx.lineTo(12 - gait * leg, -4); ctx.lineTo(17 - gait * leg, 0); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(180,190,170,.22)'; ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-12 + i * 7, -28); ctx.lineTo(-17 + i * 7, -36); ctx.stroke(); }
  ctx.restore();
}

function drawWorld(ctx: CanvasRenderingContext2D, state: GameState, width: number, height: number, scale: number) {
  const { cameraX, cameraY, player, enemy, elapsed } = state;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  drawBackdrop(ctx, width, height, cameraX, elapsed);
  ctx.save(); ctx.setTransform(scale, 0, 0, scale, -cameraX * scale, -cameraY * scale);
  ctx.fillStyle = '#1c2225';
  ctx.fillRect(cameraX, FLOOR_Y, width, WORLD_HEIGHT - FLOOR_Y);
  // Distant motes drift through the sanctuary.
  for (const mote of DUST) {
    const x = mote.x + Math.sin(elapsed * .24 + mote.phase) * 8;
    const y = mote.y + Math.sin(elapsed * .65 + mote.phase) * 5;
    ctx.fillStyle = `rgba(205,218,190,${.16 + .14 * Math.sin(elapsed + mote.phase)})`;
    ctx.beginPath(); ctx.arc(x, y, mote.r, 0, Math.PI * 2); ctx.fill();
  }
  drawRuins(ctx, cameraX, width);
  for (const [x, y, scaleFactor] of MUSHROOMS) drawMushroom(ctx, x, y, scaleFactor, elapsed);
  for (const platform of PLATFORMS) drawPlatform(ctx, platform.x, platform.y, platform.width, platform.height);
  if (enemy.hp > 0) drawCreature(ctx, state, elapsed);
  else drawCreature(ctx, state, elapsed);
  drawHero(ctx, state, elapsed);
  // Soft vignette across the camera bounds.
  const vignette = ctx.createRadialGradient(cameraX + width / 2, cameraY + height / 2, height * .18, cameraX + width / 2, cameraY + height / 2, width * .72);
  vignette.addColorStop(.55, 'rgba(0,0,0,0)'); vignette.addColorStop(1, 'rgba(5,8,12,.46)');
  ctx.fillStyle = vignette; ctx.fillRect(cameraX, cameraY, width, height);
  ctx.restore();
}

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createGameState());
  const controlsRef = useRef<Controls>({ left: false, right: false, jump: false });
  const attackRef = useRef(false);
  const keySet = useRef(new Set<string>());
  const [hud, setHud] = useState(() => makeHud(stateRef.current));
  const [pressed, setPressed] = useState({ left: false, right: false, jump: false, attack: false });

  const releaseAll = useCallback(() => {
    keySet.current.clear();
    controlsRef.current = { left: false, right: false, jump: false };
    attackRef.current = false;
    setPressed({ left: false, right: false, jump: false, attack: false });
  }, []);

  const begin = useCallback(() => {
    if (stateRef.current.phase === 'ready') startGame(stateRef.current);
    else stateRef.current = resetGame();
    setHud(makeHud(stateRef.current));
    releaseAll();
  }, [releaseAll]);

  useEffect(() => {
    const onDown = (event: KeyboardEvent) => {
      const key = event.code;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space'].includes(key)) event.preventDefault();
      if (key === 'ArrowLeft' || key === 'KeyA') keySet.current.add('left');
      if (key === 'ArrowRight' || key === 'KeyD') keySet.current.add('right');
      if (key === 'ArrowUp' || key === 'Space' || key === 'KeyW') keySet.current.add('jump');
      if ((key === 'KeyX' || key === 'KeyJ') && !event.repeat) attackRef.current = true;
      controlsRef.current = {
        left: keySet.current.has('left'), right: keySet.current.has('right'), jump: keySet.current.has('jump'),
      };
    };
    const onUp = (event: KeyboardEvent) => {
      if (event.code === 'ArrowLeft' || event.code === 'KeyA') keySet.current.delete('left');
      if (event.code === 'ArrowRight' || event.code === 'KeyD') keySet.current.delete('right');
      if (event.code === 'ArrowUp' || event.code === 'Space' || event.code === 'KeyW') keySet.current.delete('jump');
      controlsRef.current = {
        left: keySet.current.has('left'), right: keySet.current.has('right'), jump: keySet.current.has('jump'),
      };
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', releaseAll);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', releaseAll);
    };
  }, [releaseAll]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let frame = 0;
    let last = 0;
    let lastHud = 0;
    let width = 960;
    let height = 600;
    let scale = 1;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      width = 600 * rect.width / Math.max(rect.height, 1);
      height = 600;
      scale = canvas.height / height;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    const tick = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, .05) : 0;
      last = now;
      const state = stateRef.current;
      const input: GameInput = { ...controlsRef.current, attackPressed: attackRef.current };
      updateGame(state, input, dt, width, height);
      attackRef.current = false;
      drawPaintedWorld(ctx, state, width, height, scale);
      if (now - lastHud > 115) {
        lastHud = now;
        setHud(makeHud(state));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, []);

  const touchStart = (control: keyof typeof pressed) => (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    if (control === 'attack') attackRef.current = true;
    else controlsRef.current = { ...controlsRef.current, [control]: true };
    setPressed((p) => ({ ...p, [control]: true }));
  };
  const touchEnd = (control: keyof typeof pressed) => (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (control !== 'attack') controlsRef.current = { ...controlsRef.current, [control]: false };
    setPressed((p) => ({ ...p, [control]: false }));
  };
  const touchButton = (control: keyof typeof pressed, text: string, label: string, extra = '') => (
    <button
      type="button"
      className={`touch-button ${extra} ${pressed[control] ? 'pressed' : ''}`}
      aria-label={label}
      data-testid={`touch-${control}`}
      onPointerDown={touchStart(control)}
      onPointerUp={touchEnd(control)}
      onPointerCancel={touchEnd(control)}
      onLostPointerCapture={touchEnd(control)}
    ><span>{text}</span></button>
  );
  const continueDialogue = () => {
    advanceVillageDialogue(stateRef.current);
    setHud(makeHud(stateRef.current));
  };

  const isIntro = hud.phase === 'ready';
  const isEnd = hud.phase === 'won' || hud.phase === 'fallen';
  const activeDialogue = hud.dialogueLine >= 0
    ? VILLAGE_DIALOGUE[hud.dialogueLine]
    : undefined;
  return (
    <main className="game-shell">
      <div className="game-frame">
      <header className="game-topline">
          <div className="wordmark">
            <div className="sigil" aria-hidden="true">G</div>
             <div><strong>Gloamreach</strong><span>A village at the forest's edge</span></div>
          </div>
        <div className="top-actions">
          <div className="top-note">A lantern-lit path into the dark</div>
          <button className="restart-button" type="button" onClick={begin} aria-label="Restart game" data-testid="button-restart-game">
            <span aria-hidden="true">↻</span> Restart
          </button>
        </div>
        </header>
        <section className="canvas-wrap" aria-label="Gloamreach game">
           <canvas ref={canvasRef} className="game-canvas" aria-label="Lisa explores a village at the edge of a dark forest" data-testid="game-canvas" />
          <div className="hud">
            <div className="hud-group" data-testid="status-player-health">
              <span className="hud-label">Resolve</span>
              <div className="health-row">{Array.from({ length: hud.maxHp }, (_, i) => <i key={i} className={`heart ${i >= hud.hp ? 'empty' : ''}`} />)}</div>
            </div>
            {hud.location === 'sanctuary' ? (
              <div className="hud-group" data-testid="status-creature-health">
                <span className="enemy-title">{hud.enemyHp > 0 ? 'The Hollow Stalker' : 'Silence, at last'}</span>
                <div className="enemy-meter"><i style={{ width: `${hud.enemyMaxHp ? Math.max(0, hud.enemyHp / hud.enemyMaxHp * 100) : 0}%` }} /></div>
              </div>
            ) : <div className="location-title">At the forest's edge</div>}
          </div>
          {isEnd && (
            <div className="overlay" data-testid="game-result">
              <div className="overlay-card">
                <div className="eyebrow">{hud.phase === 'won' ? 'The quiet returns' : 'The dark closes in'}</div>
                <h1>{hud.phase === 'won' ? 'Sanctuary' : 'Fallen'}</h1>
                <p>{hud.phase === 'won' ? 'The creature is still. For a moment, the old stones seem to breathe.' : 'The sanctuary keeps what it takes. There may yet be another way through.'}</p>
                <button className="primary-action" data-testid="button-restart" onClick={begin}>{hud.phase === 'won' ? 'Walk the passage again' : 'Rise once more'}</button>
              </div>
            </div>
          )}
          {isIntro && (
            <div className="overlay" data-testid="intro-overlay">
              <div className="overlay-card">
                <div className="eyebrow">The lantern village</div>
                <h1>At the Forest’s Edge</h1>
                <p>Find Eva beside the old well. Beyond the last lantern, a hidden path leads into the forest.</p>
                <button className="primary-action" data-testid="button-begin" onClick={begin}>Begin the journey</button>
                <div className="key-hint"><span><b>A / D</b> walk</span><span><b>Space</b> leap</span><span><b>X</b> strike</span></div>
              </div>
            </div>
          )}
          {activeDialogue && (
            <div className="dialogue-dock" data-testid="eva-dialogue">
              <section
                className="dialogue-card"
                role="dialog"
                aria-live="polite"
                aria-label={`${activeDialogue.speaker} говорит`}
              >
                <div className="dialogue-sigil" aria-hidden="true">{activeDialogue.initial}</div>
                <div className="dialogue-copy">
                  <span className="dialogue-speaker">{activeDialogue.speaker}</span>
                  <p>{activeDialogue.text}</p>
                </div>
                <button
                  className="dialogue-continue"
                  type="button"
                  onClick={continueDialogue}
                  data-testid="button-continue-dialogue"
                >
                  <span>{hud.dialogueLine === VILLAGE_DIALOGUE.length - 1 ? 'Продолжить путь' : 'Продолжить'}</span>
                  <span className="dialogue-arrow" aria-hidden="true">›</span>
                </button>
              </section>
            </div>
          )}
          <div className="mobile-controls" aria-label="Touch controls">
            <div className="move-pad">
              {touchButton('left', '‹', 'Move left')}
              {touchButton('right', '›', 'Move right')}
            </div>
            <div className="move-pad">
              {touchButton('jump', '↑', 'Jump')}
              {touchButton('attack', 'X', 'Attack', 'attack')}
            </div>
          </div>
        </section>
        <footer className="game-footer">
          <span>Follow the lanterns. Find the hidden path.</span>
          <div className="footer-controls"><span>← → &nbsp; move</span><span>SPACE &nbsp; jump</span><span>X &nbsp; strike</span></div>
        </footer>
      </div>
    </main>
  );
}

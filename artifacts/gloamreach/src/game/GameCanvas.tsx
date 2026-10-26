import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import {
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

type Controls = { left: boolean; right: boolean; jump: boolean };
const MUSHROOMS = [
  [84, 514, 1], [259, 509, .7], [375, 431, .8], [525, 515, .8],
  [654, 355, .75], [822, 512, 1.1], [942, 424, .7], [1118, 512, .9],
  [1248, 348, .75], [1420, 513, .8], [1550, 418, .8], [1750, 513, 1],
  [1870, 348, .7], [2065, 513, 1], [2188, 432, .7], [2340, 513, .85],
] as const;
const DUST = Array.from({ length: 54 }, (_, i) => ({
  x: (i * 137 + 31) % WORLD_WIDTH,
  y: 50 + ((i * 83 + 17) % 435),
  r: 1 + (i % 3) * .45,
  phase: i * 1.71,
}));

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function drawBackdrop(ctx: CanvasRenderingContext2D, width: number, height: number, cameraX: number, time: number) {
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, '#141a22'); bg.addColorStop(.55, '#20252a'); bg.addColorStop(1, '#292d2d');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height);
  // Far sanctuary ribs, shifted at a slower parallax rate.
  ctx.save(); ctx.translate(-(cameraX * .17) % 390, 0);
  for (let i = -1; i < Math.ceil(width / 390) + 2; i++) {
    const x = i * 390;
    ctx.fillStyle = '#1a2026';
    ctx.beginPath(); ctx.moveTo(x - 70, 465); ctx.lineTo(x + 66, 102); ctx.quadraticCurveTo(x + 190, 28, x + 306, 128); ctx.lineTo(x + 434, 465); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(111,130,121,.13)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + 63, 345); ctx.lineTo(x + 105, 127); ctx.quadraticCurveTo(x + 187, 61, x + 268, 145); ctx.lineTo(x + 323, 350); ctx.stroke();
    ctx.fillStyle = 'rgba(131,158,138,.12)';
    for (let n = 0; n < 3; n++) {
      const glint = .1 + .08 * Math.sin(time * .7 + i * 2 + n);
      ctx.globalAlpha = glint;
      ctx.beginPath(); ctx.ellipse(x + 119 + n * 54, 246 + n * 14, 3, 17, -.12, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  const haze = ctx.createLinearGradient(0, height * .43, 0, height);
  haze.addColorStop(0, 'rgba(151,177,153,0)'); haze.addColorStop(1, 'rgba(108,142,126,.1)');
  ctx.fillStyle = haze; ctx.fillRect(0, height * .4, width, height * .6);
}

function drawRuins(ctx: CanvasRenderingContext2D, cameraX: number, viewWidth: number) {
  const first = Math.floor(cameraX / 260) - 1;
  const last = Math.ceil((cameraX + viewWidth) / 260) + 1;
  for (let i = first; i <= last; i++) {
    const x = i * 260 + (i % 2) * 45;
    const h = 90 + ((i * 43 % 87) + 87) % 87;
    ctx.fillStyle = '#303536'; ctx.fillRect(x, FLOOR_Y - h, 30, h);
    ctx.fillStyle = '#414747'; ctx.fillRect(x - 5, FLOOR_Y - h - 9, 40, 12);
    ctx.fillStyle = 'rgba(153,164,142,.12)'; ctx.fillRect(x + 4, FLOOR_Y - h + 15, 4, h - 20);
    ctx.fillStyle = '#252a2c'; ctx.fillRect(x + 34, FLOOR_Y - 29, 43, 8);
  }
}

function drawMushroom(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, time: number) {
  const pulse = .78 + .22 * Math.sin(time * 2.3 + x * .03);
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  const glow = ctx.createRadialGradient(0, -9, 2, 0, -9, 32);
  glow.addColorStop(0, `rgba(152,218,185,${.24 * pulse})`); glow.addColorStop(1, 'rgba(122,207,173,0)');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, -9, 32, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#819b88'; roundedRect(ctx, -3, -13, 6, 15, 2); ctx.fill();
  ctx.fillStyle = '#a6c8a8'; ctx.beginPath(); ctx.ellipse(0, -15, 13, 7, 0, Math.PI, Math.PI * 2); ctx.quadraticCurveTo(12, -8, 0, -9); ctx.quadraticCurveTo(-12, -8, -13, -15); ctx.fill();
  ctx.fillStyle = '#e0d7ae'; ctx.globalAlpha = .72 * pulse;
  ctx.beginPath(); ctx.arc(-5, -14, 1.4, 0, Math.PI * 2); ctx.arc(4, -15, 1.2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawPlatform(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const floor = y >= FLOOR_Y;
  ctx.fillStyle = floor ? '#33383a' : '#454948'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = floor ? '#646960' : '#74796f'; ctx.fillRect(x, y, w, 4);
  ctx.fillStyle = 'rgba(14,17,19,.28)';
  for (let bx = x + 17; bx < x + w - 8; bx += 47) {
    ctx.fillRect(bx, y + 10, 1, Math.min(h - 12, 10));
    if (bx + 13 < x + w) ctx.fillRect(bx + 14, y + 14, 20, 1);
  }
  if (floor) {
    ctx.fillStyle = '#24292b'; ctx.fillRect(x, y + 22, w, h - 22);
    ctx.fillStyle = 'rgba(134,153,137,.12)';
    for (let bx = x + 27; bx < x + w; bx += 106) ctx.fillRect(bx, y + 29, 2, 38);
  }
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
  const [hud, setHud] = useState(() => ({ phase: stateRef.current.phase, hp: 5, maxHp: 5, enemyHp: 5, enemyMaxHp: 5 }));
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
    setHud((h) => ({ ...h, phase: stateRef.current.phase, hp: stateRef.current.player.hp, enemyHp: stateRef.current.enemy.hp }));
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
      drawWorld(ctx, state, width, height, scale);
      if (now - lastHud > 115) {
        lastHud = now;
        setHud({ phase: state.phase, hp: state.player.hp, maxHp: state.player.maxHp, enemyHp: state.enemy.hp, enemyMaxHp: state.enemy.maxHp });
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

  const isIntro = hud.phase === 'ready';
  const isEnd = hud.phase === 'won' || hud.phase === 'fallen';
  return (
    <main className="game-shell">
      <div className="game-frame">
      <header className="game-topline">
          <div className="wordmark">
            <div className="sigil" aria-hidden="true">G</div>
            <div><strong>Gloamreach</strong><span>A sanctuary beneath the world</span></div>
          </div>
        <div className="top-actions">
          <div className="top-note">A small tale in the deep</div>
          <button className="restart-button" type="button" onClick={begin} aria-label="Restart game" data-testid="button-restart-game">
            <span aria-hidden="true">↻</span> Restart
          </button>
        </div>
        </header>
        <section className="canvas-wrap" aria-label="Gloamreach game">
          <canvas ref={canvasRef} className="game-canvas" aria-label="A heroine explores a ruined underground sanctuary" data-testid="game-canvas" />
          <div className="hud">
            <div className="hud-group" data-testid="status-player-health">
              <span className="hud-label">Resolve</span>
              <div className="health-row">{Array.from({ length: hud.maxHp }, (_, i) => <i key={i} className={`heart ${i >= hud.hp ? 'empty' : ''}`} />)}</div>
            </div>
            <div className="hud-group" data-testid="status-creature-health">
              <span className="enemy-title">{hud.enemyHp > 0 ? 'The Hollow Stalker' : 'Silence, at last'}</span>
              <div className="enemy-meter"><i style={{ width: `${hud.enemyMaxHp ? Math.max(0, hud.enemyHp / hud.enemyMaxHp * 100) : 0}%` }} /></div>
            </div>
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
                <div className="eyebrow">Beneath the forgotten nave</div>
                <h1>Gloamreach</h1>
                <p>Something stirs among the old stones. Keep your distance, find your footing, and strike when the Hollow Stalker draws near.</p>
                <button className="primary-action" data-testid="button-begin" onClick={begin}>Enter the sanctuary</button>
                <div className="key-hint"><span><b>A / D</b> walk</span><span><b>Space</b> leap</span><span><b>X</b> strike</span></div>
              </div>
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
          <span>Find the rhythm. Wait for the opening.</span>
          <div className="footer-controls"><span>← → &nbsp; move</span><span>SPACE &nbsp; jump</span><span>X &nbsp; strike</span></div>
        </footer>
      </div>
    </main>
  );
}

export const WORLD_WIDTH = 2400;
export const WORLD_HEIGHT = 960;
export const FLOOR_Y = 540;
export const VILLAGE_WIDTH = 1600;
export const EVA_X = 590;

export type GamePhase = "ready" | "playing" | "won" | "fallen";
export type GameLocation = "village" | "sanctuary";

export interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const PLATFORMS: Platform[] = [
  { x: 0, y: FLOOR_Y, width: WORLD_WIDTH, height: 420 },
  { x: 320, y: 438, width: 176, height: 22 },
  { x: 566, y: 362, width: 164, height: 22 },
  { x: 880, y: 430, width: 196, height: 22 },
  { x: 1192, y: 354, width: 172, height: 22 },
  { x: 1492, y: 424, width: 184, height: 22 },
  { x: 1812, y: 354, width: 192, height: 22 },
  { x: 2110, y: 438, width: 168, height: 22 },
];

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  facing: -1 | 1;
  grounded: boolean;
  hp: number;
  maxHp: number;
  invulnerable: number;
  attackTimer: number;
  attackDidHit: boolean;
  hurtTimer: number;
}

export type EnemyMood = "stalk" | "windup" | "recover" | "dead";

export interface EnemyState {
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  facing: -1 | 1;
  mood: EnemyMood;
  moodTimer: number;
  hurtTimer: number;
}

export interface GameState {
  phase: GamePhase;
  location: GameLocation;
  player: PlayerState;
  enemy: EnemyState;
  cameraX: number;
  cameraY: number;
  elapsed: number;
  dialogueLine: number;
  hasSpokenToEva: boolean;
}

export interface GameInput {
  left: boolean;
  right: boolean;
  jump: boolean;
  attackPressed: boolean;
}

const VILLAGE_PLATFORMS: Platform[] = [
  { x: 0, y: FLOOR_Y, width: VILLAGE_WIDTH, height: WORLD_HEIGHT - FLOOR_Y },
];

const GRAVITY = 1480;
const RUN_SPEED = 218;
const RUN_ACCELERATION = 1540;
const JUMP_SPEED = 535;

export function createGameState(phase: GamePhase = "ready"): GameState {
  return {
    phase,
    location: "village",
    player: {
      x: 122,
      y: FLOOR_Y - 54,
      vx: 0,
      vy: 0,
      width: 31,
      height: 54,
      facing: 1,
      grounded: true,
      hp: 5,
      maxHp: 5,
      invulnerable: 0,
      attackTimer: 0,
      attackDidHit: false,
      hurtTimer: 0,
    },
    enemy: {
      x: 714,
      y: FLOOR_Y - 44,
      width: 44,
      height: 44,
      hp: 5,
      maxHp: 5,
      facing: -1,
      mood: "stalk",
      moodTimer: 0,
      hurtTimer: 0,
    },
    cameraX: 0,
    cameraY: 0,
    elapsed: 0,
    dialogueLine: -1,
    hasSpokenToEva: false,
  };
}

export function startGame(state: GameState): void {
  if (state.phase === "ready") state.phase = "playing";
}

export function resetGame(): GameState {
  return createGameState("playing");
}

export function advanceVillageDialogue(state: GameState): void {
  if (state.location !== "village" || state.dialogueLine < 0) return;
  if (state.dialogueLine < 2) {
    state.dialogueLine += 1;
    return;
  }
  state.dialogueLine = -1;
  state.hasSpokenToEva = true;
}

function approach(value: number, target: number, amount: number): number {
  if (value < target) return Math.min(value + amount, target);
  return Math.max(value - amount, target);
}

function overlaps(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function updatePlayer(state: GameState, input: GameInput, dt: number): void {
  const player = state.player;
  const direction = Number(input.right) - Number(input.left);

  if (direction !== 0) {
    player.facing = direction > 0 ? 1 : -1;
    player.vx = approach(
      player.vx,
      direction * RUN_SPEED,
      RUN_ACCELERATION * dt,
    );
  } else {
    player.vx = approach(player.vx, 0, RUN_ACCELERATION * 1.22 * dt);
  }

  if (input.jump && player.grounded) {
    player.vy = -JUMP_SPEED;
    player.grounded = false;
  }

  if (input.attackPressed && player.attackTimer <= 0) {
    player.attackTimer = 0.32;
    player.attackDidHit = false;
  }

  const oldBottom = player.y + player.height;
  player.x += player.vx * dt;
  player.vy += GRAVITY * dt;
  player.y += player.vy * dt;
  player.grounded = false;

  const platforms = state.location === "village" ? VILLAGE_PLATFORMS : PLATFORMS;
  for (const platform of platforms) {
    const newBottom = player.y + player.height;
    const overlapsX =
      player.x + player.width > platform.x &&
      player.x < platform.x + platform.width;

    if (
      overlapsX &&
      player.vy >= 0 &&
      oldBottom <= platform.y + 2 &&
      newBottom >= platform.y
    ) {
      player.y = platform.y - player.height;
      player.vy = 0;
      player.grounded = true;
      break;
    }
  }

  const worldWidth = state.location === "village" ? VILLAGE_WIDTH : WORLD_WIDTH;
  player.x = Math.max(16, Math.min(worldWidth - player.width - 16, player.x));
  player.attackTimer = Math.max(0, player.attackTimer - dt);
  player.invulnerable = Math.max(0, player.invulnerable - dt);
  player.hurtTimer = Math.max(0, player.hurtTimer - dt);

  if (player.y > WORLD_HEIGHT) player.hp = 0;
}

function updateEnemy(state: GameState, dt: number): void {
  const { player, enemy } = state;
  enemy.hurtTimer = Math.max(0, enemy.hurtTimer - dt);
  if (enemy.hp <= 0) {
    enemy.hp = 0;
    enemy.mood = "dead";
    return;
  }

  const playerCenter = player.x + player.width / 2;
  const enemyCenter = enemy.x + enemy.width / 2;
  const distance = playerCenter - enemyCenter;
  enemy.facing = distance < 0 ? -1 : 1;

  if (enemy.mood === "stalk") {
    if (Math.abs(distance) > 66) {
      enemy.x += enemy.facing * Math.min(58 * dt, Math.abs(distance) - 66);
    } else {
      enemy.mood = "windup";
      enemy.moodTimer = 0.48;
    }
  } else if (enemy.mood === "windup") {
    enemy.moodTimer -= dt;
    if (enemy.moodTimer <= 0) {
      const inRange =
        Math.abs(distance) < 96 &&
        Math.abs(player.y + player.height - (enemy.y + enemy.height)) < 54;
      if (inRange && player.invulnerable <= 0) {
        player.hp = Math.max(0, player.hp - 1);
        player.invulnerable = 1.08;
        player.hurtTimer = 0.24;
        player.vx = enemy.facing * 215;
        player.vy = -205;
        player.grounded = false;
      }
      enemy.mood = "recover";
      enemy.moodTimer = 0.86;
    }
  } else if (enemy.mood === "recover") {
    enemy.moodTimer -= dt;
    if (enemy.moodTimer <= 0) enemy.mood = "stalk";
  }

  enemy.x = Math.max(28, Math.min(WORLD_WIDTH - enemy.width - 28, enemy.x));
}

function resolvePlayerAttack(state: GameState): void {
  const { player, enemy } = state;
  if (
    player.attackTimer <= 0.12 ||
    player.attackTimer >= 0.27 ||
    player.attackDidHit ||
    enemy.hp <= 0
  ) {
    return;
  }

  const attackX = player.facing === 1
    ? player.x + player.width - 1
    : player.x - 72;
  const attackY = player.y + 8;
  const attackWidth = 72;
  const attackHeight = 42;

  if (
    overlaps(
      attackX,
      attackY,
      attackWidth,
      attackHeight,
      enemy.x,
      enemy.y,
      enemy.width,
      enemy.height,
    )
  ) {
    enemy.hp = Math.max(0, enemy.hp - 1);
    enemy.hurtTimer = 0.24;
    enemy.x += player.facing * 34;
    enemy.mood = enemy.hp === 0 ? "dead" : "recover";
    enemy.moodTimer = enemy.hp === 0 ? 0 : 0.52;
    player.attackDidHit = true;
  }
}

export function updateGame(
  state: GameState,
  input: GameInput,
  deltaSeconds: number,
  viewWidth: number,
  viewHeight: number,
): void {
  if (state.phase !== "playing" || state.dialogueLine >= 0) return;
  const dt = Math.min(Math.max(deltaSeconds, 0), 1 / 30);
  state.elapsed += dt;

  updatePlayer(state, input, dt);
  if (state.location === "village") {
    const playerCenter = state.player.x + state.player.width / 2;
    const nearEva = Math.abs(playerCenter - EVA_X) <= 94 &&
      Math.abs(state.player.y + state.player.height - FLOOR_Y) <= 72;
    if (!state.hasSpokenToEva && nearEva) state.dialogueLine = 0;

    if (
      state.hasSpokenToEva &&
      state.player.x >= VILLAGE_WIDTH - state.player.width - 72
    ) {
      const fresh = createGameState("playing");
      state.location = "sanctuary";
      state.player.x = fresh.player.x;
      state.player.y = fresh.player.y;
      state.player.vx = 0;
      state.player.vy = 0;
      state.player.grounded = true;
      state.player.facing = 1;
      state.player.attackTimer = 0;
      state.player.attackDidHit = false;
      state.player.invulnerable = 0;
      state.player.hurtTimer = 0;
      state.enemy = fresh.enemy;
      state.cameraX = 0;
      state.cameraY = 0;
    }
  } else {
    updateEnemy(state, dt);
    resolvePlayerAttack(state);
    if (state.player.hp <= 0) state.phase = "fallen";
    else if (state.enemy.hp <= 0) state.phase = "won";
  }

  const worldWidth = state.location === "village" ? VILLAGE_WIDTH : WORLD_WIDTH;
  const maxCameraX = Math.max(0, worldWidth - viewWidth);
  const maxCameraY = Math.max(0, WORLD_HEIGHT - viewHeight);
  const targetX = Math.max(
    0,
    Math.min(
      maxCameraX,
      state.player.x + state.player.width / 2 - viewWidth * 0.42,
    ),
  );
  const targetY = state.location === "village"
    ? 0
    : Math.max(
      0,
      Math.min(
        maxCameraY,
        state.player.y + state.player.height / 2 - viewHeight * 0.55,
      ),
    );
  const cameraEase = 1 - Math.exp(-5.2 * dt);
  state.cameraX += (targetX - state.cameraX) * cameraEase;
  state.cameraY += (targetY - state.cameraY) * cameraEase;
}

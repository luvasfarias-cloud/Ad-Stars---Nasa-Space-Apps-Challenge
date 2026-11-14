import {
  nasa_database,
  progress,
  audio,
  getSkin,
  getBaseLevel,
  computeMetrics,
  missionManager,
  type PlayerSkin
} from "./data";
import { getLang, t } from "./i18n";

export function pxSnap(v: number) { return Math.round(v * 2) * 0.5; }

export function pxEllipse(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, col: string, step = 0.5) {
  ctx.fillStyle = col;
  for (let dy = -ry; dy <= ry; dy += step) {
    const ny = dy / ry;
    const span = Math.sqrt(Math.max(0, 1 - ny * ny)) * rx;
    const w = Math.max(step, Math.round(span * 4) * 0.5);
    ctx.fillRect(pxSnap(cx - w * 0.5), pxSnap(cy + dy), w, step);
  }
}

export function pxChamfer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  outline: string | null = "#070a12",
  hi: string | null = null,
  sh: string | null = null,
  cut = 1.5
) {
  const c = Math.min(cut, w * 0.25, h * 0.25);
  if (outline) {
    ctx.fillStyle = outline;
    ctx.fillRect(pxSnap(x + c - 0.5), pxSnap(y - 0.5), pxSnap(w - c * 2 + 1), pxSnap(h + 1));
    ctx.fillRect(pxSnap(x - 0.5), pxSnap(y + c - 0.5), pxSnap(w + 1), pxSnap(h - c * 2 + 1));
  }
  ctx.fillStyle = fill;
  ctx.fillRect(pxSnap(x + c), pxSnap(y), pxSnap(w - c * 2), pxSnap(h));
  ctx.fillRect(pxSnap(x), pxSnap(y + c), pxSnap(w), pxSnap(h - c * 2));
  if (hi) {
    ctx.fillStyle = hi;
    ctx.fillRect(pxSnap(x + c), pxSnap(y), pxSnap(w - c * 2), 1);
    ctx.fillRect(pxSnap(x), pxSnap(y + c), 1, pxSnap(Math.max(1, h - c * 2.5)));
  }
  if (sh) {
    ctx.fillStyle = sh;
    ctx.fillRect(pxSnap(x + c), pxSnap(y + h - 1.5), pxSnap(w - c * 2), 1.5);
    ctx.fillRect(pxSnap(x + w - 1.5), pxSnap(y + c), 1.5, pxSnap(h - c * 2));
  }
}

export function dirFromVector(dx: number, dy: number) {
  const deg = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (deg >= -22.5 && deg < 22.5) return "right";
  if (deg >= 22.5 && deg < 67.5) return "down-right";
  if (deg >= 67.5 && deg < 112.5) return "down";
  if (deg >= 112.5 && deg < 157.5) return "down-left";
  if (deg >= 157.5 || deg < -157.5) return "left";
  if (deg >= -157.5 && deg < -112.5) return "up-left";
  if (deg >= -112.5 && deg < -67.5) return "up";
  return "up-right";
}

export interface LightSample {
  r: number;
  g: number;
  b: number;
  strength: number;
  dirX: number;
  dirY: number;
}

export function drawEntityDropShadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  lift = 0,
  lightInfo: LightSample | null = null
) {
  const li = lightInfo;
  const strength = li ? li.strength : 0.25;
  const dx = li ? Math.max(-2.6, Math.min(2.6, li.dirX * 2.2)) : 0.6;
  const dy = li ? Math.max(-0.8, Math.min(1.4, li.dirY * 1.1)) : 0.35;
  const proxScale = 1 + strength * 0.16 - lift * 0.10;
  const penRx = Math.max(2.5, (rx + 1.6) * proxScale);
  const penRy = Math.max(1.0, (ry + 0.6) * (0.95 + strength * 0.12 - lift * 0.08));

  if (li && strength > 0.16) {
    const bAlpha = Math.min(0.18, strength * 0.17);
    pxEllipse(ctx, x - dx * 0.5, y - 0.5, rx + 3.2, ry + 1.4, `rgba(${li.r}, ${li.g}, ${li.b}, ${bAlpha.toFixed(2)})`);
  }

  const penAlpha = Math.max(0.14, 0.22 + strength * 0.14 - lift * 0.06);
  pxEllipse(ctx, x + dx, y - 0.3 + dy, penRx, penRy, `rgba(2, 4, 10, ${penAlpha.toFixed(2)})`);

  const coreAlpha = Math.max(0.32, 0.52 - lift * 0.14);
  pxEllipse(ctx, x, y - 0.5, Math.max(2, rx * (1 - lift * 0.08)), Math.max(0.9, ry * (1 - lift * 0.06)), `rgba(1, 3, 8, ${coreAlpha.toFixed(2)})`);
}

export interface EngineerAnimState {
  jumpY?: number;
  lookOffset?: number;
  squash?: number;
}

export function drawPixelEngineer24x32(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  dir: string,
  frame: number,
  moving: boolean,
  time: number,
  skin: PlayerSkin,
  scale = 1,
  lightInfo: LightSample | null = null,
  animState?: EngineerAnimState
) {
  ctx.save();
  ctx.translate(pxSnap(cx), pxSnap(cy));
  if (scale !== 1) ctx.scale(scale, scale);

  const jumpLift = animState?.jumpY ?? 0;
  const lookOff = animState?.lookOffset ?? 0;
  const squash = animState?.squash ?? 0;

  const blink = Math.sin(time * 5.2) > 0;
  const eyeBlink = !moving && (time % 4.4) > 4.24;
  const breath = !moving && jumpLift < 0.25 ? Math.sin(time * 3.1) * 0.35 : 0;

  const phase = moving ? (frame / 8) * Math.PI * 2 : 0;
  const swingSin = moving ? Math.sin(phase) : 0;
  const swingCos = moving ? Math.cos(phase) : 0;
  const bobAbs = moving ? Math.abs(Math.sin(phase)) : 0;

  const hopTuck = Math.min(1, jumpLift / 5);
  const headBob = -bobAbs * 1.15;
  const stepL = moving ? swingSin * 1.9 - hopTuck * 0.8 : -hopTuck * 0.9;
  const stepR = moving ? -swingSin * 1.9 - hopTuck * 0.8 : -hopTuck * 0.9;
  const armL = moving ? -swingSin * 2.1 - hopTuck * 1.4 : -hopTuck * 1.8;
  const armR = moving ? swingSin * 2.1 - hopTuck * 1.4 : -hopTuck * 1.8;
  const sideStride = swingSin * 2.8;

  drawEntityDropShadow(ctx, 0, 0, 7.2, 1.75, bobAbs + jumpLift * 0.32, lightInfo);

  if (jumpLift > 0.05) {
    ctx.translate(0, pxSnap(-jumpLift));
  }
  if (Math.abs(squash) > 0.01) {
    ctx.scale(1 + squash * 0.085, 1 - squash * 0.085);
  }

  if (moving) {
    const leanSign = (dir === "left" || dir === "down-left" || dir === "up-left") ? -1
      : (dir === "right" || dir === "down-right" || dir === "up-right") ? 1
      : swingCos * 0.35;
    ctx.rotate(leanSign * (0.032 + bobAbs * 0.018));
  } else if (Math.abs(lookOff) > 0.02) {
    ctx.rotate(lookOff * 0.022);
  }

  const noOut = null;
  const glintShift = Math.floor((time * 2.5) % 4);
  const yTop = -31;

  const drawBubbleHelmet = (hxRaw: number, hy: number, faceDir: string) => {
    const hx = hxRaw + lookOff * (faceDir === "up" || faceDir === "down" ? 0.9 : 0.55);
    pxEllipse(ctx, hx, hy + 6, 7.2, 6.2, skin.helmet);
    pxEllipse(ctx, hx + 1.5, hy + 7.5, 5.2, 4.2, skin.helmetShade);
    pxEllipse(ctx, hx - 0.5, hy + 5.5, 6.2, 5.2, skin.helmet);
    pxEllipse(ctx, hx - 1.5, hy + 3, 4.2, 2.3, skin.helmetHi || "#ffffff");

    if (faceDir === "down" || faceDir === "up") {
      pxChamfer(ctx, hx - 7.8 + lookOff * 0.4, hy + 5, 1.8, 3.2, skin.shirt, noOut, skin.accent, skin.packShade, 0.5);
      pxChamfer(ctx, hx + 6 + lookOff * 0.4, hy + 5, 1.8, 3.2, skin.shirt, noOut, skin.accent, skin.packShade, 0.5);
    } else if (faceDir === "down-left" || faceDir === "up-left") {
      pxChamfer(ctx, hx + 5.5, hy + 5, 1.8, 3.2, skin.shirt, noOut, skin.accent, skin.packShade, 0.5);
    } else if (faceDir === "down-right" || faceDir === "up-right") {
      pxChamfer(ctx, hx - 7.3, hy + 5, 1.8, 3.2, skin.shirt, noOut, skin.accent, skin.packShade, 0.5);
    }

    if (faceDir === "up") {
      pxChamfer(ctx, hx - 4, hy + 8.5, 8, 2.5, skin.shirt, noOut, "#64748b", "#1e293b", 0.5);
      ctx.fillStyle = skin.accent;
      ctx.fillRect(pxSnap(hx - 2), pxSnap(hy + 1.5), 4, 1);
      pxChamfer(ctx, hx - 5.5, hy + 11, 11, 1.8, skin.collar || skin.accent, noOut, "#ffffff44", "#00000044", 0.5);
      return;
    }

    if (faceDir === "up-left" || faceDir === "up-right") {
      const isLeft = faceDir === "up-left";
      const latchX = isLeft ? hx - 1.5 : hx - 4.5;
      pxChamfer(ctx, latchX, hy + 8.5, 6, 2.2, skin.shirt, noOut, "#64748b", "#1e293b", 0.5);
      ctx.fillStyle = skin.accent;
      ctx.fillRect(pxSnap(hx - 1.5), pxSnap(hy + 1.5), 3, 1);
      const peekX = isLeft ? hx - 7 : hx + 3.5;
      pxChamfer(ctx, peekX, hy + 3.5, 3.5, 5.5, skin.visorDeep || "#082f49", noOut, skin.helmetShade, null, 1);
      ctx.fillStyle = skin.visor;
      ctx.fillRect(pxSnap(peekX + (isLeft ? 0.5 : 1)), pxSnap(hy + 5), 2, 2.5);
      ctx.fillStyle = skin.visorGlint || "#e0f2fe";
      ctx.fillRect(pxSnap(peekX + (isLeft ? 0.5 : 1.5)), pxSnap(hy + 4), 1.5, 1);
      pxChamfer(ctx, hx - 5.5, hy + 11, 11, 1.8, skin.collar || skin.accent, noOut, "#ffffff44", "#00000044", 0.5);
      return;
    }

    let vx = hx - 5.5 + lookOff * 1.8, vw = 11;
    if (faceDir === "left") { vx = hx - 6.8 + lookOff * 0.9; vw = 7; }
    else if (faceDir === "right") { vx = hx - 0.2 + lookOff * 0.9; vw = 7; }
    else if (faceDir === "down-left") { vx = hx - 6.5 + lookOff * 1.2; vw = 9; }
    else if (faceDir === "down-right") { vx = hx - 2.5 + lookOff * 1.2; vw = 9; }

    const vy = hy + 3;
    const vh = 6.5;

    pxChamfer(ctx, vx - 0.5, vy - 0.5, vw + 1, vh + 1, skin.helmetShade, noOut, null, null, 1.5);
    pxChamfer(ctx, vx, vy, vw, vh, skin.visorDeep || "#082f49", noOut, null, null, 1.5);
    ctx.fillStyle = skin.visorMid || "#0369a1";
    ctx.fillRect(pxSnap(vx + 0.5), pxSnap(vy + 1.5), pxSnap(vw - 1), 3.5);
    ctx.fillStyle = skin.visor;
    ctx.fillRect(pxSnap(vx + 1), pxSnap(vy + 3), pxSnap(vw - 2), 2);

    if (skin.translucentFace) {
      ctx.fillStyle = "rgba(255, 215, 190, 0.18)";
      ctx.fillRect(pxSnap(vx + 1.5), pxSnap(vy + 2), pxSnap(vw - 3), 3);
      if (!eyeBlink) {
        ctx.fillStyle = "rgba(224, 242, 254, 0.45)";
        if (faceDir === "down") {
          ctx.fillRect(pxSnap(hx - 2.5 + lookOff * 2.1), pxSnap(vy + 3), 1.5, 1.5);
          ctx.fillRect(pxSnap(hx + 1 + lookOff * 2.1), pxSnap(vy + 3), 1.5, 1.5);
        } else if (faceDir === "down-left" || faceDir === "down-right") {
          ctx.fillRect(pxSnap(vx + 2 + lookOff * 0.8), pxSnap(vy + 3), 1.5, 1.5);
          ctx.fillRect(pxSnap(vx + 5.5 + lookOff * 0.8), pxSnap(vy + 3), 1.5, 1.5);
        } else {
          const ex = faceDir === "right" ? vx + vw - 2.5 : vx + 1;
          ctx.fillRect(pxSnap(ex + lookOff * 0.6), pxSnap(vy + 3), 1.5, 1.5);
        }
      }
    }

    ctx.fillStyle = skin.visorGlint || "#e0f2fe";
    const gOff = (faceDir === "down" || faceDir === "down-left" || faceDir === "down-right") ? Math.min(1.5, glintShift * 0.4) : 0.5;
    ctx.fillRect(pxSnap(vx + 1 + gOff), pxSnap(vy + 0.5), 3.5, 1);
    ctx.fillRect(pxSnap(vx + 1), pxSnap(vy + 1.5), 1, 2);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(pxSnap(vx + 1.5 + gOff), pxSnap(vy + 0.5), 2, 0.5);
    ctx.fillRect(pxSnap(vx + vw - 2.5), pxSnap(vy + vh - 1.5), 1.5, 1);

    pxChamfer(ctx, hx - 5.5, hy + 11, 11, 1.8, skin.collar || skin.accent, noOut, "#ffffff44", "#00000044", 0.5);
  };

  const drawOxygenPack = (pxX: number, pxY: number, w: number, h: number, side: string | false) => {
    pxChamfer(ctx, pxX, pxY, w, h, skin.pack, noOut, "#94a3b8", skin.packShade || "#1e293b", 1.5);
    ctx.fillStyle = skin.packShade || "#1e293b";
    ctx.fillRect(pxSnap(pxX + 1), pxSnap(pxY + 1.5), pxSnap(w - 2), 2);
    if (!side) {
      ctx.fillRect(pxSnap(pxX + w * 0.5 - 0.5), pxSnap(pxY + 1), 1, pxSnap(h - 2));
    }
    ctx.fillStyle = blink ? skin.packLed : "#1e293b";
    ctx.fillRect(pxSnap(pxX + w - 2.5), pxSnap(pxY + 2), 1.5, 1.5);
    const antX = side === "left" ? pxX + 1 : pxX + w - 1.5;
    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(pxSnap(antX), pxSnap(pxY - 4.8), 1, 5);
    ctx.fillStyle = blink ? skin.packLed : "#64748b";
    ctx.fillRect(pxSnap(antX - 0.25), pxSnap(pxY - 5.8), 1.5, 1.5);
  };

  if (dir === "up") {
    pxChamfer(ctx, -5, -8.5 + stepL, 4.5, 8, skin.pants, noOut, skin.torsoHi, skin.pantsShade, 1);
    pxChamfer(ctx, 0.5, -8.5 + stepR, 4.5, 8, skin.pants, noOut, skin.torsoHi, skin.pantsShade, 1);
    pxChamfer(ctx, -5.5, -3 + stepL, 5, 3, skin.boots, noOut, "#475569", "#0f172a", 1);
    pxChamfer(ctx, 0.5, -3 + stepR, 5, 3, skin.boots, noOut, "#475569", "#0f172a", 1);

    pxChamfer(ctx, -6.5, -18 + breath, 13, 10, skin.torso, noOut, skin.torsoHi, skin.torsoShade, 2);
    pxChamfer(ctx, -9.5, -17 + armL + breath, 3.5, 7, skin.torso, noOut, skin.torsoHi, skin.torsoShade, 1);
    pxChamfer(ctx, 6, -17 + armR + breath, 3.5, 7, skin.torsoShade, noOut, skin.torso, null, 1);
    pxChamfer(ctx, -9.5, -17 + armL + breath, 3.5, 2.5, skin.accent, noOut, "#ffffff44", null, 1);
    pxChamfer(ctx, 6, -17 + armR + breath, 3.5, 2.5, skin.accent, noOut, "#ffffff33", null, 1);
    pxChamfer(ctx, -9.5, -11.5 + armL + breath, 3.5, 2, skin.boots, noOut, "#64748b", null, 0.5);
    pxChamfer(ctx, 6, -11.5 + armR + breath, 3.5, 2, skin.boots, noOut, "#64748b", null, 0.5);

    drawOxygenPack(-5.5, -19.5 + breath, 11, 10.5, false);
    drawBubbleHelmet(0, yTop + headBob, "up");
  } else if (dir === "up-left" || dir === "up-right") {
    const flip = dir === "up-left";
    const fx = (rx: number, rw: number) => (flip ? -rx - rw : rx);

    pxChamfer(ctx, fx(-4.5 - sideStride * 0.45, 4.2), -8.5 + stepL * 0.6, 4.2, 8, skin.pantsShade, noOut, skin.pants, null, 1);
    pxChamfer(ctx, fx(-5 - sideStride * 0.45, 4.8), -3 + stepL * 0.5, 4.8, 3, skin.boots, noOut, "#475569", "#0f172a", 1);
    pxChamfer(ctx, fx(0.2 + sideStride * 0.45, 4.2), -8.5 + stepR * 0.6, 4.2, 8, skin.pants, noOut, skin.torsoHi, skin.pantsShade, 1);
    pxChamfer(ctx, fx(0.2 + sideStride * 0.45, 4.8), -3 + stepR * 0.5, 4.8, 3, skin.boots, noOut, "#64748b", "#0f172a", 1);

    pxChamfer(ctx, fx(5.2, 3), -16.5 + armR * 0.7 + breath, 3, 6.5, skin.torsoShade, noOut, skin.torso, null, 1);
    pxChamfer(ctx, fx(5.2, 3), -11 + armR * 0.7 + breath, 3, 2, skin.boots, noOut, "#64748b", null, 0.5);

    pxChamfer(ctx, fx(-6, 12), -18 + breath, 12, 10, skin.torso, noOut, skin.torsoHi, skin.torsoShade, 2);
    ctx.fillStyle = skin.packShade || "#1e293b";
    ctx.fillRect(pxSnap(fx(-5.5, 11)), pxSnap(-10 + breath), 11, 1.5);

    drawOxygenPack(fx(-7.5, 8.5), -19 + breath, 8.5, 10, flip ? "right" : "left");

    const swing = -sideStride * 0.55;
    pxChamfer(ctx, fx(-7 + swing, 3.5), -16.5 + armL * 0.5 + breath, 3.5, 7, skin.torso, noOut, skin.torsoHi, skin.torsoShade, 1);
    pxChamfer(ctx, fx(-7.2 + swing, 3.8), -17 + armL * 0.5 + breath, 3.8, 2.5, skin.accent, noOut, "#ffffff44", null, 1);
    pxChamfer(ctx, fx(-7 + swing, 3.5), -11 + armL * 0.5 + breath, 3.5, 2, skin.boots, noOut, "#64748b", null, 0.5);

    drawBubbleHelmet(0, yTop + headBob, dir);
  } else if (dir === "left" || dir === "right") {
    const flip = dir === "left";
    const fx = (rx: number, rw: number) => (flip ? -rx - rw : rx);

    drawOxygenPack(fx(-8.5, 5), -18.5 + breath, 5, 9.5, flip ? "right" : "left");

    pxChamfer(ctx, fx(-2.5 - sideStride, 4.5), -8.5, 4.5, 8, skin.pantsShade, noOut, skin.pants, null, 1);
    pxChamfer(ctx, fx(-3 - sideStride, 5.5), -3, 5.5, 3, skin.boots, noOut, "#475569", "#0f172a", 1);
    pxChamfer(ctx, fx(-1.5 + sideStride, 4.5), -8.5, 4.5, 8, skin.pants, noOut, skin.torsoHi, skin.pantsShade, 1);
    pxChamfer(ctx, fx(-1.5 + sideStride, 5.5), -3, 5.5, 3, skin.boots, noOut, "#64748b", "#0f172a", 1);
    ctx.fillStyle = skin.shirt;
    ctx.fillRect(pxSnap(fx(-0.5 + sideStride, 2.5)), pxSnap(-6), 2.5, 1.5);

    pxChamfer(ctx, fx(-5, 10), -18 + breath, 10, 10, skin.torso, noOut, skin.torsoHi, skin.torsoShade, 2);
    pxChamfer(ctx, fx(3, 2.5), -16.5 + breath, 2.5, 5, skin.shirt, noOut, "#64748b", null, 0.5);
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(pxSnap(fx(-4.5, 9)), pxSnap(-10 + breath), 9, 1.5);
    ctx.fillStyle = skin.badge;
    ctx.fillRect(pxSnap(fx(2.5, 2)), pxSnap(-10 + breath), 2, 1.5);

    const swing = -sideStride * 0.7;
    pxChamfer(ctx, fx(-2 + swing, 4), -17 + breath, 4, 7, skin.torso, noOut, skin.torsoHi, skin.torsoShade, 1);
    pxChamfer(ctx, fx(-2.5 + swing, 4.5), -17.5 + breath, 4.5, 3, skin.accent, noOut, "#ffffff55", null, 1);
    ctx.fillStyle = "#1d4ed8";
    ctx.fillRect(pxSnap(fx(-1 + swing, 2.5)), pxSnap(-14 + breath), 2.5, 2);
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(pxSnap(fx(-0.5 + swing, 1.5)), pxSnap(-13.5 + breath), 1.5, 0.5);
    pxChamfer(ctx, fx(-2 + swing, 4), -11 + breath, 4, 2, skin.boots, noOut, "#64748b", null, 0.5);

    drawBubbleHelmet(0, yTop + headBob, dir);
  } else if (dir === "down-left" || dir === "down-right") {
    const flip = dir === "down-left";
    const fx = (rx: number, rw: number) => (flip ? -rx - rw : rx);

    drawOxygenPack(fx(-8.2, 4.5), -18.5 + breath, 4.5, 9, flip ? "right" : "left");

    pxChamfer(ctx, fx(-4.5 - sideStride * 0.5, 4.5), -8.5 + stepL * 0.65, 4.5, 8, skin.pantsShade, noOut, skin.pants, null, 1);
    pxChamfer(ctx, fx(-5 - sideStride * 0.5, 5), -3 + stepL * 0.5, 5, 3, skin.boots, noOut, "#475569", "#0f172a", 1);
    pxChamfer(ctx, fx(0.5 + sideStride * 0.5, 4.5), -8.5 + stepR * 0.65, 4.5, 8, skin.pants, noOut, skin.torsoHi, skin.pantsShade, 1);
    pxChamfer(ctx, fx(0.5 + sideStride * 0.5, 5), -3 + stepR * 0.5, 5, 3, skin.boots, noOut, "#64748b", "#0f172a", 1);
    ctx.fillStyle = skin.shirt;
    ctx.fillRect(pxSnap(fx(1.2 + sideStride * 0.5, 2.5)), pxSnap(-6 + stepR * 0.65), 2.5, 1.5);

    pxChamfer(ctx, fx(4.5, 3.2), -16.5 + armR * 0.75 + breath, 3.2, 6.5, skin.torsoShade, noOut, skin.torso, null, 1);
    pxChamfer(ctx, fx(4.5, 3.5), -17 + armR * 0.75 + breath, 3.5, 2.5, skin.accent, noOut, "#ffffff44", null, 1);
    pxChamfer(ctx, fx(4.5, 3.2), -11 + armR * 0.75 + breath, 3.2, 2, skin.boots, noOut, "#64748b", null, 0.5);

    pxChamfer(ctx, fx(-5.5, 11.5), -18 + breath, 11.5, 10, skin.torso, noOut, skin.torsoHi, skin.torsoShade, 2);
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(pxSnap(fx(-5, 10.5)), pxSnap(-10 + breath), 10.5, 1.8);
    ctx.fillStyle = skin.badge;
    ctx.fillRect(pxSnap(fx(0.5, 2.5)), pxSnap(-10 + breath), 2.5, 1.8);

    pxChamfer(ctx, fx(-0.5, 5), -16 + breath, 5, 4.5, skin.shirt, noOut, "#64748b", "#1e293b", 0.5);
    ctx.fillStyle = "#ef4444"; ctx.fillRect(pxSnap(fx(0.3, 1.2)), pxSnap(-15 + breath), 1.2, 1);
    ctx.fillStyle = "#33ff66"; ctx.fillRect(pxSnap(fx(2.2, 1.2)), pxSnap(-15 + breath), 1.2, 1);
    ctx.fillStyle = "#38bdf8"; ctx.fillRect(pxSnap(fx(0.3, 3.2)), pxSnap(-13 + breath), 3.2, 1);

    const swing = -sideStride * 0.55;
    pxChamfer(ctx, fx(-6.8 + swing, 3.5), -16.5 + armL * 0.5 + breath, 3.5, 7, skin.torso, noOut, skin.torsoHi, skin.torsoShade, 1);
    pxChamfer(ctx, fx(-7 + swing, 3.8), -17 + armL * 0.5 + breath, 3.8, 2.8, skin.accent, noOut, "#ffffff55", null, 1);
    ctx.fillStyle = "#1d4ed8";
    ctx.fillRect(pxSnap(fx(-6 + swing, 2)), pxSnap(-13.8 + armL * 0.5 + breath), 2, 1.8);
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(pxSnap(fx(-5.6 + swing, 1.2)), pxSnap(-13.3 + armL * 0.5 + breath), 1.2, 0.5);
    pxChamfer(ctx, fx(-6.8 + swing, 3.5), -11 + armL * 0.5 + breath, 3.5, 2, skin.boots, noOut, "#64748b", null, 0.5);

    drawBubbleHelmet(0, yTop + headBob, dir);
  } else {
    pxChamfer(ctx, -6.5, -18.5 + breath, 13, 7, skin.packShade || "#1e293b", noOut, "#475569", null, 1);
    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(pxSnap(5.5), pxSnap(-24.8 + breath), 1, 6.5);
    ctx.fillStyle = blink ? skin.packLed : "#64748b";
    ctx.fillRect(pxSnap(5.25), pxSnap(-25.8 + breath), 1.5, 1.5);

    pxChamfer(ctx, -5.5, -8.5 + stepL, 4.5, 8, skin.pants, noOut, skin.torsoHi, skin.pantsShade, 1);
    pxChamfer(ctx, 1, -8.5 + stepR, 4.5, 8, skin.pants, noOut, skin.torsoHi, skin.pantsShade, 1);
    ctx.fillStyle = skin.shirt;
    ctx.fillRect(pxSnap(-4.5), pxSnap(-6 + stepL), 2.5, 1.5);
    ctx.fillRect(pxSnap(2), pxSnap(-6 + stepR), 2.5, 1.5);
    pxChamfer(ctx, -6, -3 + stepL, 5, 3, skin.boots, noOut, "#64748b", "#0f172a", 1);
    pxChamfer(ctx, 1, -3 + stepR, 5, 3, skin.boots, noOut, "#64748b", "#0f172a", 1);

    pxChamfer(ctx, -6.5, -18 + breath, 13, 10, skin.torso, noOut, skin.torsoHi, skin.torsoShade, 2);
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(pxSnap(-6), pxSnap(-10 + breath), 12, 2);
    ctx.fillStyle = skin.badge;
    ctx.fillRect(pxSnap(-1.5), pxSnap(-10 + breath), 3, 2);

    pxChamfer(ctx, -3, -16 + breath, 6, 5, skin.shirt, noOut, "#64748b", "#1e293b", 0.5);
    ctx.fillStyle = "#ef4444"; ctx.fillRect(pxSnap(-2), pxSnap(-15 + breath), 1.5, 1);
    ctx.fillStyle = "#33ff66"; ctx.fillRect(pxSnap(0.5), pxSnap(-15 + breath), 1.5, 1);
    ctx.fillStyle = "#38bdf8"; ctx.fillRect(pxSnap(-2), pxSnap(-13 + breath), 4, 1);

    ctx.fillStyle = "#1d4ed8";
    ctx.fillRect(pxSnap(-5.5), pxSnap(-15.5 + breath), 2, 2);
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(pxSnap(-5), pxSnap(-15 + breath), 1.5, 0.5);
    ctx.fillStyle = skin.accent;
    ctx.fillRect(pxSnap(3.5), pxSnap(-15.5 + breath), 2, 1.5);
    ctx.fillStyle = skin.accent2 || "#38bdf8";
    ctx.fillRect(pxSnap(3.5), pxSnap(-14 + breath), 2, 0.5);

    pxChamfer(ctx, -9.5, -17 + armL + breath, 3.5, 7, skin.torso, noOut, skin.torsoHi, skin.torsoShade, 1);
    pxChamfer(ctx, 6, -17 + armR + breath, 3.5, 7, skin.torsoShade, noOut, skin.torso, null, 1);
    pxChamfer(ctx, -10, -17.5 + armL + breath, 4, 3, skin.accent, noOut, "#ffffff66", null, 1);
    pxChamfer(ctx, 6, -17.5 + armR + breath, 4, 3, skin.accent, noOut, "#ffffff44", null, 1);
    pxChamfer(ctx, -9.5, -11.5 + armL + breath, 3.5, 2, skin.boots, noOut, "#64748b", null, 0.5);
    pxChamfer(ctx, 6, -11.5 + armR + breath, 3.5, 2, skin.boots, noOut, "#64748b", null, 0.5);

    drawBubbleHelmet(0, yTop + headBob, "down");
  }

  if (lightInfo && lightInfo.strength > 0.10) {
    const rimAlpha = Math.min(0.62, lightInfo.strength * 0.65);
    const rimCol = `rgba(${lightInfo.r}, ${lightInfo.g}, ${lightInfo.b}, ${rimAlpha.toFixed(2)})`;
    const towardX = -lightInfo.dirX;
    const towardY = -lightInfo.dirY;
    const rimX = towardX >= 0 ? 5.2 : -6.2;
    const shX = towardX >= 0 ? 6.2 : -9.4;

    ctx.fillStyle = rimCol;
    ctx.fillRect(pxSnap(rimX), pxSnap(yTop + headBob + 2.5), 1.5, 6.5);
    if (towardY <= 0.35) {
      ctx.fillRect(pxSnap(-3.5 + towardX * 1.5), pxSnap(yTop + headBob + 0.5), 6.5, 1.2);
    }
    ctx.fillRect(pxSnap(shX), pxSnap(-17.5 + breath), 2.5, 1.5);
    ctx.fillRect(pxSnap(shX + (towardX >= 0 ? 1.5 : 0)), pxSnap(-16 + breath), 1.2, 4.5);
    if (dir !== "up") {
      ctx.fillStyle = `rgba(${lightInfo.r}, ${lightInfo.g}, ${lightInfo.b}, ${(rimAlpha * 0.55).toFixed(2)})`;
      ctx.fillRect(pxSnap(towardX >= 0 ? 2 : -4.5), pxSnap(yTop + headBob + 4.5), 2.5, 1.5);
    }
  }

  ctx.restore();
}

export interface StationDef {
  id: string;
  shortLabel: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  interactX: number;
  interactY: number;
  radius: number;
  color: string;
}

interface LightDef {
  x: number;
  y: number;
  radius: number;
  r: number;
  g: number;
  b: number;
  key: string;
  intensity: number;
}

interface NavPoint {
  x: number;
  y: number;
}

interface NavGridData {
  key: string;
  cols: number;
  rows: number;
  cellSize: number;
  blocked: Uint8Array;
  cost: Float32Array;
}

interface NPCDef {
  id: string;
  name: string;
  accent: string;
  glow: string;
  suit: string;
  suitShade: string;
  coat: string;
  hair: string;
  skin: string;
  glasses: boolean;
  headset: boolean;
  minLevel: number;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  headingAngle?: number;
  wpIdx: number;
  pauseTimer: number;
  stuckTimer: number;
  steerDir: number;
  walkPhase: number;
  dir: string;
  moving?: boolean;
  path?: NavPoint[];
  pathKey?: string;
  waypoints: { x: number; y: number; pause: number; dir: string; action: string }[];
}

export class CommandCenter {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  overlay: HTMLElement | null;
  onOpenStation: (id: string) => void;
  isModalOpenFn: () => boolean;
  updatePromptFn: (st: StationDef | null) => void;

  W = 480;
  H = 270;

  player = {
    x: 240, y: 204,
    vx: 0, vy: 0,
    speed: 110,
    dir: "down",
    walkPhase: 0,
    dustTimer: 0,
    stuckTimer: 0,
    moving: false,
    idleTime: 0.4,
    startHopTimer: 0,
    jumpY: 0,
    lookOffset: 0,
    squash: 0,
    targetPoint: null as { x: number; y: number } | null,
    pendingStation: null as string | null
  };

  keys: Record<string, boolean> = {};
  nearStation: StationDef | null = null;
  time = 0;
  celebrateTimer = 0;

  cam = {
    x: 240,
    y: 135,
    zoom: 1,
    startX: 240,
    startY: 135,
    startZoom: 1,
    targetX: 240,
    targetY: 135,
    targetZoom: 1,
    tweenElapsed: 0,
    tweenDuration: 0.38,
    tweenActive: false,
    focusId: null as string | null
  };

  stations: StationDef[] = [
    { id: "quests", shortLabel: "1. QUESTS", label: "Quest Board (CML Sector)", x: 34, y: 42, w: 72, h: 42, interactX: 70, interactY: 98, radius: 48, color: "#f59e0b" },
    { id: "workbench", shortLabel: "2. CRT BENCH", label: "4-Segment Workbench & CRT", x: 136, y: 42, w: 92, h: 42, interactX: 182, interactY: 98, radius: 52, color: "#33ff66" },
    { id: "launch", shortLabel: "3. 3D CONSOLE", label: "3D Launch Platform", x: 262, y: 40, w: 96, h: 44, interactX: 310, interactY: 102, radius: 54, color: "#38bdf8" },
    { id: "ranking", shortLabel: "4. TROPHIES", label: "Trophy Hall & Ranking", x: 384, y: 42, w: 68, h: 42, interactX: 418, interactY: 98, radius: 48, color: "#fbbf24" },
    { id: "wardrobe", shortLabel: "5. SUITS", label: "Suit Locker (Skins)", x: 24, y: 104, w: 34, h: 44, interactX: 74, interactY: 130, radius: 48, color: "#c084fc" }
  ];

  navGridCache: NavGridData | null = null;

  npcs: NPCDef[] = [
    {
      id: "lucas", name: "Lucas", accent: "#38bdf8", glow: "rgba(56, 189, 248, 0.36)",
      suit: "#2563eb", suitShade: "#1d4ed8", coat: "#e2e8f0", hair: "#3b2214", skin: "#e5b895",
      glasses: false, headset: true, minLevel: 1, x: 118, y: 218, vx: 0, vy: 0, wpIdx: 0, pauseTimer: 2.2,
      stuckTimer: 0, steerDir: 1, walkPhase: 0.1, dir: "up", path: [], pathKey: "",
      waypoints: [
        { x: 118, y: 218, pause: 3.2, dir: "up", action: "type" },
        { x: 74, y: 102, pause: 2.4, dir: "up", action: "inspect" },
        { x: 164, y: 102, pause: 2.8, dir: "up", action: "type" }
      ]
    },
    {
      id: "marina", name: "Marina", accent: "#33ff66", glow: "rgba(51, 255, 102, 0.36)",
      suit: "#059669", suitShade: "#047857", coat: "#f1f5f9", hair: "#1e1b18", skin: "#d99e73",
      glasses: true, headset: false, minLevel: 1, x: 204, y: 104, vx: 0, vy: 0, wpIdx: 0, pauseTimer: 1.8,
      stuckTimer: 0, steerDir: -1, walkPhase: 0.45, dir: "up", path: [], pathKey: "",
      waypoints: [
        { x: 204, y: 104, pause: 3.0, dir: "up", action: "type" },
        { x: 256, y: 122, pause: 2.0, dir: "down", action: "think" },
        { x: 304, y: 104, pause: 2.6, dir: "up", action: "type" }
      ]
    },
    {
      id: "sagan", name: "Dr. Silva", accent: "#c084fc", glow: "rgba(192, 132, 252, 0.38)",
      suit: "#7c3aed", suitShade: "#6d28d9", coat: "#f8fafc", hair: "#cbd5e1", skin: "#e2b48d",
      glasses: true, headset: false, minLevel: 2, x: 326, y: 184, vx: 0, vy: 0, wpIdx: 0, pauseTimer: 2.5,
      stuckTimer: 0, steerDir: 1, walkPhase: 0.75, dir: "right", path: [], pathKey: "",
      waypoints: [
        { x: 326, y: 184, pause: 2.8, dir: "right", action: "think" },
        { x: 408, y: 194, pause: 3.0, dir: "up", action: "type" },
        { x: 416, y: 104, pause: 2.4, dir: "up", action: "inspect" }
      ]
    }
  ];

  vents = [
    { x: 112, y: 112, w: 24, h: 16 },
    { x: 232, y: 196, w: 28, h: 16 },
    { x: 326, y: 114, w: 22, h: 16 }
  ];

  pillars = [
    { x: 42, y: 204, w: 18, h: 14, sortY: 218, led: "#f59e0b", rgb: [245, 158, 11] },
    { x: 310, y: 204, w: 18, h: 14, sortY: 218, led: "#38bdf8", rgb: [56, 189, 248] }
  ];
  cart = { x: 426, y: 126, w: 18, h: 12, sortY: 138 };
  rover = {
    x: 356, y: 224, dir: "right", wpIdx: 0, pauseTimer: 0.6, wheelPhase: 0,
    waypoints: [
      { x: 438, y: 224, pause: 1.4 },
      { x: 438, y: 198, pause: 1.1 },
      { x: 356, y: 198, pause: 1.5 },
      { x: 356, y: 224, pause: 1.1 }
    ]
  };

  dust = Array.from({ length: 44 }, (_, i) => ({
    x: 24 + ((i * 53) % (480 - 48)),
    y: 54 + ((i * 37) % (270 - 76)),
    vx: (i % 2 === 0 ? 1 : -1) * (2.2 + (i % 4) * 0.85),
    vy: -1.5 - (i % 3) * 0.7,
    size: i % 5 === 0 ? 1.5 : 1,
    phase: i * 0.8
  }));
  footDust: { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number }[] = [];
  steam = Array.from({ length: 22 }, (_, i) => {
    const v = [
      { x: 112, y: 112, w: 24, h: 16 },
      { x: 232, y: 196, w: 28, h: 16 },
      { x: 326, y: 114, w: 22, h: 16 }
    ][i % 3];
    return {
      x: v.x + 4 + ((i * 7) % (v.w - 8)),
      y: v.y + 4 + (i % 6),
      vx: (Math.random() - 0.5) * 4,
      vy: -7 - Math.random() * 6,
      life: Math.random(),
      maxLife: 1.4 + Math.random() * 0.8,
      size: 1.5 + (i % 2) * 0.5,
      ventIdx: i % 3
    };
  });

  outerStars = Array.from({ length: 42 }, (_, i) => ({
    x: (i * 97) % 480,
    y: (i * 61) % 270,
    phase: i * 0.9,
    col: i % 5 === 0 ? "#bae6fd" : i % 7 === 0 ? "#fde68a" : "#ffffff"
  }));

  cables = [
    { color: "#f59e0b", pts: [[70, 84], [70, 134], [296, 134], [296, 84]] },
    { color: "#33ff66", pts: [[182, 84], [182, 124], [306, 124], [306, 84]] },
    { color: "#fbbf24", pts: [[418, 84], [418, 124], [318, 124], [318, 84]] },
    { color: "#c084fc", pts: [[58, 130], [160, 130], [160, 144], [312, 144], [312, 84]] }
  ];
  cableMeta: { totalLen: number; segs: { a: number[]; b: number[]; len: number }[] }[] = [];
  gratingCells: { tx: number; ty: number }[] = [];

  staticBgCanvas: HTMLCanvasElement;
  staticBgCtx: CanvasRenderingContext2D;
  staticBgKey = "";
  zoneGradCache: Record<number, CanvasGradient> = {};
  coneGradCache: Record<string, CanvasGradient> = {};
  spillGradCache: Record<string, CanvasGradient> = {};
  cachedConfigSig = "";
  cachedHasWarn = false;

  lightCanvas: HTMLCanvasElement;
  lightCtx: CanvasRenderingContext2D;
  lightSprites: Record<string, HTMLCanvasElement>;
  frameLights: LightDef[] = [];

  domNodes: {
    plaques: Record<string, HTMLDivElement>;
    plaqueState: Record<string, { left: string; top: string; border: string; color: string; shadow: string }>;
    expansion: HTMLDivElement | null;
    expansionState: { display: string; left: string; top: string };
    npcs: Record<string, { wrap: HTMLDivElement; bubble: HTMLDivElement; tag: HTMLDivElement }>;
    npcState: Record<string, { display: string; left: string; top: string; bDisplay: string; icon: string; border: string; glow: string; color: string }>;
  } = {
    plaques: {},
    plaqueState: {},
    expansion: null,
    expansionState: { display: "", left: "", top: "" },
    npcs: {},
    npcState: {}
  };

  private cleanupHandlers: (() => void)[] = [];

  constructor(
    canvas: HTMLCanvasElement,
    htmlOverlay: HTMLElement | null,
    onOpenStation: (id: string) => void,
    isModalOpenFn: () => boolean,
    updatePromptFn: (st: StationDef | null) => void
  ) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D context unavailable");
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
    this.overlay = htmlOverlay;
    this.onOpenStation = onOpenStation;
    this.isModalOpenFn = isModalOpenFn;
    this.updatePromptFn = updatePromptFn;

    for (const cable of this.cables) {
      let totalLen = 0;
      const segs: { a: number[]; b: number[]; len: number }[] = [];
      for (let i = 0; i < cable.pts.length - 1; i++) {
        const sl = Math.hypot(cable.pts[i + 1][0] - cable.pts[i][0], cable.pts[i + 1][1] - cable.pts[i][1]);
        segs.push({ a: cable.pts[i], b: cable.pts[i + 1], len: sl });
        totalLen += sl;
      }
      this.cableMeta.push({ totalLen, segs });
    }

    const ts = 16;
    for (let ty = 48; ty < this.H - 16; ty += ts) {
      for (let tx = 18; tx < this.W - 18; tx += ts) {
        const gx = Math.round((tx - 18) / ts);
        const gy = Math.round((ty - 48) / ts);
        const isGrating = (gy >= 3 && gy <= 11) && (
          gx === 3 || gx === 25 ||
          ((gy === 5 || gy === 9) && (gx === 7 || gx === 14 || gx === 21))
        );
        if (isGrating) this.gratingCells.push({ tx, ty });
      }
    }

    this.staticBgCanvas = document.createElement("canvas");
    this.staticBgCanvas.width = this.W * 2;
    this.staticBgCanvas.height = this.H * 2;
    this.staticBgCtx = this.staticBgCanvas.getContext("2d")!;
    this.staticBgCtx.imageSmoothingEnabled = false;

    this.lightCanvas = document.createElement("canvas");
    this.lightCanvas.width = 240;
    this.lightCanvas.height = 135;
    this.lightCtx = this.lightCanvas.getContext("2d")!;
    this.lightSprites = this.buildLightSprites();

    this.initHtmlOverlay();
    this.bindInputs();
  }

  buildLightSprites() {
    const defs: Record<string, [number, number, number]> = {
      amber: [245, 158, 11],
      red: [239, 68, 68],
      green: [51, 255, 102],
      cyan: [56, 189, 248],
      purple: [192, 132, 252],
      gold: [251, 191, 36],
      cool: [195, 228, 255]
    };
    const out: Record<string, HTMLCanvasElement> = {};
    for (const [k, [r, g, b]] of Object.entries(defs)) {
      const c = document.createElement("canvas");
      c.width = 64;
      c.height = 64;
      const gctx = c.getContext("2d")!;
      const grad = gctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.95)`);
      grad.addColorStop(0.38, `rgba(${r}, ${g}, ${b}, 0.42)`);
      grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      gctx.fillStyle = grad;
      gctx.fillRect(0, 0, 64, 64);
      out[k] = c;
    }
    return out;
  }

  buildFrameLights(lvl: number) {
    const pulse = 0.72 + 0.28 * Math.sin(this.time * 3.0);
    const lights = this.frameLights;
    lights.length = 0;

    lights.push(
      { x: 70, y: 68, radius: 96, r: 245, g: 158, b: 11, key: "amber", intensity: 0.92 },
      { x: 164, y: 68, radius: 94, r: 51, g: 255, b: 102, key: "green", intensity: 0.95 },
      { x: 206, y: 68, radius: 74, r: 56, g: 189, b: 248, key: "cyan", intensity: 0.65 },
      { x: 304, y: 66, radius: 108, r: 56, g: 189, b: 248, key: "cyan", intensity: 1.0 },
      { x: 418, y: 66, radius: 88, r: 251, g: 191, b: 36, key: "gold", intensity: 0.85 },
      { x: 41, y: 126, radius: 82, r: 192, g: 132, b: 252, key: "purple", intensity: 0.85 },
      { x: 112, y: 192, radius: 74, r: lvl === 1 ? 245 : 51, g: lvl === 1 ? 158 : 255, b: lvl === 1 ? 11 : 102, key: lvl === 1 ? "amber" : "green", intensity: 0.78 },
      { x: 51, y: 204, radius: 52, r: 245, g: 158, b: 11, key: "amber", intensity: 0.55 * pulse },
      { x: 319, y: 204, radius: 56, r: 56, g: 189, b: 248, key: "cyan", intensity: 0.6 * pulse },
      { x: 240, y: 110, radius: 90, r: 56, g: 189, b: 248, key: "cyan", intensity: 0.42 * pulse }
    );

    if (lvl === 1) {
      for (let lx = 44; lx < this.W - 40; lx += 86) {
        const isRed = (Math.floor(lx / 86) % 2) === 1;
        const rot = this.time * 2.4 + lx * 0.03;
        const p = 0.5 + 0.5 * Math.sin(rot);
        lights.push({
          x: lx + 6 + Math.cos(rot) * 28,
          y: 88 + Math.abs(Math.sin(rot)) * 18,
          radius: 78,
          r: isRed ? 239 : 245,
          g: isRed ? 68 : 158,
          b: isRed ? 68 : 11,
          key: isRed ? "red" : "amber",
          intensity: 0.45 + p * 0.45
        });
      }
    } else if (lvl === 3) {
      lights.push({ x: 242, y: 162, radius: 105, r: 56, g: 189, b: 248, key: "cyan", intensity: 0.95 });
    }

    const doneMissions = progress.completedMissions;
    if (doneMissions.includes("m1_cml1")) lights.push({ x: 220, y: 56, radius: 46, r: 56, g: 189, b: 248, key: "cyan", intensity: 0.55 * pulse });
    if (doneMissions.includes("m2_cml2")) lights.push({ x: 371, y: 68, radius: 52, r: 195, g: 228, b: 255, key: "cool", intensity: 0.7 });
    if (doneMissions.includes("m3_cml3")) lights.push({ x: 24, y: 173, radius: 66, r: 245, g: 158, b: 11, key: "amber", intensity: 0.72 * pulse });
    if (doneMissions.includes("m4_cml4")) lights.push({ x: 245, y: 62, radius: 74, r: 251, g: 191, b: 36, key: "gold", intensity: 0.95 });
    if (doneMissions.includes("m6_europa")) lights.push({ x: 452, y: 130, radius: 54, r: 56, g: 189, b: 248, key: "cyan", intensity: 0.85 * pulse });
    if (doneMissions.includes("m7_dart") && lvl < 3) lights.push({ x: 242, y: 158, radius: 56, r: 251, g: 191, b: 36, key: "gold", intensity: 0.65 });
    if (doneMissions.includes("m8_cassini")) lights.push({ x: 166, y: 194, radius: 54, r: 251, g: 191, b: 36, key: "gold", intensity: 0.75 * pulse });
    if (doneMissions.includes("m9_parker")) lights.push({ x: 120, y: 64, radius: 56, r: 245, g: 158, b: 11, key: "amber", intensity: 0.85 * pulse });
    if (doneMissions.includes("m10_gateway")) lights.push({ x: 354, y: 168, radius: 58, r: 56, g: 189, b: 248, key: "cyan", intensity: 0.86 });
    if (doneMissions.includes("m11_juno")) lights.push({ x: 75, y: 208, radius: 66, r: 51, g: 255, b: 102, key: "green", intensity: 0.9 * pulse });
    if (doneMissions.includes("m12_roman")) lights.push({ x: 455, y: 167, radius: 54, r: 192, g: 132, b: 252, key: "purple", intensity: 0.72 * pulse });
    if (doneMissions.includes("m13_dragonfly")) lights.push({ x: 30, y: 210, radius: 48, r: 56, g: 189, b: 248, key: "cyan", intensity: 0.65 * pulse });
    if (doneMissions.includes("m14_voyager")) lights.push({ x: 267, y: 36, radius: 54, r: 251, g: 191, b: 36, key: "gold", intensity: 0.85 });
    if (doneMissions.includes("m15_marsbase")) lights.push({ x: 242, y: 162, radius: 96, r: 245, g: 158, b: 11, key: "amber", intensity: 0.92 * pulse });

    lights.push({ x: this.player.x, y: this.player.y - 8, radius: 58, r: 195, g: 228, b: 255, key: "cool", intensity: 0.45 });
    return lights;
  }

  sampleLightAt(x: number, y: number, lights: LightDef[]): LightSample {
    let sumW = 0, sumR = 0, sumG = 0, sumB = 0;
    let domDx = 0.4, domDy = 0.6, bestW = 0;
    for (let i = 0; i < lights.length; i++) {
      const l = lights[i];
      const dx = x - l.x;
      const dy = y - l.y;
      const dist = Math.hypot(dx, dy);
      if (dist >= l.radius || dist < 0.01) continue;
      const falloff = 1 - dist / l.radius;
      const w = falloff * falloff * l.intensity;
      sumW += w;
      sumR += l.r * w;
      sumG += l.g * w;
      sumB += l.b * w;
      if (w > bestW && l.key !== "cool") {
        bestW = w;
        domDx = dx / dist;
        domDy = dy / dist;
      }
    }
    if (sumW <= 0.001) {
      return { r: 148, g: 184, b: 224, strength: 0.14, dirX: 0.35, dirY: 0.55 };
    }
    return {
      r: Math.min(255, Math.round(sumR / sumW)),
      g: Math.min(255, Math.round(sumG / sumW)),
      b: Math.min(255, Math.round(sumB / sumW)),
      strength: Math.min(1, sumW * 0.72),
      dirX: domDx,
      dirY: domDy
    };
  }

  spawnFootDust(x: number, y: number, vx: number, vy: number, count = 3) {
    for (let i = 0; i < count; i++) {
      this.footDust.push({
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 2.5,
        vx: -vx * 0.14 + (Math.random() - 0.5) * 14,
        vy: -vy * 0.14 - 4 - Math.random() * 6,
        life: 0,
        maxLife: 0.42 + Math.random() * 0.24,
        size: 1.2 + Math.random() * 0.9
      });
    }
  }

  initHtmlOverlay() {
    if (!this.overlay) return;
    this.overlay.innerHTML = "";

    for (const st of this.stations) {
      const el = document.createElement("div");
      el.className = "pixel-label absolute -translate-x-1/2 -translate-y-full px-1.5 py-0.5 text-[9px] sm:text-[10px] leading-none border bg-[#060910]/90 whitespace-nowrap transition-colors";
      el.textContent = st.shortLabel;
      this.overlay.appendChild(el);
      this.domNodes.plaques[st.id] = el;
    }

    const exp = document.createElement("div");
    exp.className = "pixel-label absolute -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none leading-snug";
    exp.innerHTML = `<div class="text-[9px] sm:text-[10px] text-amber-300">EXPANSION LOCKED</div><div class="text-[8px] sm:text-[9px] text-slate-300 mt-0.5">COMPLETE 1 MISSION</div>`;
    exp.style.left = `${(405 / this.W) * 100}%`;
    exp.style.top = `${(202 / this.H) * 100}%`;
    this.overlay.appendChild(exp);
    this.domNodes.expansion = exp;
    this.refreshLanguage();

    for (const npc of this.npcs) {
      const wrap = document.createElement("div");
      wrap.className = "absolute -translate-x-1/2 -translate-y-full flex flex-col items-center";
      const bubble = document.createElement("div");
      bubble.className = "npc-speech-bubble pixel-label text-[9px] sm:text-[10px] text-white leading-none whitespace-nowrap";
      const tag = document.createElement("div");
      tag.className = "pixel-label text-[8px] leading-none mt-0.5";
      tag.style.color = npc.accent || "#cbd5e1";
      tag.textContent = npc.name;
      wrap.appendChild(bubble);
      wrap.appendChild(tag);
      this.overlay.appendChild(wrap);
      this.domNodes.npcs[npc.id] = { wrap, bubble, tag };
    }
  }

  refreshLanguage() {
    const isEn = getLang() === "en";
    const stationMeta: Record<string, { short: string; label: string }> = isEn
      ? {
          quests: { short: "1. QUESTS", label: "Quest Board (CML Sector)" },
          workbench: { short: "2. CRT BENCH", label: "4-Segment Workbench & CRT" },
          launch: { short: "3. 3D CONSOLE", label: "3D Launch Platform" },
          ranking: { short: "4. TROPHIES", label: "Trophy Hall & Ranking" },
          wardrobe: { short: "5. SUITS", label: "Suit Locker (Skins)" }
        }
      : {
          quests: { short: "1. QUESTS", label: "Mural de Quests (Setor CML)" },
          workbench: { short: "2. BANCADA CRT", label: "Bancada 4 Segmentos & CRT" },
          launch: { short: "3. CONSOLE 3D", label: "Plataforma de Lançamento 3D" },
          ranking: { short: "4. TROFÉUS", label: "Sala de Troféus e Ranking" },
          wardrobe: { short: "5. TRAJES", label: "Armário de Trajes (Skins)" }
        };

    for (const st of this.stations) {
      const meta = stationMeta[st.id];
      if (!meta) continue;
      st.shortLabel = meta.short;
      st.label = meta.label;
      const el = this.domNodes.plaques[st.id];
      if (el) el.textContent = meta.short;
    }

    if (this.domNodes.expansion) {
      this.domNodes.expansion.innerHTML = `<div class="text-[9px] sm:text-[10px] text-amber-300">${t("expansionLocked")}</div><div class="text-[8px] sm:text-[9px] text-slate-300 mt-0.5">${t("expansionUnlock")}</div>`;
    }
  }

  clearInputState() {
    this.keys = {};
    this.player.targetPoint = null;
    this.player.pendingStation = null;
    this.player.stuckTimer = 0;
  }

  bindInputs() {
    const onKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement && ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) return;
      const k = e.key.toLowerCase();
      if (this.isModalOpenFn()) {
        this.keys[k] = false;
        return;
      }
      this.keys[k] = true;
      if (["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) e.preventDefault();
      if ((k === "e" || k === "enter") && this.nearStation) {
        e.preventDefault();
        this.clearInputState();
        this.onOpenStation(this.nearStation.id);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => { this.keys[e.key.toLowerCase()] = false; };
    const onBlur = () => this.clearInputState();
    const onCanvasClick = (e: MouseEvent) => {
      if (this.isModalOpenFn() || this.cam.tweenActive) return;
      const rect = this.canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const vx = ((e.clientX - rect.left) / rect.width) * this.W;
      const vy = ((e.clientY - rect.top) / rect.height) * this.H;
      const cx = (vx - this.W * 0.5) / this.cam.zoom + this.cam.x;
      const cy = (vy - this.H * 0.5) / this.cam.zoom + this.cam.y;

      for (const st of this.stations) {
        if (cx >= st.x - 10 && cx <= st.x + st.w + 10 && cy >= st.y - 12 && cy <= st.y + st.h + 14) {
          const dist = Math.hypot(this.player.x - st.interactX, this.player.y - st.interactY);
          if (dist <= st.radius + 14) {
            this.clearInputState();
            this.onOpenStation(st.id);
          } else {
            this.player.targetPoint = { x: st.interactX, y: st.interactY };
            this.player.pendingStation = st.id;
            this.player.stuckTimer = 0;
          }
          return;
        }
      }
      this.player.pendingStation = null;
      this.player.stuckTimer = 0;
      this.player.targetPoint = {
        x: Math.max(26, Math.min(this.W - 26, cx)),
        y: Math.max(88, Math.min(this.H - 24, cy))
      };
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    this.canvas.addEventListener("click", onCanvasClick);

    this.cleanupHandlers.push(() => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      this.canvas.removeEventListener("click", onCanvasClick);
    });
  }

  dispose() {
    this.cleanupHandlers.forEach(fn => fn());
    this.cleanupHandlers = [];
  }

  setVirtualKey(dir: string, active: boolean) {
    const map: Record<string, string> = { up: "w", down: "s", left: "a", right: "d" };
    if (map[dir]) this.keys[map[dir]] = Boolean(active);
  }

  setCameraTarget(wx: number, wy: number, zoom = 1, duration = 0.38) {
    const z = Math.max(1, Math.min(2.1, zoom));
    const halfW = (this.W * 0.5) / z;
    const halfH = (this.H * 0.5) / z;
    this.cam.startX = this.cam.x;
    this.cam.startY = this.cam.y;
    this.cam.startZoom = this.cam.zoom;
    this.cam.targetZoom = z;
    this.cam.targetX = Math.max(halfW, Math.min(this.W - halfW, wx));
    this.cam.targetY = Math.max(halfH, Math.min(this.H - halfH, wy));
    this.cam.tweenElapsed = 0;
    this.cam.tweenDuration = duration;
    this.cam.tweenActive = true;
  }

  focusStation(id: string) {
    const st = this.stations.find(s => s.id === id);
    if (!st) return;
    this.cam.focusId = id;
    this.setCameraTarget(st.x + st.w * 0.5, st.y + st.h * 0.5 + 14, 1.74, 0.38);
  }

  clearCameraFocus() {
    this.cam.focusId = null;
    this.setCameraTarget(this.W * 0.5, this.H * 0.5, 1, 0.38);
  }

  worldToOverlayPct(wx: number, wy: number) {
    const sx = (wx - this.cam.x) * this.cam.zoom + this.W * 0.5;
    const sy = (wy - this.cam.y) * this.cam.zoom + this.H * 0.5;
    return {
      left: `${(sx / this.W) * 100}%`,
      top: `${(sy / this.H) * 100}%`
    };
  }

  triggerCelebration() { this.celebrateTimer = 6.5; }

  getObstacles(lvl: number) {
    const obs = [
      { x: 0, y: 0, w: 480, h: 52 },
      { x: 0, y: 252, w: 480, h: 18 },
      { x: 0, y: 0, w: 18, h: 270 },
      { x: 462, y: 0, w: 18, h: 270 },
      { x: 32, y: 42, w: 76, h: 44 },
      { x: 134, y: 42, w: 96, h: 44 },
      { x: 260, y: 40, w: 100, h: 46 },
      { x: 382, y: 42, w: 72, h: 44 },
      { x: 22, y: 104, w: 38, h: 46 },
      { x: 88, y: 182, w: 60, h: 28 },
      { x: 42, y: 204, w: 18, h: 14 },
      { x: 310, y: 204, w: 18, h: 14 },
      { x: 426, y: 126, w: 18, h: 12 }
    ];
    if (lvl === 1) obs.push({ x: 348, y: 152, w: 114, h: 100 });
    else obs.push({ x: 372, y: 158, w: 72, h: 26 });
    if (lvl === 3) obs.push({ x: 206, y: 150, w: 72, h: 32 });

    const doneMissions = progress.completedMissions;
    if (doneMissions.includes("m2_cml2")) obs.push({ x: 363, y: 52, w: 17, h: 28 });
    if (doneMissions.includes("m4_cml4")) obs.push({ x: 232, y: 46, w: 26, h: 30 });
    if (doneMissions.includes("m6_europa")) obs.push({ x: 446, y: 122, w: 12, h: 18 });
    if (doneMissions.includes("m7_dart") && lvl < 3) obs.push({ x: 234, y: 152, w: 16, h: 14 });
    if (doneMissions.includes("m8_cassini")) obs.push({ x: 156, y: 188, w: 20, h: 18 });
    if (doneMissions.includes("m9_parker")) obs.push({ x: 110, y: 50, w: 20, h: 26 });
    if (doneMissions.includes("m10_gateway")) obs.push({ x: 344, y: 156, w: 20, h: 24 });
    if (doneMissions.includes("m11_juno")) obs.push({ x: 66, y: 200, w: 18, h: 18 });
    if (doneMissions.includes("m13_dragonfly")) obs.push({ x: 22, y: 204, w: 16, h: 14 });
    return obs;
  }

  collides(nx: number, ny: number, lvl: number, hw = 7, hh = 5) {
    for (const o of this.getObstacles(lvl)) {
      if (nx + hw > o.x && nx - hw < o.x + o.w && ny + hh > o.y && ny - hh < o.y + o.h) return true;
    }
    return false;
  }

  getNavKey(lvl: number): string {
    return `${lvl}:${progress.completedMissions.join(",")}`;
  }

  getNavGrid(lvl: number): NavGridData {
    const key = this.getNavKey(lvl);
    if (this.navGridCache && this.navGridCache.key === key) {
      return this.navGridCache;
    }
    const cellSize = 8;
    const cols = Math.ceil(this.W / cellSize);
    const rows = Math.ceil(this.H / cellSize);
    const blocked = new Uint8Array(cols * rows);
    const cost = new Float32Array(cols * rows);
    cost.fill(1);

    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        const cx = gx * cellSize + cellSize * 0.5;
        const cy = gy * cellSize + cellSize * 0.5;
        if (this.collides(cx, cy, lvl, 7.5, 5.5)) {
          blocked[gy * cols + gx] = 1;
        }
      }
    }

    // Penaliza células coladas em obstáculos para rotas naturalmente centralizadas
    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        const idx = gy * cols + gx;
        if (blocked[idx]) continue;
        let nearWall = false;
        for (let oy = -1; oy <= 1 && !nearWall; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            const nx = gx + ox;
            const ny = gy + oy;
            if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || blocked[ny * cols + nx]) {
              nearWall = true;
              break;
            }
          }
        }
        if (nearWall) cost[idx] = 2.1;
      }
    }

    this.navGridCache = { key, cols, rows, cellSize, blocked, cost };
    return this.navGridCache;
  }

  hasLineOfSight(ax: number, ay: number, bx: number, by: number, lvl: number, hw = 7.4, hh = 5.4): boolean {
    const dist = Math.hypot(bx - ax, by - ay);
    const steps = Math.max(2, Math.ceil(dist / 3.5));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const sx = ax + (bx - ax) * t;
      const sy = ay + (by - ay) * t;
      if (this.collides(sx, sy, lvl, hw, hh)) return false;
    }
    return true;
  }

  findNearestWalkableCell(grid: NavGridData, wx: number, wy: number): number {
    const startGx = Math.max(0, Math.min(grid.cols - 1, Math.floor(wx / grid.cellSize)));
    const startGy = Math.max(0, Math.min(grid.rows - 1, Math.floor(wy / grid.cellSize)));
    const startIdx = startGy * grid.cols + startGx;
    if (!grid.blocked[startIdx]) return startIdx;

    let bestIdx = -1;
    let bestDist = Infinity;
    for (let r = 1; r <= 5; r++) {
      for (let oy = -r; oy <= r; oy++) {
        for (let ox = -r; ox <= r; ox++) {
          const nx = startGx + ox;
          const ny = startGy + oy;
          if (nx < 0 || ny < 0 || nx >= grid.cols || ny >= grid.rows) continue;
          const idx = ny * grid.cols + nx;
          if (grid.blocked[idx]) continue;
          const cx = nx * grid.cellSize + grid.cellSize * 0.5;
          const cy = ny * grid.cellSize + grid.cellSize * 0.5;
          const d = Math.hypot(cx - wx, cy - wy);
          if (d < bestDist) {
            bestDist = d;
            bestIdx = idx;
          }
        }
      }
      if (bestIdx !== -1) return bestIdx;
    }
    return startIdx;
  }

  computeNpcPath(sx: number, sy: number, tx: number, ty: number, lvl: number): NavPoint[] {
    // Atalho direto se toda a linha de visão estiver completamente livre de obstáculos
    if (this.hasLineOfSight(sx, sy, tx, ty, lvl, 7.6, 5.6)) {
      return [{ x: tx, y: ty }];
    }

    const grid = this.getNavGrid(lvl);
    const total = grid.cols * grid.rows;
    const startIdx = this.findNearestWalkableCell(grid, sx, sy);
    const goalIdx = this.findNearestWalkableCell(grid, tx, ty);

    if (startIdx === goalIdx || grid.blocked[goalIdx]) {
      return [{ x: tx, y: ty }];
    }

    const goalGx = goalIdx % grid.cols;
    const goalGy = Math.floor(goalIdx / grid.cols);

    const gScore = new Float32Array(total);
    const fScore = new Float32Array(total);
    const cameFrom = new Int32Array(total);
    const closed = new Uint8Array(total);
    gScore.fill(Infinity);
    fScore.fill(Infinity);
    cameFrom.fill(-1);

    const heuristic = (idx: number) => {
      const gx = idx % grid.cols;
      const gy = Math.floor(idx / grid.cols);
      const dx = Math.abs(gx - goalGx);
      const dy = Math.abs(gy - goalGy);
      return Math.max(dx, dy) + 0.41421356 * Math.min(dx, dy);
    };

    gScore[startIdx] = 0;
    fScore[startIdx] = heuristic(startIdx);
    const open: number[] = [startIdx];
    const inOpen = new Uint8Array(total);
    inOpen[startIdx] = 1;

    const dirs = [
      [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
      [1, 1, 1.4142], [1, -1, 1.4142], [-1, 1, 1.4142], [-1, -1, 1.4142]
    ];

    let found = false;
    while (open.length > 0) {
      let bestPos = 0;
      let bestF = fScore[open[0]];
      for (let i = 1; i < open.length; i++) {
        const f = fScore[open[i]];
        if (f < bestF) {
          bestF = f;
          bestPos = i;
        }
      }

      const current = open[bestPos];
      open[bestPos] = open[open.length - 1];
      open.pop();
      inOpen[current] = 0;

      if (current === goalIdx) {
        found = true;
        break;
      }
      closed[current] = 1;

      const cx = current % grid.cols;
      const cy = Math.floor(current / grid.cols);

      for (let d = 0; d < dirs.length; d++) {
        const ox = dirs[d][0];
        const oy = dirs[d][1];
        const stepLen = dirs[d][2];
        const nx = cx + ox;
        const ny = cy + oy;
        if (nx < 0 || ny < 0 || nx >= grid.cols || ny >= grid.rows) continue;
        const nIdx = ny * grid.cols + nx;
        if (closed[nIdx] || grid.blocked[nIdx]) continue;

        // Evita cortar cantos em diagonal através de quinas de móveis ou pilares
        if (ox !== 0 && oy !== 0) {
          if (grid.blocked[cy * grid.cols + nx] || grid.blocked[ny * grid.cols + cx]) continue;
        }

        const tentativeG = gScore[current] + stepLen * grid.cost[nIdx];
        if (tentativeG < gScore[nIdx]) {
          cameFrom[nIdx] = current;
          gScore[nIdx] = tentativeG;
          fScore[nIdx] = tentativeG + heuristic(nIdx);
          if (!inOpen[nIdx]) {
            open.push(nIdx);
            inOpen[nIdx] = 1;
          }
        }
      }
    }

    if (!found) {
      return [{ x: tx, y: ty }];
    }

    // Reconstrói sequência de pontos em coordenadas do mundo
    const rawPts: NavPoint[] = [];
    let cur = goalIdx;
    while (cur !== -1 && cur !== startIdx) {
      const gx = cur % grid.cols;
      const gy = Math.floor(cur / grid.cols);
      rawPts.push({
        x: gx * grid.cellSize + grid.cellSize * 0.5,
        y: gy * grid.cellSize + grid.cellSize * 0.5
      });
      cur = cameFrom[cur];
    }
    rawPts.reverse();
    if (rawPts.length > 0) {
      rawPts[rawPts.length - 1] = { x: tx, y: ty };
    } else {
      rawPts.push({ x: tx, y: ty });
    }

    // String-pulling (Line-of-Sight smoothing): reduz escadinhas de grade em curvas naturais pelos cantos
    const smoothed: NavPoint[] = [];
    let anchorX = sx;
    let anchorY = sy;
    let i = 0;
    while (i < rawPts.length) {
      let farthest = i;
      for (let j = rawPts.length - 1; j > i; j--) {
        if (this.hasLineOfSight(anchorX, anchorY, rawPts[j].x, rawPts[j].y, lvl, 7.6, 5.6)) {
          farthest = j;
          break;
        }
      }
      const chosen = rawPts[farthest];
      smoothed.push(chosen);
      anchorX = chosen.x;
      anchorY = chosen.y;
      i = farthest + 1;
    }

    return smoothed.length > 0 ? smoothed : [{ x: tx, y: ty }];
  }

  ensureNpcUnstuck(npc: NPCDef, lvl: number) {
    if (!this.collides(npc.x, npc.y, lvl)) return;
    const offsets = [[0, 12], [0, -12], [-14, 0], [14, 0], [-14, 14], [14, 14], [0, 24], [-24, 0], [24, 0]];
    for (const [ox, oy] of offsets) {
      const nx = Math.max(26, Math.min(this.W - 26, npc.x + ox));
      const ny = Math.max(88, Math.min(this.H - 24, npc.y + oy));
      if (!this.collides(nx, ny, lvl)) {
        npc.x = nx;
        npc.y = ny;
        return;
      }
    }
  }

  updateNPCs(dt: number, lvl: number) {
    const navKey = this.getNavKey(lvl);
    const maxSpeed = 42;

    for (const npc of this.npcs) {
      if (lvl < npc.minLevel) continue;
      this.ensureNpcUnstuck(npc, lvl);

      const wp = npc.waypoints[npc.wpIdx];
      if (npc.vx === undefined) npc.vx = 0;
      if (npc.vy === undefined) npc.vy = 0;
      if (!npc.path) npc.path = [];

      if (npc.pauseTimer > 0) {
        npc.pauseTimer -= dt;
        npc.vx = 0;
        npc.vy = 0;
        npc.dir = wp.dir;
        npc.moving = false;
        npc.stuckTimer = 0;
        npc.path = [];
        npc.pathKey = "";
        npc.walkPhase = (npc.walkPhase + dt * 0.4) % 1;
        continue;
      }

      const finalDist = Math.hypot(wp.x - npc.x, wp.y - npc.y);
      if (finalDist < 3.0) {
        if (!this.collides(wp.x, wp.y, lvl)) {
          npc.x = wp.x;
          npc.y = wp.y;
        }
        npc.vx = 0;
        npc.vy = 0;
        npc.pauseTimer = wp.pause;
        npc.stuckTimer = 0;
        npc.path = [];
        npc.pathKey = "";
        npc.wpIdx = (npc.wpIdx + 1) % npc.waypoints.length;
        npc.moving = false;
        continue;
      }

      const desiredKey = `${navKey}#${npc.wpIdx}`;
      if (npc.pathKey !== desiredKey || npc.path.length === 0) {
        npc.path = this.computeNpcPath(npc.x, npc.y, wp.x, wp.y, lvl);
        npc.pathKey = desiredKey;
      }

      // Avança suavemente por waypoints intermediários ao contornar quinas de bancadas
      while (npc.path.length > 1) {
        const node = npc.path[0];
        const next = npc.path[1];
        const dNode = Math.hypot(node.x - npc.x, node.y - npc.y);
        if (dNode < 9.5 || (dNode < 18 && this.hasLineOfSight(npc.x, npc.y, next.x, next.y, lvl, 7.6, 5.6))) {
          npc.path.shift();
        } else {
          break;
        }
      }

      const target = npc.path[0] || wp;
      let tx = target.x - npc.x;
      let ty = target.y - npc.y;
      let tDist = Math.hypot(tx, ty);
      if (tDist < 0.001) tDist = 0.001;

      // Direção base em direção ao próximo waypoint intermediário
      let steerX = tx / tDist;
      let steerY = ty / tDist;

      // Desvio local preditivo (Lookahead Steering) + separação suave entre cientistas
      const lookDist = 11;
      const aheadX = npc.x + steerX * lookDist;
      const aheadY = npc.y + steerY * lookDist;
      if (this.collides(aheadX, aheadY, lvl, 7.5, 5.5)) {
        const baseAng = Math.atan2(steerY, steerX);
        const sgn = npc.steerDir || 1;
        const probes = [0.55 * sgn, -0.55 * sgn, 1.05 * sgn, -1.05 * sgn, 1.5 * sgn, -1.5 * sgn];
        for (const offsetAng of probes) {
          const a = baseAng + offsetAng;
          if (!this.collides(npc.x + Math.cos(a) * lookDist, npc.y + Math.sin(a) * lookDist, lvl, 7.4, 5.4)) {
            steerX = steerX * 0.35 + Math.cos(a) * 0.65;
            steerY = steerY * 0.35 + Math.sin(a) * 0.65;
            break;
          }
        }
      }

      // Separação orgânica suave para NPCs não se sobreporem nos corredores
      for (const other of this.npcs) {
        if (other === npc || lvl < other.minLevel) continue;
        const ox = npc.x - other.x;
        const oy = npc.y - other.y;
        const od = Math.hypot(ox, oy);
        if (od > 0.01 && od < 17) {
          const push = ((17 - od) / 17) * 0.55;
          steerX += (ox / od) * push;
          steerY += (oy / od) * push;
        }
      }

      const steerLen = Math.hypot(steerX, steerY) || 1;
      steerX /= steerLen;
      steerY /= steerLen;

      // Desaceleração suave na aproximação ao destino final
      const targetSpeed = finalDist < 16 ? maxSpeed * Math.max(0.42, finalDist / 16) : maxSpeed;
      const desiredVx = steerX * targetSpeed;
      const desiredVy = steerY * targetSpeed;

      // Interpolação vetorial contínua (suaviza curvas ao redor de bancadas e pilares)
      const turnBlend = 1 - Math.exp(-10.5 * dt);
      npc.vx += (desiredVx - npc.vx) * turnBlend;
      npc.vy += (desiredVy - npc.vy) * turnBlend;

      const stepX = npc.vx * dt;
      const stepY = npc.vy * dt;
      const prevX = npc.x;
      const prevY = npc.y;

      // Resolução rígida por eixo garante que nenhum cientista atravesse bancadas ou pilares
      if (!this.collides(npc.x + stepX, npc.y, lvl)) {
        npc.x += stepX;
      } else {
        npc.vx *= 0.15;
      }
      if (!this.collides(npc.x, npc.y + stepY, lvl)) {
        npc.y += stepY;
      } else {
        npc.vy *= 0.15;
      }

      const actualDx = npc.x - prevX;
      const actualDy = npc.y - prevY;
      const moved = Math.hypot(actualDx, actualDy);
      const minExpected = targetSpeed * dt * 0.22;

      if (moved < minExpected) {
        npc.stuckTimer = (npc.stuckTimer || 0) + dt;
        npc.moving = moved > 0.08;
        if (npc.stuckTimer > 0.45) {
          // Recalcula imediatamente a rota A* se houver novo obstáculo ou bloqueio momentâneo
          npc.stuckTimer = 0;
          npc.steerDir = -(npc.steerDir || 1);
          npc.path = this.computeNpcPath(npc.x, npc.y, wp.x, wp.y, lvl);
          npc.pathKey = desiredKey;
        }
      } else {
        npc.stuckTimer = 0;
        npc.moving = true;

        // Sincroniza a direção da animação pixel art com o vetor real de velocidade/movimento
        const vecX = Math.hypot(npc.vx, npc.vy) > 6 ? npc.vx : actualDx;
        const vecY = Math.hypot(npc.vx, npc.vy) > 6 ? npc.vy : actualDy;
        npc.dir = dirFromVector(vecX, vecY);

        const speedRatio = Math.min(1.25, (moved / Math.max(0.0001, dt)) / maxSpeed);
        const prevPhase = npc.walkPhase;
        npc.walkPhase = (npc.walkPhase + dt * 1.95 * Math.max(0.5, speedRatio)) % 1;
        if ((prevPhase < 0.5 && npc.walkPhase >= 0.5) || npc.walkPhase < prevPhase) {
          this.spawnFootDust(npc.x, npc.y, (actualDx / dt) * 0.55, (actualDy / dt) * 0.55, 1);
        }
      }
    }
  }

  update(dt: number) {
    this.time += dt;
    if (this.celebrateTimer > 0) this.celebrateTimer = Math.max(0, this.celebrateTimer - dt);

    for (const m of this.dust) {
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      if (m.x < 20) m.x = this.W - 22;
      if (m.x > this.W - 20) m.x = 22;
      if (m.y < 52) m.y = this.H - 22;
      if (m.y > this.H - 20) m.y = 54;
    }

    for (const s of this.steam) {
      s.life += dt;
      if (s.life >= s.maxLife) {
        const v = this.vents[s.ventIdx];
        s.life = 0;
        s.x = v.x + 3 + Math.random() * (v.w - 6);
        s.y = v.y + 3 + Math.random() * (v.h - 6);
        s.vx = (Math.random() - 0.5) * 5;
        s.vy = -7 - Math.random() * 6;
      } else {
        s.x += (s.vx + Math.sin(this.time * 2.4 + s.ventIdx) * 2) * dt;
        s.y += s.vy * dt;
      }
    }

    for (let i = this.footDust.length - 1; i >= 0; i--) {
      const p = this.footDust[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.footDust.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.pow(0.92, dt * 60);
      p.vy *= Math.pow(0.92, dt * 60);
    }

    if (this.cam.tweenActive) {
      this.cam.tweenElapsed += dt;
      const t = Math.min(1, this.cam.tweenElapsed / Math.max(0.01, this.cam.tweenDuration));
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      this.cam.x = this.cam.startX + (this.cam.targetX - this.cam.startX) * e;
      this.cam.y = this.cam.startY + (this.cam.targetY - this.cam.startY) * e;
      this.cam.zoom = this.cam.startZoom + (this.cam.targetZoom - this.cam.startZoom) * e;
      if (t >= 1) {
        this.cam.x = this.cam.targetX;
        this.cam.y = this.cam.targetY;
        this.cam.zoom = this.cam.targetZoom;
        this.cam.tweenActive = false;
      }
    }

    if (this.isModalOpenFn()) {
      this.player.vx = 0;
      this.player.vy = 0;
      this.player.moving = false;
      this.player.startHopTimer = 0;
      this.player.jumpY = 0;
      this.player.lookOffset = 0;
      this.player.squash = 0;
      return;
    }

    const lvl = getBaseLevel();
    this.ensurePlayerUnstuck(lvl);
    this.updateNPCs(dt, lvl);
    if (progress.completedMissions.includes("m5_mars")) {
      this.updateRover(dt);
    }

    let dx = 0, dy = 0;
    if (this.keys["w"] || this.keys["arrowup"]) dy -= 1;
    if (this.keys["s"] || this.keys["arrowdown"]) dy += 1;
    if (this.keys["a"] || this.keys["arrowleft"]) dx -= 1;
    if (this.keys["d"] || this.keys["arrowright"]) dx += 1;

    if (dx !== 0 || dy !== 0) {
      this.player.targetPoint = null;
      this.player.pendingStation = null;
      this.player.stuckTimer = 0;
    } else if (this.player.targetPoint) {
      const tx = this.player.targetPoint.x - this.player.x;
      const ty = this.player.targetPoint.y - this.player.y;
      const dist = Math.hypot(tx, ty);
      if (dist < 4.5) {
        this.player.targetPoint = null;
        this.player.stuckTimer = 0;
        if (this.player.pendingStation) {
          const sid = this.player.pendingStation;
          this.player.pendingStation = null;
          this.onOpenStation(sid);
        }
      } else {
        dx = tx / dist;
        dy = ty / dist;
      }
    }

    const len = Math.hypot(dx, dy);
    let targetVx = 0, targetVy = 0;
    if (len > 0.01) {
      targetVx = (dx / len) * this.player.speed;
      targetVy = (dy / len) * this.player.speed;
      this.player.dir = dirFromVector(dx, dy);
    }

    const rate = len > 0.01 ? 16 : 14;
    const blend = 1 - Math.exp(-rate * dt);
    this.player.vx += (targetVx - this.player.vx) * blend;
    this.player.vy += (targetVy - this.player.vy) * blend;
    if (len <= 0.01 && Math.hypot(this.player.vx, this.player.vy) < 4) {
      this.player.vx = 0;
      this.player.vy = 0;
    }

    const curSpeed = Math.hypot(this.player.vx, this.player.vy);
    if (curSpeed > 4) {
      const startingFromIdle = !this.player.moving && this.player.idleTime > 0.08;
      if (startingFromIdle) {
        this.player.startHopTimer = 0.23;
        this.spawnFootDust(this.player.x, this.player.y, this.player.vx, this.player.vy, 4);
      }
      this.player.moving = true;
      this.player.idleTime = 0;
      this.player.lookOffset *= Math.exp(-16 * dt);
      if (Math.abs(this.player.lookOffset) < 0.01) this.player.lookOffset = 0;

      const prevX = this.player.x, prevY = this.player.y;
      const sx = this.player.vx * dt;
      const sy = this.player.vy * dt;
      if (!this.collides(this.player.x + sx, this.player.y, lvl)) this.player.x += sx;
      else this.player.vx = 0;
      if (!this.collides(this.player.x, this.player.y + sy, lvl)) this.player.y += sy;
      else this.player.vy = 0;

      if (this.player.targetPoint) {
        const moved = Math.hypot(this.player.x - prevX, this.player.y - prevY);
        if (moved < 0.25 * dt * 60) {
          this.player.stuckTimer += dt;
          if (this.player.stuckTimer > 0.4) {
            const pending = this.player.pendingStation;
            this.player.targetPoint = null;
            this.player.pendingStation = null;
            this.player.stuckTimer = 0;
            if (pending) {
              const st = this.stations.find(s => s.id === pending);
              if (st && Math.hypot(this.player.x - st.interactX, this.player.y - st.interactY) <= st.radius + 16) {
                this.onOpenStation(st.id);
              }
            }
          }
        } else {
          this.player.stuckTimer = 0;
        }
      }

      const speedRatio = Math.min(1.2, curSpeed / this.player.speed);
      if (this.player.startHopTimer > 0) {
        this.player.startHopTimer = Math.max(0, this.player.startHopTimer - dt);
        const hopProg = 1 - this.player.startHopTimer / 0.23;
        this.player.jumpY = Math.sin(hopProg * Math.PI) * 5.2;
        this.player.squash = hopProg < 0.2
          ? (0.2 - hopProg) * 2.2
          : hopProg > 0.82
            ? (hopProg - 0.82) * 3.4
            : -0.35 * Math.sin(hopProg * Math.PI);
        // Engage stride smoothly as boots touch down from impulse hop
        if (hopProg >= 0.65) {
          this.player.walkPhase = (this.player.walkPhase + dt * 2.55 * speedRatio) % 1;
        } else {
          this.player.walkPhase = 0.08 * hopProg;
        }
        if (this.player.startHopTimer === 0) {
          this.spawnFootDust(this.player.x, this.player.y, this.player.vx, this.player.vy, 2);
        }
      } else {
        this.player.jumpY = 0;
        this.player.squash *= Math.exp(-15 * dt);
        const prevPhase = this.player.walkPhase;
        this.player.walkPhase = (this.player.walkPhase + dt * 2.55 * speedRatio) % 1;
        this.player.dustTimer += dt * speedRatio;
        if ((prevPhase < 0.5 && this.player.walkPhase >= 0.5) || this.player.walkPhase < prevPhase || this.player.dustTimer >= 0.14) {
          this.player.dustTimer = 0;
          this.spawnFootDust(this.player.x, this.player.y, this.player.vx, this.player.vy, 3);
        }
        if (curSpeed > 28) audio.step();
      }
    } else {
      this.player.moving = false;
      this.player.startHopTimer = 0;
      this.player.walkPhase = 0;
      this.player.dustTimer = 0.08;
      this.player.idleTime += dt;

      if (this.player.idleTime > 1.1) {
        const cyc = (this.player.idleTime - 1.1) % 6.6;
        let targetLook = 0;
        let idleJump = 0;
        let idleSquash = 0;

        if (cyc >= 0.2 && cyc < 1.1) {
          // Look left
          targetLook = -Math.sin(((cyc - 0.2) / 0.9) * Math.PI);
        } else if (cyc >= 1.35 && cyc < 2.25) {
          // Look right
          targetLook = Math.sin(((cyc - 1.35) / 0.9) * Math.PI);
        } else if (cyc >= 3.5 && cyc < 3.94) {
          // Little idle hop
          const u = (cyc - 3.5) / 0.44;
          idleJump = Math.sin(u * Math.PI) * 3.8;
          idleSquash = -0.25 * Math.sin(u * Math.PI);
        } else if (cyc >= 3.94 && cyc < 4.12) {
          // Soft landing squash
          const u = (cyc - 3.94) / 0.18;
          idleSquash = Math.sin(u * Math.PI) * 0.75;
        } else if (cyc >= 5.0 && cyc < 5.7) {
          // Quick double-glance left then right
          targetLook = Math.sin(((cyc - 5.0) / 0.7) * Math.PI * 2) * 0.7;
        }

        const lookBlend = 1 - Math.exp(-12 * dt);
        this.player.lookOffset += (targetLook - this.player.lookOffset) * lookBlend;
        this.player.jumpY = idleJump;
        this.player.squash = idleSquash;
      } else {
        this.player.lookOffset *= Math.exp(-12 * dt);
        this.player.jumpY = 0;
        this.player.squash *= Math.exp(-14 * dt);
      }
    }

    let found: StationDef | null = null, best = Infinity;
    for (const st of this.stations) {
      const d = Math.hypot(this.player.x - st.interactX, this.player.y - st.interactY);
      if (d <= st.radius && d < best) { best = d; found = st; }
    }
    this.nearStation = found;
    this.updatePromptFn(found);
  }

  ensurePlayerUnstuck(lvl: number) {
    if (!this.collides(this.player.x, this.player.y, lvl)) return;
    const offsets = [[0, 18], [0, -18], [-22, 0], [22, 0], [0, 32], [-32, 16], [32, 16]];
    for (const [ox, oy] of offsets) {
      const nx = Math.max(26, Math.min(this.W - 26, this.player.x + ox));
      const ny = Math.max(88, Math.min(this.H - 24, this.player.y + oy));
      if (!this.collides(nx, ny, lvl)) {
        this.player.x = nx;
        this.player.y = ny;
        return;
      }
    }
    this.player.x = 240;
    this.player.y = 204;
  }

  drawBlock25D(x: number, y: number, w: number, h: number, depth: number, topCol: string, frontCol: string, trimCol: string, hiCol = "#ffffff22") {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
    ctx.fillRect(pxSnap(x + 2.5), pxSnap(y + h + 1), pxSnap(w + 2), pxSnap(depth + 5));
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(pxSnap(x + 1), pxSnap(y + h), pxSnap(w), pxSnap(depth + 2.5));

    pxChamfer(ctx, x, y + h - depth, w, depth, frontCol, "#060910", null, "#04060b", 1.5);
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    for (let rx = x + 8; rx < x + w - 4; rx += 14) {
      ctx.fillRect(pxSnap(rx), pxSnap(y + h - depth + 2), 1, pxSnap(depth - 3));
    }

    pxChamfer(ctx, x, y, w, h - depth + 1, topCol, "#060910", hiCol, "#00000044", 2);
    ctx.fillStyle = trimCol;
    ctx.fillRect(pxSnap(x + 2), pxSnap(y + h - depth - 1), pxSnap(w - 4), 1.5);
  }

  drawDataCables(ctx: CanvasRenderingContext2D) {
    for (let ci = 0; ci < this.cables.length; ci++) {
      const cable = this.cables[ci];
      const pts = cable.pts;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 4.5;
      ctx.strokeStyle = "#060910";
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();

      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "#162030";
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();

      ctx.lineWidth = 1.2;
      ctx.strokeStyle = cable.color;
      ctx.globalAlpha = 0.62;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
      ctx.globalAlpha = 1;

      ctx.fillStyle = "#475569";
      for (let i = 1; i < pts.length - 1; i++) {
        ctx.fillRect(pxSnap(pts[i][0] - 2), pxSnap(pts[i][1] - 2), 4, 4);
        ctx.fillStyle = "#94a3b8";
        ctx.fillRect(pxSnap(pts[i][0] - 1), pxSnap(pts[i][1] - 1), 2, 1);
        ctx.fillStyle = "#475569";
      }

      const meta = this.cableMeta[ci];
      const totalLen = meta.totalLen;
      const segs = meta.segs;
      for (let pIdx = 0; pIdx < 2; pIdx++) {
        let d = ((this.time * 78 + ci * 55 + pIdx * (totalLen * 0.5)) % totalLen);
        for (const s of segs) {
          if (d <= s.len) {
            const t = d / s.len;
            const px = pxSnap(s.a[0] + (s.b[0] - s.a[0]) * t);
            const py = pxSnap(s.a[1] + (s.b[1] - s.a[1]) * t);
            ctx.fillStyle = cable.color;
            ctx.fillRect(px - 2, py - 2, 4, 4);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(px - 1, py - 1, 2, 2);
            break;
          }
          d -= s.len;
        }
      }
    }
    ctx.lineWidth = 1;
  }

  drawLiveWaveform(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, seed = 0) {
    ctx.fillStyle = "#030b06";
    ctx.fillRect(pxSnap(x), pxSnap(y), w, h);
    ctx.fillStyle = color;
    for (let i = 1; i < w - 1; i += 1.5) {
      const wave = Math.sin(this.time * 6.5 + i * 0.65 + seed);
      const py = y + Math.floor(h / 2 + wave * (h * 0.28));
      ctx.fillRect(pxSnap(x + i), pxSnap(py), 1.5, 1);
    }
  }

  renderLightmap(lvl: number, lights: LightDef[]) {
    const lctx = this.lightCtx;
    lctx.globalCompositeOperation = "source-over";
    lctx.fillStyle = lvl === 1 ? "#a89c94" : lvl === 2 ? "#b6c4da" : "#b2cce4";
    lctx.fillRect(0, 0, 240, 135);

    lctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < lights.length; i++) {
      const l = lights[i];
      const spr = this.lightSprites[l.key];
      if (!spr) continue;
      const r = l.radius * 0.5;
      lctx.globalAlpha = Math.min(0.95, l.intensity * 0.78);
      lctx.drawImage(spr, l.x * 0.5 - r, l.y * 0.5 - r, r * 2, r * 2);
    }
    lctx.globalAlpha = 1;
    lctx.globalCompositeOperation = "source-over";
  }

  drawCommandPillar(ctx: CanvasRenderingContext2D, p: { x: number; y: number; w: number; h: number; sortY: number; led: string }, lights: LightDef[]) {
    const li = this.sampleLightAt(p.x + p.w * 0.5, p.sortY, lights);
    drawEntityDropShadow(ctx, p.x + p.w * 0.5, p.sortY + 0.5, p.w * 0.62, 3.2, 0, li);
    const topY = p.sortY - 38;
    pxChamfer(ctx, p.x, topY, p.w, 38, "#334766", "#071022", "#94a3b8", "#16243d", 2);
    pxChamfer(ctx, p.x + 2, p.y, p.w - 4, p.h, "#0b3d91", "#071022", "#60a5fa", "#091b3d", 1);
    ctx.fillStyle = "#081226";
    ctx.fillRect(pxSnap(p.x + p.w * 0.5 - 2), pxSnap(topY + 4), 4, 24);
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(pxSnap(p.x + 2), pxSnap(p.sortY - 5.5), p.w - 4, 1.5);
    ctx.fillStyle = "#fc3d21";
    ctx.fillRect(pxSnap(p.x + 2), pxSnap(p.sortY - 4), p.w - 4, 2);
    const pulse = 0.55 + 0.45 * Math.sin(this.time * 3.4 + p.x * 0.05);
    ctx.fillStyle = p.led;
    ctx.globalAlpha = pulse;
    ctx.fillRect(pxSnap(p.x + p.w * 0.5 - 3), pxSnap(topY + 6), 6, 3);
    ctx.globalAlpha = 1;
  }

  drawCryoCart(ctx: CanvasRenderingContext2D, lights: LightDef[]) {
    const c = this.cart;
    const li = this.sampleLightAt(c.x + c.w * 0.5, c.sortY, lights);
    drawEntityDropShadow(ctx, c.x + c.w * 0.5, c.sortY + 0.5, c.w * 0.58, 2.6, 0, li);
    ctx.fillStyle = "#090d14";
    ctx.fillRect(c.x + 2, c.sortY - 2, 3, 2.5);
    ctx.fillRect(c.x + c.w - 5, c.sortY - 2, 3, 2.5);
    this.drawBlock25D(c.x, c.y - 4, c.w, c.h + 2, 6, "#475569", "#0b3d91", "#94a3b8");
    pxChamfer(ctx, c.x + 2.5, c.y - 3, 5, 6, "#0ea5e9", "#060910", "#bae6fd", null, 1);
    pxChamfer(ctx, c.x + 9.5, c.y - 3, 5, 6, "#fc3d21", "#060910", "#fecaca", null, 1);
  }

  drawHoloTable(ctx: CanvasRenderingContext2D, lights: LightDef[]) {
    const cx = 242, cy = 166;
    const li = this.sampleLightAt(cx, 184, lights);
    drawEntityDropShadow(ctx, cx, 185, 38, 6.2, 0, li);
    this.drawBlock25D(cx - 38, cy - 22, 76, 40, 8, "#0f1e33", "#091220", "#38bdf8");
    ctx.strokeStyle = "rgba(56, 189, 248, 0.65)";
    ctx.beginPath();
    ctx.ellipse(cx, cy - 6, 26, 9.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#fbbf24";
    ctx.fillRect(cx - 2, cy - 8, 4, 4);
    const ox = cx + Math.cos(this.time * 1.6) * 26;
    const oy = cy - 6 + Math.sin(this.time * 1.6) * 9.5;
    ctx.fillStyle = "#33ff66";
    ctx.fillRect(pxSnap(ox) - 1, pxSnap(oy) - 1, 3, 3);
  }

  drawEngineeringRacks(ctx: CanvasRenderingContext2D, lights: LightDef[]) {
    const li = this.sampleLightAt(408, 184, lights);
    drawEntityDropShadow(ctx, 408, 185, 36, 4.8, 0, li);
    this.drawBlock25D(372, 158, 72, 26, 9, "#2d3a4f", "#18202e", "#475569");
    pxChamfer(ctx, 378, 161, 12, 10, "#f59e0b", "#090d14", "#fef08a", null, 1.5);
    pxChamfer(ctx, 396, 162, 16, 9, "#0284c7", "#090d14", "#bae6fd", null, 1.5);
    pxChamfer(ctx, 418, 160, 16, 11, "#15803d", "#090d14", "#33ff66", null, 1.5);
  }

  private getHasWarnCached(): boolean {
    const sig = missionManager.getConfigSignature();
    if (sig !== this.cachedConfigSig) {
      this.cachedConfigSig = sig;
      this.cachedHasWarn = !computeMetrics().isGo;
    }
    return this.cachedHasWarn;
  }

  private ensureStaticRoomLayer(lvl: number, supreme: boolean) {
    const key = `${lvl}:${supreme ? 1 : 0}`;
    if (this.staticBgKey === key) return;
    this.staticBgKey = key;

    const sctx = this.staticBgCtx;
    const W = this.W, H = this.H;
    sctx.save();
    sctx.setTransform(1, 0, 0, 1, 0, 0);
    sctx.clearRect(0, 0, this.staticBgCanvas.width, this.staticBgCanvas.height);
    sctx.scale(2, 2);

    pxChamfer(sctx, 4, 4, W - 8, H - 8, "#0b224a", "#030816", "#64748b", "#061024", 6);

    const ts = 16;
    for (let ty = 48; ty < H - 16; ty += ts) {
      for (let tx = 18; tx < W - 18; tx += ts) {
        const gx = Math.round((tx - 18) / ts);
        const gy = Math.round((ty - 48) / ts);
        const isGrating = (gy >= 3 && gy <= 11) && (
          gx === 3 || gx === 25 ||
          ((gy === 5 || gy === 9) && (gx === 7 || gx === 14 || gx === 21))
        );

        if (isGrating) {
          sctx.fillStyle = "#041428";
          sctx.fillRect(tx, ty, ts - 0.5, ts - 0.5);
          sctx.fillStyle = "#475569";
          sctx.fillRect(tx, ty, ts - 0.5, 1.5);
          sctx.fillRect(tx, ty + ts - 2, ts - 0.5, 1.5);
          sctx.fillRect(tx, ty, 1.5, ts - 0.5);
          sctx.fillRect(tx + ts - 2, ty, 1.5, ts - 0.5);
          for (let sx = 3; sx < ts - 2.5; sx += 3) {
            sctx.fillStyle = "#64748b";
            sctx.fillRect(tx + sx, ty + 1.5, 1.2, ts - 3.5);
          }
          sctx.fillStyle = "#94a3b8";
          sctx.fillRect(tx + 1.5, ty + 1.5, 1, 1);
          sctx.fillRect(tx + ts - 3, ty + 1.5, 1, 1);
        } else {
          const alt = ((gx + gy) % 2) === 0;
          const hash = ((gx * 73 + gy * 137) & 7);
          if (lvl === 1) sctx.fillStyle = alt ? "#24354e" : "#1d2c42";
          else if (lvl === 2) sctx.fillStyle = alt ? "#2a4060" : "#223552";
          else sctx.fillStyle = alt ? "#2d476c" : "#243b5c";
          sctx.fillRect(tx, ty, ts - 0.5, ts - 0.5);

          sctx.fillStyle = lvl === 1 ? "#3e577a" : "#4b6a94";
          sctx.fillRect(tx + 0.5, ty + 0.5, ts - 1.5, 1);
          sctx.fillRect(tx + 0.5, ty + 0.5, 1, ts - 1.5);
          sctx.fillStyle = "rgba(3, 8, 20, 0.5)";
          sctx.fillRect(tx, ty + ts - 1.5, ts - 0.5, 1);
          sctx.fillRect(tx + ts - 1.5, ty, 1, ts - 0.5);
          sctx.fillStyle = "#64748b";
          sctx.fillRect(tx + 2, ty + 2, 1, 1);
          sctx.fillRect(tx + ts - 3.5, ty + 2, 1, 1);
          sctx.fillRect(tx + 2, ty + ts - 3.5, 1, 1);
          sctx.fillRect(tx + ts - 3.5, ty + ts - 3.5, 1, 1);

          if (hash === 2) {
            sctx.fillStyle = "rgba(248, 250, 252, 0.06)";
            sctx.fillRect(tx + 4, ty + 7, 5, 1);
          } else if (hash === 5) {
            sctx.fillStyle = "rgba(11, 61, 145, 0.28)";
            sctx.fillRect(tx + 5, ty + 10, 4.5, 1.5);
          }
        }
      }
    }

    const padFill = supreme ? "rgba(12, 74, 158, 0.72)" : "rgba(11, 61, 145, 0.62)";
    const padTrim = supreme ? "#fbbf24" : "#fc3d21";
    pxChamfer(sctx, 168, 128, 148, 86, padFill, supreme ? "#38bdf8" : "#475569", supreme ? "#fef08a" : "#94a3b8", "#071530", 8);
    sctx.fillStyle = supreme ? "#38bdf8" : "#f8fafc";
    sctx.fillRect(176, 132.5, 132, 1.2);
    sctx.fillRect(176, 208.5, 132, 1.2);
    sctx.fillStyle = padTrim;
    sctx.fillRect(176, 134, 132, 2);
    sctx.fillRect(176, 206, 132, 2);

    sctx.fillStyle = supreme ? "#0f52ba" : "#0b3d91";
    sctx.beginPath();
    sctx.arc(242, 171, 13, 0, Math.PI * 2);
    sctx.fill();
    sctx.strokeStyle = "#f8fafc";
    sctx.lineWidth = 1;
    sctx.beginPath();
    sctx.ellipse(242, 171, 16, 4.5, -0.32, 0, Math.PI * 2);
    sctx.stroke();
    sctx.strokeStyle = "#fc3d21";
    sctx.lineWidth = 1.6;
    sctx.beginPath();
    sctx.moveTo(234, 176);
    sctx.lineTo(242, 162);
    sctx.lineTo(249, 175);
    sctx.stroke();
    sctx.lineWidth = 1;

    const hx = 250, hy = 38, hw = 120;
    pxChamfer(sctx, hx - 2, hy + 44, hw + 4, 22, "#0b1a36", "#475569", null, null, 2);
    for (let sx = 0; sx < hw; sx += 8) {
      sctx.fillStyle = (sx / 8) % 2 === 0 ? "#fc3d21" : "#f8fafc";
      sctx.fillRect(hx + sx, hy + 46, 8, 4);
      sctx.fillRect(hx + sx, hy + 60, 8, 3.5);
    }
    sctx.fillStyle = "#162d54";
    sctx.fillRect(hx + 2, hy + 50, hw - 4, 10);

    sctx.fillStyle = "#081736";
    sctx.fillRect(8, 8, W - 16, 16);
    sctx.fillStyle = lvl === 1 ? "#113878" : lvl === 2 ? "#0e4399" : "#0b3d91";
    sctx.fillRect(18, 24, W - 36, 24);
    sctx.fillStyle = "#94a3b8";
    sctx.fillRect(18, 24, W - 36, 2);
    sctx.fillStyle = "#f8fafc";
    sctx.fillRect(18, 41.5, W - 36, 1.5);
    sctx.fillStyle = "#fc3d21";
    sctx.fillRect(18, 43, W - 36, 2.5);

    for (const vx of [112, 232, 362]) {
      pxChamfer(sctx, vx, 27, 22, 14, "#030712", "#64748b", "#cbd5e1", "#0f172a", 2);
      sctx.fillStyle = "#38bdf8";
      sctx.fillRect(vx + 5, 31, 1, 1);
      sctx.fillStyle = "#ffffff";
      sctx.fillRect(vx + 15, 35, 1, 1);
      sctx.fillStyle = "rgba(56, 189, 248, 0.16)";
      sctx.fillRect(vx + 2, 29, 18, 10);
    }

    for (let px = 22; px < W - 26; px += 86) {
      pxChamfer(sctx, px, 24, 7, 24, "#475569", "#08142b", "#94a3b8", null, 1);
      sctx.fillStyle = "#fc3d21";
      sctx.fillRect(px + 2, 32, 3, 2);
    }
    sctx.fillStyle = "#1e3a6b";
    sctx.fillRect(18, 46, W - 36, 5);
    sctx.fillStyle = "rgba(0, 0, 0, 0.32)";
    sctx.fillRect(18, 51, W - 36, 3);

    sctx.fillStyle = "#0b224d";
    sctx.fillRect(8, 10, 10, H - 20);
    sctx.fillRect(W - 18, 10, 10, H - 20);
    sctx.fillRect(8, H - 18, W - 16, 10);
    sctx.fillStyle = "#64748b";
    sctx.fillRect(16, 24, 2, H - 40);
    sctx.fillRect(W - 18, 24, 2, H - 40);
    sctx.fillRect(18, H - 18, W - 36, 2);

    sctx.restore();
  }

  draw() {
    const ctx = this.ctx;
    const lvl = getBaseLevel();
    const W = this.W, H = this.H;
    const hasWarn = this.getHasWarnCached();
    const hasAlert = lvl === 1 || hasWarn;
    const lights = this.buildFrameLights(lvl);
    const supreme = missionManager.isSupremeCommand();
    this.ensureStaticRoomLayer(lvl, supreme);

    ctx.save();
    ctx.scale(2, 2);
    ctx.translate(W * 0.5, H * 0.5);
    ctx.scale(this.cam.zoom, this.cam.zoom);
    ctx.translate(-this.cam.x, -this.cam.y);

    ctx.fillStyle = "#03060d";
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(this.staticBgCanvas, 0, 0, W, H);

    for (const st of this.outerStars) {
      const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(this.time * 2.2 + st.phase));
      ctx.globalAlpha = tw;
      ctx.fillStyle = st.col;
      ctx.fillRect(st.x, st.y, 1, 1);
    }
    ctx.globalAlpha = 1;

    const gratePulse = 0.68 + 0.32 * Math.sin(this.time * 2.2);
    const ts = 16;
    for (let i = 0; i < this.gratingCells.length; i++) {
      const { tx, ty } = this.gratingCells[i];
      ctx.fillStyle = `rgba(14, 165, 233, ${(0.24 * gratePulse).toFixed(2)})`;
      ctx.fillRect(tx + 1.5, ty + 1.5, ts - 3.5, ts - 3.5);
      ctx.fillStyle = `rgba(56, 189, 248, ${(0.38 * gratePulse).toFixed(2)})`;
      ctx.fillRect(tx + 3.5, ty + 3.5, ts - 7.5, ts - 7.5);
      ctx.fillStyle = "#0369a1";
      ctx.fillRect(tx + 1, ty + 6.5, ts - 2.5, 3);
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(tx + 1, ty + 7, ts - 2.5, 1);
    }

    if (supreme) {
      ctx.strokeStyle = `rgba(251, 191, 36, ${(0.55 + 0.35 * Math.sin(this.time * 3)).toFixed(2)})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(242, 171, 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }

    const ledPulse = 0.45 + 0.55 * Math.sin(this.time * 3.0);
    for (let lx = 86; lx < 390; lx += 28) {
      const isCyan = (lx / 28) % 2 === 0;
      ctx.fillStyle = "#061024";
      ctx.fillRect(lx - 1, 108, 8, 2.5);
      ctx.fillStyle = hasAlert && (lx % 56 === 30)
        ? `rgba(252, 61, 33, ${(0.4 + ledPulse * 0.6).toFixed(2)})`
        : isCyan
          ? `rgba(56, 189, 248, ${(0.35 + ledPulse * 0.6).toFixed(2)})`
          : `rgba(51, 255, 102, ${(0.3 + (1 - ledPulse) * 0.55).toFixed(2)})`;
      ctx.fillRect(lx, 108.5, 6, 1.5);
    }

    for (const v of this.vents) {
      pxChamfer(ctx, v.x, v.y, v.w, v.h, "#041428", "#475569", "#94a3b8", "#071022", 1.5);
      ctx.fillStyle = `rgba(14, 165, 233, ${(0.25 * gratePulse).toFixed(2)})`;
      ctx.fillRect(v.x + 2, v.y + 2, v.w - 4, v.h - 4);
      for (let sx = v.x + 2.5; sx < v.x + v.w - 2; sx += 3) {
        ctx.fillStyle = "#64748b";
        ctx.fillRect(sx, v.y + 2, 1.5, v.h - 4);
      }
    }

    this.drawDataCables(ctx);

    for (let lx = 44; lx < W - 40; lx += 86) {
      const isRed = (Math.floor(lx / 86) % 2) === 1;
      if (lvl === 1) {
        const rot = this.time * 2.4 + lx * 0.03;
        const pulse = 0.5 + 0.5 * Math.sin(rot);
        ctx.fillStyle = isRed ? (pulse > 0.5 ? "#fc3d21" : "#7f1d1d") : (pulse > 0.5 ? "#fbbf24" : "#78350f");
        ctx.fillRect(lx, 26, 12, 4.5);
      } else if (lvl === 2) {
        ctx.fillStyle = hasAlert && isRed ? "#fc3d21" : "#fbbf24";
        ctx.fillRect(lx, 26, 14, 4.5);
      } else {
        const isBlue = (Math.floor(lx / 86) % 2) === 0;
        ctx.fillStyle = isBlue ? "#38bdf8" : "#33ff66";
        ctx.fillRect(lx - 4, 26, 22, 4);
      }
    }

    this.drawWallMissionRewards(ctx);
    this.drawTopStations(ctx);
    if (progress.completedMissions.includes("m1_cml1")) {
      this.drawWorkbenchHoloGlobe(ctx);
    }
    if (lvl === 1) {
      pxChamfer(ctx, 348, 152, 114, 100, "#090c12", "#1e293b", null, null, 4);
      for (let i = 0; i < 112; i += 8) {
        ctx.fillStyle = (i / 8) % 2 === 0 ? "#d97706" : "#18181b";
        ctx.fillRect(348 + i, 152, 8, 5);
      }
      for (let j = 0; j < 96; j += 8) {
        ctx.fillStyle = (j / 8) % 2 === 0 ? "#d97706" : "#18181b";
        ctx.fillRect(348, 152 + j, 5, 8);
      }
    }

    const renderQueue: { y: number; kind: string; p?: CommandCenter["pillars"][number]; npc?: NPCDef; fp?: CommandCenter["footDust"][number]; s?: CommandCenter["steam"][number]; m?: CommandCenter["dust"][number] }[] = [
      { y: 148, kind: "wardrobe" },
      { y: this.cart.sortY, kind: "cart" },
      { y: 210, kind: "internDesk" }
    ];
    if (lvl >= 2) renderQueue.push({ y: 184, kind: "racks" });
    if (lvl === 3) renderQueue.push({ y: 184, kind: "holoTable" });

    const doneMissions = progress.completedMissions;
    if (doneMissions.includes("m2_cml2")) renderQueue.push({ y: 80, kind: "moonVitrine" });
    if (doneMissions.includes("m3_cml3")) renderQueue.push({ y: 190, kind: "solarMonitor" });
    if (doneMissions.includes("m4_cml4")) renderQueue.push({ y: 76, kind: "jwstShowcase" });
    if (doneMissions.includes("m5_mars")) renderQueue.push({ y: this.rover.y, kind: "marsRover" });
    if (doneMissions.includes("m6_europa")) renderQueue.push({ y: 140, kind: "europaCylinder" });
    if (doneMissions.includes("m7_dart")) renderQueue.push({ y: lvl === 3 ? 185 : 168, kind: "dartTrophy" });
    if (doneMissions.includes("m8_cassini")) renderQueue.push({ y: 206, kind: "cassiniHolo" });
    if (doneMissions.includes("m9_parker")) renderQueue.push({ y: 76, kind: "parkerShowcase" });
    if (doneMissions.includes("m10_gateway")) renderQueue.push({ y: 180, kind: "gatewayModule" });
    if (doneMissions.includes("m11_juno")) renderQueue.push({ y: 218, kind: "junoReactor" });
    if (doneMissions.includes("m12_roman")) renderQueue.push({ y: 182, kind: "romanMonitor" });
    if (doneMissions.includes("m13_dragonfly")) renderQueue.push({ y: 218, kind: "dragonflyPad" });
    if (doneMissions.includes("m15_marsbase")) renderQueue.push({ y: 185.5, kind: "marsBaseHolo" });

    for (const p of this.pillars) renderQueue.push({ y: p.sortY, kind: "pillar", p });
    for (const npc of this.npcs) {
      if (lvl >= npc.minLevel) renderQueue.push({ y: npc.y, kind: "npc", npc });
    }
    renderQueue.push({ y: this.player.y, kind: "player" });

    for (const fp of this.footDust) renderQueue.push({ y: fp.y - 0.6, kind: "footDust", fp });
    for (const s of this.steam) renderQueue.push({ y: s.y, kind: "steam", s });
    for (const m of this.dust) renderQueue.push({ y: m.y, kind: "dust", m });

    renderQueue.sort((a, b) => a.y - b.y);

    const playerSkin = getSkin(progress.skinId);
    for (const item of renderQueue) {
      if (item.kind === "wardrobe") this.drawWardrobeStation(ctx);
      else if (item.kind === "cart") this.drawCryoCart(ctx, lights);
      else if (item.kind === "internDesk") this.drawInternDesk(ctx, lvl, lights);
      else if (item.kind === "racks") this.drawEngineeringRacks(ctx, lights);
      else if (item.kind === "holoTable") this.drawHoloTable(ctx, lights);
      else if (item.kind === "moonVitrine") this.drawMoonVitrine(ctx, lights);
      else if (item.kind === "solarMonitor") this.drawSolarCMEMonitor(ctx);
      else if (item.kind === "jwstShowcase") this.drawJWSTShowcase(ctx, lights);
      else if (item.kind === "marsRover") this.drawMarsRover(ctx, lights);
      else if (item.kind === "europaCylinder") this.drawEuropaCylinder(ctx, lights);
      else if (item.kind === "dartTrophy") this.drawDartKineticTrophy(ctx, lvl, lights);
      else if (item.kind === "cassiniHolo") this.drawCassiniHologram(ctx, lights);
      else if (item.kind === "parkerShowcase") this.drawParkerShowcase(ctx, lights);
      else if (item.kind === "gatewayModule") this.drawGatewayModule(ctx, lights);
      else if (item.kind === "junoReactor") this.drawJunoReactorCore(ctx, lights);
      else if (item.kind === "romanMonitor") this.drawRomanDeepMonitor(ctx);
      else if (item.kind === "dragonflyPad") this.drawDragonflyPad(ctx, lights);
      else if (item.kind === "marsBaseHolo") this.drawMarsBaseHologram(ctx, lvl);
      else if (item.kind === "pillar" && item.p) this.drawCommandPillar(ctx, item.p, lights);
      else if (item.kind === "npc" && item.npc) {
        const li = this.sampleLightAt(item.npc.x, item.npc.y, lights);
        this.drawNPC(ctx, item.npc, lvl, li);
      } else if (item.kind === "player") {
        const li = this.sampleLightAt(this.player.x, this.player.y, lights);
        drawPixelEngineer24x32(
          ctx,
          this.player.x,
          this.player.y,
          this.player.dir,
          this.player.walkPhase * 8,
          this.player.moving,
          this.time,
          playerSkin,
          1,
          li,
          {
            jumpY: this.player.jumpY,
            lookOffset: this.player.lookOffset,
            squash: this.player.squash
          }
        );
      } else if (item.kind === "footDust" && item.fp) {
        const fp = item.fp;
        const t = fp.life / fp.maxLife;
        const alpha = (1 - t) * (1 - t) * 0.54;
        const rad = fp.size * (0.7 + t * 0.95);
        pxEllipse(ctx, fp.x, fp.y, rad, rad * 0.65, `rgba(203, 213, 225, ${alpha.toFixed(2)})`);
      } else if (item.kind === "steam" && item.s) {
        const s = item.s;
        const t = s.life / s.maxLife;
        const alpha = Math.sin(t * Math.PI) * 0.24;
        pxEllipse(ctx, s.x, s.y, s.size + t * 1.6, (s.size + t * 1.2) * 0.7, `rgba(196, 224, 248, ${alpha.toFixed(2)})`);
      } else if (item.kind === "dust" && item.m) {
        const m = item.m;
        const mLight = this.sampleLightAt(m.x, m.y, lights);
        const alpha = (0.18 + 0.34 * (0.5 + 0.5 * Math.sin(this.time * 2.5 + m.phase))) * (0.55 + mLight.strength * 0.7);
        ctx.fillStyle = `rgba(${mLight.r}, ${mLight.g}, ${mLight.b}, ${Math.min(0.75, alpha).toFixed(2)})`;
        ctx.fillRect(pxSnap(m.x), pxSnap(m.y), m.size, m.size);
      }
    }

    this.renderLightmap(lvl, lights);
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.lightCanvas, 0, 0, W, H);
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    let zoneGrad = this.zoneGradCache[lvl];
    if (!zoneGrad) {
      zoneGrad = ctx.createLinearGradient(0, 0, W, H);
      if (lvl === 1) {
        zoneGrad.addColorStop(0, "rgba(245, 158, 11, 0.08)");
        zoneGrad.addColorStop(0.5, "rgba(51, 255, 102, 0.04)");
        zoneGrad.addColorStop(1, "rgba(239, 68, 68, 0.07)");
      } else {
        zoneGrad.addColorStop(0, "rgba(245, 158, 11, 0.055)");
        zoneGrad.addColorStop(0.45, "rgba(51, 255, 102, 0.055)");
        zoneGrad.addColorStop(1, "rgba(56, 189, 248, 0.075)");
      }
      this.zoneGradCache[lvl] = zoneGrad;
    }
    ctx.fillStyle = zoneGrad;
    ctx.fillRect(14, 24, W - 28, H - 38);
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const cones = [
      { id: "c1", x: 70, y: 84, spread: 34, h: 72, col: "245, 158, 11", a: 0.08 },
      { id: "c2", x: 182, y: 84, spread: 44, h: 92, col: "51, 255, 102", a: 0.11 },
      { id: "c3", x: 310, y: 84, spread: 52, h: 102, col: "56, 189, 248", a: 0.12 },
      { id: "c4", x: 418, y: 84, spread: 34, h: 68, col: "251, 191, 36", a: 0.08 },
      { id: "c5", x: 42, y: 146, spread: 28, h: 52, col: "192, 132, 252", a: 0.09 }
    ];
    if (doneMissions.includes("m4_cml4")) cones.push({ id: "c6", x: 245, y: 36, spread: 26, h: 72, col: "251, 191, 36", a: 0.16 });
    if (doneMissions.includes("m14_voyager")) cones.push({ id: "c7", x: 267, y: 36, spread: 20, h: 58, col: "251, 191, 36", a: 0.12 });
    for (const c of cones) {
      let coneGrad = this.coneGradCache[c.id];
      if (!coneGrad) {
        coneGrad = ctx.createLinearGradient(c.x, c.y, c.x, c.y + c.h);
        coneGrad.addColorStop(0, `rgba(${c.col}, ${c.a})`);
        coneGrad.addColorStop(0.55, `rgba(${c.col}, ${(c.a * 0.36).toFixed(3)})`);
        coneGrad.addColorStop(1, `rgba(${c.col}, 0)`);
        this.coneGradCache[c.id] = coneGrad;
      }
      ctx.fillStyle = coneGrad;
      ctx.beginPath();
      ctx.moveTo(c.x - 14, c.y);
      ctx.lineTo(c.x + 14, c.y);
      ctx.lineTo(c.x + c.spread, c.y + c.h);
      ctx.lineTo(c.x - c.spread, c.y + c.h);
      ctx.closePath();
      ctx.fill();
    }
    if (lvl === 1) {
      for (let lx = 44; lx < W - 40; lx += 86) {
        const isRed = (Math.floor(lx / 86) % 2) === 1;
        const rot = this.time * 2.4 + lx * 0.03;
        const pulse = 0.5 + 0.5 * Math.sin(rot);
        const sweepX = lx + 6 + Math.cos(rot) * 36;
        const sweepY = 108 + Math.abs(Math.sin(rot)) * 22;
        const rgb = isRed ? "239, 68, 68" : "245, 158, 11";
        const a0 = 0.075 + pulse * 0.085;
        const beamGrad = ctx.createLinearGradient(lx + 6, 31, sweepX, sweepY);
        beamGrad.addColorStop(0, `rgba(${rgb}, ${a0.toFixed(3)})`);
        beamGrad.addColorStop(0.6, `rgba(${rgb}, ${(a0 * 0.35).toFixed(3)})`);
        beamGrad.addColorStop(1, `rgba(${rgb}, 0)`);
        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(lx + 6, 31);
        ctx.lineTo(sweepX - 24, sweepY);
        ctx.lineTo(sweepX + 24, sweepY);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();

    if (this.player.targetPoint) {
      const tp = this.player.targetPoint;
      ctx.strokeStyle = "#33ff66";
      ctx.strokeRect(pxSnap(tp.x) - 4, pxSnap(tp.y) - 4, 8, 8);
    }

    ctx.restore();
    this.syncHtmlOverlay(lvl);
  }

  syncHtmlOverlay(lvl: number) {
    if (!this.overlay) return;
    const hasWarn = this.getHasWarnCached();

    for (const st of this.stations) {
      const el = this.domNodes.plaques[st.id];
      if (!el) continue;
      const isNear = this.nearStation && this.nearStation.id === st.id;
      const px = st.id === "wardrobe" ? st.x + st.w / 2 + 12 : st.interactX;
      const py = st.y - 3;
      const pos = this.worldToOverlayPct(px, py);
      const border = isNear ? st.color : "#334460";
      const color = isNear ? st.color : "#e2e8f0";
      const shadow = isNear ? `0 0 8px ${st.color}66` : "none";
      const prev = this.domNodes.plaqueState[st.id] || (this.domNodes.plaqueState[st.id] = { left: "", top: "", border: "", color: "", shadow: "" });
      if (prev.left !== pos.left) { el.style.left = pos.left; prev.left = pos.left; }
      if (prev.top !== pos.top) { el.style.top = pos.top; prev.top = pos.top; }
      if (prev.border !== border) { el.style.borderColor = border; prev.border = border; }
      if (prev.color !== color) { el.style.color = color; prev.color = color; }
      if (prev.shadow !== shadow) { el.style.boxShadow = shadow; prev.shadow = shadow; }
    }

    if (this.domNodes.expansion) {
      const display = lvl === 1 ? "block" : "none";
      const expState = this.domNodes.expansionState;
      if (expState.display !== display) {
        this.domNodes.expansion.style.display = display;
        expState.display = display;
      }
      if (lvl === 1) {
        const expPos = this.worldToOverlayPct(405, 202);
        if (expState.left !== expPos.left) { this.domNodes.expansion.style.left = expPos.left; expState.left = expPos.left; }
        if (expState.top !== expPos.top) { this.domNodes.expansion.style.top = expPos.top; expState.top = expPos.top; }
      }
    }

    for (const npc of this.npcs) {
      const node = this.domNodes.npcs[npc.id];
      if (!node) continue;
      const nState = this.domNodes.npcState[npc.id] || (this.domNodes.npcState[npc.id] = {
        display: "", left: "", top: "", bDisplay: "", icon: "", border: "", glow: "", color: ""
      });
      if (lvl < npc.minLevel) {
        if (nState.display !== "none") { node.wrap.style.display = "none"; nState.display = "none"; }
        continue;
      }
      if (nState.display !== "flex") { node.wrap.style.display = "flex"; nState.display = "flex"; }
      const npcPos = this.worldToOverlayPct(npc.x, npc.y - 25);
      if (nState.left !== npcPos.left) { node.wrap.style.left = npcPos.left; nState.left = npcPos.left; }
      if (nState.top !== npcPos.top) { node.wrap.style.top = npcPos.top; nState.top = npcPos.top; }

      const wp = npc.waypoints[npc.wpIdx];
      let icon = "";
      let border = npc.accent || "#38bdf8";
      let glow = npc.glow || "rgba(56, 189, 248, 0.34)";
      let textCol = "#f8fafc";

      if (this.celebrateTimer > 0) {
        icon = "★";
        border = "#fbbf24";
        glow = "rgba(251, 191, 36, 0.45)";
        textCol = "#fde047";
      } else if (hasWarn && (npc.id === "marina" || npc.id === "lucas")) {
        icon = "⚠️";
        border = "#f59e0b";
        glow = "rgba(245, 158, 11, 0.45)";
        textCol = "#fbbf24";
      } else if (npc.pauseTimer > 0) {
        icon = wp.action === "type" ? "..." : wp.action === "inspect" ? "🔧" : "💡";
        border = npc.accent || "#38bdf8";
        glow = npc.glow || "rgba(56, 189, 248, 0.34)";
        textCol = wp.action === "type" ? (npc.accent || "#33ff66") : "#fde047";
      }

      if (icon) {
        if (nState.bDisplay !== "block") { node.bubble.style.display = "block"; nState.bDisplay = "block"; }
        if (nState.icon !== icon) { node.bubble.textContent = icon; nState.icon = icon; }
        if (nState.border !== border) { node.bubble.style.setProperty("--npc-bubble-border", border); nState.border = border; }
        if (nState.glow !== glow) { node.bubble.style.setProperty("--npc-bubble-glow", glow); nState.glow = glow; }
        if (nState.color !== textCol) { node.bubble.style.color = textCol; nState.color = textCol; }
      } else {
        if (nState.bDisplay !== "none") { node.bubble.style.display = "none"; nState.bDisplay = "none"; }
      }
    }
  }

  drawFloorLightSpill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rgb: string, alpha = 0.24) {
    const key = `${x}:${y}:${h}:${rgb}:${alpha}`;
    let grad = this.spillGradCache[key];
    if (!grad) {
      grad = ctx.createLinearGradient(x, y, x, y + h);
      grad.addColorStop(0, `rgba(${rgb}, ${alpha})`);
      grad.addColorStop(0.5, `rgba(${rgb}, ${(alpha * 0.38).toFixed(3)})`);
      grad.addColorStop(1, `rgba(${rgb}, 0)`);
      this.spillGradCache[key] = grad;
    }
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
  }

  drawTopStations(ctx: CanvasRenderingContext2D) {
    const pulse = (Math.sin(this.time * 7) + 1) * 0.5;
    const ledBlink = Math.sin(this.time * 4.5) > 0;

    const s1 = this.stations[0];
    this.drawBlock25D(s1.x, s1.y, s1.w, s1.h, 10, "#352c26", "#1d1714", "#f59e0b");
    this.drawFloorLightSpill(ctx, s1.x + 6, s1.y + s1.h - 2, s1.w - 12, 18, "245, 158, 11", 0.22);
    pxChamfer(ctx, s1.x + 3, s1.y + 2, s1.w - 6, 28, "#181d26", "#060910", "#475569", null, 1.5);
    const cols = ["#f59e0b", "#38bdf8", "#a855f7", "#33ff66", "#f97316", "#22d3ee", "#ec4899"];
    for (let i = 0; i < nasa_database.missions_cml.length; i++) {
      const done = progress.completedMissions.includes(nasa_database.missions_cml[i].id);
      const row = Math.floor(i / 5);
      const col = i % 5;
      const cx = s1.x + 5.5 + col * 12.6;
      const cy = s1.y + 4 + row * 8.2;
      pxChamfer(ctx, cx, cy, 10, 6.8, done ? "#dcfce7" : "#e2e8f0", "#090d14", "#ffffff", "#94a3b8", 0.8);
      ctx.fillStyle = done ? "#10b981" : cols[i % cols.length];
      ctx.fillRect(cx + 1, cy + 1, 8, 2);
      ctx.fillStyle = done ? "#059669" : "#64748b";
      ctx.fillRect(cx + 1.5, cy + 4, 6, 1);
    }
    ctx.fillStyle = ledBlink ? "#f59e0b" : "#78350f";
    ctx.fillRect(s1.x + s1.w - 7, s1.y + 26, 2.5, 2.5);
    if (this.nearStation?.id === "quests") {
      ctx.strokeStyle = `rgba(245, 158, 11, ${0.45 + pulse * 0.55})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(s1.x - 1, s1.y - 1, s1.w + 2, s1.h + 2);
      ctx.lineWidth = 1;
    }

    const s2 = this.stations[1];
    this.drawBlock25D(s2.x, s2.y, s2.w, s2.h, 12, "#243042", "#131b26", "#33ff66");
    this.drawFloorLightSpill(ctx, s2.x + 2, s2.y + s2.h - 2, 44, 24, "51, 255, 102", 0.24);
    this.drawFloorLightSpill(ctx, s2.x + 44, s2.y + s2.h - 2, 42, 20, "56, 189, 248", 0.14);
    pxChamfer(ctx, s2.x + 6, s2.y + 3, 34, 22, "#1a2433", "#060910", "#64748b", "#0b111a", 2);
    this.drawLiveWaveform(ctx, s2.x + 9, s2.y + 6, 28, 15, "#33ff66", 1.2);
    pxChamfer(ctx, s2.x + 44, s2.y + 4, 42, 20, "#1e3a8a", "#060910", "#60a5fa", "#172554", 1.5);
    ctx.fillStyle = "#93c5fd";
    ctx.fillRect(s2.x + 48, s2.y + 7, 18, 9);
    ctx.fillStyle = "#f97316";
    ctx.fillRect(s2.x + 70, s2.y + 8, 9, 8);
    ctx.fillStyle = "#ef4444"; ctx.fillRect(s2.x + 12, s2.y + 26, 4, 2);
    ctx.fillStyle = "#f59e0b"; ctx.fillRect(s2.x + 18, s2.y + 26, 4, 2);
    ctx.fillStyle = "#33ff66"; ctx.fillRect(s2.x + 24, s2.y + 26, 4, 2);
    ctx.fillStyle = "#38bdf8"; ctx.fillRect(s2.x + 48, s2.y + 26, 8, 2);
    if (this.nearStation?.id === "workbench") {
      ctx.strokeStyle = `rgba(51, 255, 102, ${0.45 + pulse * 0.55})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(s2.x - 1, s2.y - 1, s2.w + 2, s2.h + 2);
      ctx.lineWidth = 1;
    }

    const s3 = this.stations[2];
    this.drawBlock25D(s3.x, s3.y, s3.w, s3.h, 12, "#29384d", "#151d29", "#38bdf8");
    this.drawFloorLightSpill(ctx, s3.x + 8, s3.y + s3.h - 2, 58, 24, "56, 189, 248", 0.25);
    pxChamfer(ctx, s3.x + 10, s3.y + 3, 52, 24, "#111b29", "#060910", "#64748b", "#090d14", 2);
    this.drawLiveWaveform(ctx, s3.x + 13, s3.y + 6, 46, 18, "#38bdf8", 3.4);
    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(s3.x + 35, s3.y + 8, 2.5, 11);
    ctx.fillStyle = "#f97316";
    ctx.fillRect(s3.x + 35, s3.y + 19, 2.5, 3);
    pxChamfer(ctx, s3.x + 67, s3.y + 6, 20, 14, "#1e293b", "#060910", "#475569", null, 1.5);
    ctx.fillStyle = Math.sin(this.time * 5) > 0 ? "#ef4444" : "#991b1b";
    ctx.fillRect(s3.x + 70, s3.y + 9, 14, 8);
    ctx.fillStyle = "#33ff66"; ctx.fillRect(s3.x + 68, s3.y + 23, 5, 3);
    ctx.fillStyle = "#f59e0b"; ctx.fillRect(s3.x + 75, s3.y + 23, 5, 3);
    ctx.fillStyle = "#38bdf8"; ctx.fillRect(s3.x + 82, s3.y + 23, 5, 3);
    if (this.nearStation?.id === "launch") {
      ctx.strokeStyle = `rgba(56, 189, 248, ${0.45 + pulse * 0.55})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(s3.x - 1, s3.y - 1, s3.w + 2, s3.h + 2);
      ctx.lineWidth = 1;
    }

    const s4 = this.stations[3];
    this.drawBlock25D(s4.x, s4.y, s4.w, s4.h, 11, "#332820", "#1a1410", "#fbbf24");
    this.drawFloorLightSpill(ctx, s4.x + 5, s4.y + s4.h - 2, s4.w - 10, 18, "251, 191, 36", 0.22);
    pxChamfer(ctx, s4.x + 4, s4.y + 3, s4.w - 8, 22, "#0d131d", "#060910", "#64748b", null, 1.5);
    nasa_database.missions_cml.forEach((m, idx) => {
      const row = Math.floor(idx / 5);
      const col = idx % 5;
      const tx = s4.x + 6.5 + col * 11.2;
      const ty = s4.y + 4.5 + row * 6.2;
      if (progress.completedMissions.includes(m.id)) {
        const c = idx >= 10 ? "#38bdf8" : idx >= 5 ? "#fbbf24" : idx >= 2 ? "#33ff66" : "#f59e0b";
        pxChamfer(ctx, tx, ty, 7.5, 4.8, c, "#060910", "#fef08a", null, 0.8);
      } else {
        pxChamfer(ctx, tx + 1, ty + 0.5, 5.5, 3.8, "#1e2736", "#0b1018", null, null, 0.5);
      }
    });
    pxChamfer(ctx, s4.x + 6, s4.y + 26, s4.w - 12, 4, "#0b1220", "#060910", null, null, 0.5);
    ctx.fillStyle = "#fbbf24";
    const trophyFillW = Math.max(4, Math.round((progress.completedMissions.length / 15) * (s4.w - 16)));
    ctx.fillRect(s4.x + 8, s4.y + 27, trophyFillW, 2);
    if (this.nearStation?.id === "ranking") {
      ctx.strokeStyle = `rgba(251, 191, 36, ${0.45 + pulse * 0.55})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(s4.x - 1, s4.y - 1, s4.w + 2, s4.h + 2);
      ctx.lineWidth = 1;
    }
  }

  drawWardrobeStation(ctx: CanvasRenderingContext2D) {
    const pulse = (Math.sin(this.time * 7) + 1) * 0.5;
    const s5 = this.stations[4];
    const sk = getSkin(progress.skinId);
    drawEntityDropShadow(ctx, s5.x + s5.w * 0.5, s5.y + s5.h + 1, s5.w * 0.56, 3.6, 0, { strength: 0.5, dirX: 0.4, dirY: 0.4, r: 192, g: 132, b: 252 });
    this.drawBlock25D(s5.x, s5.y, s5.w, s5.h, 10, "#29203a", "#161022", "#c084fc");
    this.drawFloorLightSpill(ctx, s5.x - 2, s5.y + s5.h - 2, s5.w + 8, 18, "192, 132, 252", 0.24);
    pxChamfer(ctx, s5.x + 4, s5.y + 4, s5.w - 8, 27, "#090f1c", "#060910", "#94a3b8", null, 2);
    pxEllipse(ctx, s5.x + s5.w * 0.5, s5.y + 9.5, 4.5, 3.5, sk.helmet);
    ctx.fillStyle = sk.visor;
    ctx.fillRect(s5.x + 14, s5.y + 8, 6, 2.5);
    pxChamfer(ctx, s5.x + 12, s5.y + 13, 10, 9, sk.torso, "#060910", sk.torsoHi, null, 1.5);
    ctx.fillStyle = sk.pants;
    ctx.fillRect(s5.x + 13, s5.y + 22, 3, 6);
    ctx.fillRect(s5.x + 18, s5.y + 22, 3, 6);
    ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
    ctx.fillRect(s5.x + 6.5, s5.y + 6, 1.5, 21);
    ctx.fillStyle = Math.sin(this.time * 4) > 0 ? "#c084fc" : "#7e22ce";
    ctx.fillRect(s5.x + 6, s5.y + 1.5, s5.w - 12, 2);
    if (this.nearStation?.id === "wardrobe") {
      ctx.strokeStyle = `rgba(192, 132, 252, ${0.45 + pulse * 0.55})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(s5.x - 1, s5.y - 1, s5.w + 2, s5.h + 2);
      ctx.lineWidth = 1;
    }
  }

  drawInternDesk(ctx: CanvasRenderingContext2D, lvl: number, lights: LightDef[]) {
    const li = lights ? this.sampleLightAt(118, 210, lights) : null;
    drawEntityDropShadow(ctx, 118, 211, 32, 4.5, 0, li);
    this.drawBlock25D(88, 182, 60, 28, 8, "#293446", "#161d29", "#38bdf8");
    pxChamfer(ctx, 96, 177, 28, 17, "#111827", "#060910", "#475569", null, 1.5);
    this.drawLiveWaveform(ctx, 98, 179.5, 24, 11, lvl === 1 ? "#f59e0b" : "#33ff66", 2.5);
    pxChamfer(ctx, 134, 185, 5, 5, "#e2e8f0", "#060910", "#ffffff", null, 1);
    ctx.fillStyle = "#f97316"; ctx.fillRect(128, 193, 8, 5);
  }

  drawNPC(ctx: CanvasRenderingContext2D, npc: NPCDef, lvl: number, lightInfo: LightSample | null = null) {
    const cheering = this.celebrateTimer > 0 || (lvl === 3 && Math.sin(this.time * 6 + npc.x) > 0.3);
    const typing = !npc.moving && npc.waypoints[npc.wpIdx].action === "type";
    const inspecting = !npc.moving && npc.waypoints[npc.wpIdx].action === "inspect";
    const thinking = !npc.moving && !typing && !inspecting;

    const walkAngle = npc.moving ? npc.walkPhase * Math.PI * 2 : 0;
    const walkSin = npc.moving ? Math.sin(walkAngle) : 0;
    const bobAbs = npc.moving ? Math.abs(walkSin) : 0;
    const typeJitter = typing ? Math.sin(this.time * 16 + npc.x) * 1.15 : 0;
    const inspectSwing = inspecting ? Math.sin(this.time * 10 + npc.x) * 1.3 : 0;
    const jumpY = cheering ? -Math.abs(Math.sin(this.time * 9 + npc.x)) * 3.2 : 0;
    const nodY = thinking ? Math.sin(this.time * 3.4 + npc.x) * 0.45 : (typing ? Math.sin(this.time * 8 + npc.x) * 0.3 : 0);
    const step = npc.moving ? walkSin * 1.65 : 0;

    const cx = pxSnap(npc.x);
    const cy = pxSnap(npc.y + jumpY - bobAbs * 0.85);
    const noOut = null;

    drawEntityDropShadow(ctx, cx, pxSnap(npc.y), 5.6, 1.75, bobAbs + (cheering ? 0.45 : 0), lightInfo);

    ctx.save();
    ctx.translate(cx, cy);
    if (npc.moving) {
      const leanSign = (npc.dir === "left" || npc.dir === "down-left" || npc.dir === "up-left") ? -1
        : (npc.dir === "right" || npc.dir === "down-right" || npc.dir === "up-right") ? 1
        : Math.cos(walkAngle) * 0.3;
      ctx.rotate(leanSign * 0.038);
    }

    pxChamfer(ctx, -4.5, -7 + step, 3.5, 6.5, "#1e293b", noOut, "#334155", "#0f172a", 1);
    pxChamfer(ctx, 1, -7 - step, 3.5, 6.5, "#1e293b", noOut, "#334155", "#0f172a", 1);

    pxChamfer(ctx, -5, -15.5, 10, 9.5, npc.suit, noOut, npc.coat, npc.suitShade, 1.5);
    ctx.fillStyle = npc.coat;
    ctx.fillRect(-2.5, -15, 5, 7);
    ctx.fillStyle = "#f97316";
    ctx.fillRect(1.5, -13.5, 2, 1.5);

    if (cheering) {
      pxChamfer(ctx, -8, -19, 3, 5.5, npc.coat, noOut, "#ffffff", "#cbd5e1", 1);
      pxChamfer(ctx, 5, -19, 3, 5.5, npc.coat, noOut, "#ffffff", "#cbd5e1", 1);
    } else if (typing) {
      pxChamfer(ctx, -7.5, -14.5 + typeJitter * 0.55, 2.5, 5, npc.coat, noOut, "#ffffff", "#cbd5e1", 0.5);
      pxChamfer(ctx, 5, -14.5 - typeJitter * 0.55, 2.5, 5, npc.coat, noOut, "#ffffff", "#cbd5e1", 0.5);
    } else if (inspecting) {
      pxChamfer(ctx, -7.5, -14.5, 2.5, 5, npc.coat, noOut, "#ffffff", "#cbd5e1", 0.5);
      pxChamfer(ctx, 5, -15 + inspectSwing * 0.65, 2.5, 5, npc.coat, noOut, "#ffffff", "#cbd5e1", 0.5);
      if (Math.sin(this.time * 16) > 0.72) {
        ctx.fillStyle = "#fde047";
        ctx.fillRect(4.5, -16.5, 2, 2);
      }
    } else {
      pxChamfer(ctx, -7.5, -14.5 + step * 0.8, 2.5, 5.5, npc.coat, noOut, "#ffffff", "#cbd5e1", 0.5);
      pxChamfer(ctx, 5, -14.5 - step * 0.8, 2.5, 5.5, npc.coat, noOut, "#ffffff", "#cbd5e1", 0.5);
    }

    pxEllipse(ctx, 0, -19.5 + nodY, 4.4, 4.1, npc.skin);
    pxEllipse(ctx, 0, -22 + nodY, 4.6, 2.2, npc.hair);
    if (npc.headset) {
      ctx.fillStyle = "#33ff66";
      ctx.fillRect(-4.8, -20.5 + nodY, 1.5, 3.5);
    }
    const facingBack = npc.dir === "up" || npc.dir === "up-left" || npc.dir === "up-right";
    if (!facingBack) {
      const eyeShift = (npc.dir === "left" || npc.dir === "down-left" || npc.dir === "up-left") ? -0.8
        : (npc.dir === "right" || npc.dir === "down-right" || npc.dir === "up-right") ? 0.8 : 0;
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(pxSnap(-2.4 + eyeShift), -19.5 + nodY, 1.5, 1.5);
      ctx.fillRect(pxSnap(1.0 + eyeShift), -19.5 + nodY, 1.5, 1.5);
      if (npc.glasses) {
        ctx.fillStyle = "#94a3b8";
        ctx.fillRect(pxSnap(-3.3 + eyeShift), -20 + nodY, 6.8, 1);
      }
    }

    if (lightInfo && lightInfo.strength > 0.10) {
      const rimAlpha = Math.min(0.55, lightInfo.strength * 0.58);
      const towardX = -lightInfo.dirX;
      ctx.fillStyle = `rgba(${lightInfo.r}, ${lightInfo.g}, ${lightInfo.b}, ${rimAlpha.toFixed(2)})`;
      ctx.fillRect(pxSnap(-2.5 + towardX * 1.2), pxSnap(-24 + nodY), 4.5, 1);
      ctx.fillRect(pxSnap(towardX >= 0 ? 4.2 : -5.4), pxSnap(-15.2), 1.2, 4.5);
      ctx.fillRect(pxSnap(towardX >= 0 ? 3.5 : -4.6), pxSnap(-21.5 + nodY), 1, 3.5);
    }

    ctx.restore();
  }

  updateRover(dt: number) {
    const rv = this.rover;
    const wp = rv.waypoints[rv.wpIdx];
    if (rv.pauseTimer > 0) {
      rv.pauseTimer -= dt;
      return;
    }
    const dx = wp.x - rv.x;
    const dy = wp.y - rv.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1.5) {
      rv.x = wp.x;
      rv.y = wp.y;
      rv.pauseTimer = wp.pause;
      rv.wpIdx = (rv.wpIdx + 1) % rv.waypoints.length;
    } else {
      const sp = 22 * dt;
      rv.x += (dx / dist) * sp;
      rv.y += (dy / dist) * sp;
      rv.wheelPhase = (rv.wheelPhase + dt * 5) % 1;
      rv.dir = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
    }
  }

  drawWallMissionRewards(ctx: CanvasRenderingContext2D) {
    const done = progress.completedMissions;

    if (done.includes("m1_cml1")) {
      const fx = 66, fy = 26, fw = 38, fh = 14;
      pxChamfer(ctx, fx, fy, fw, fh, "#050b18", "#060910", "#cbd5e1", "#334155", 1);
      ctx.fillStyle = "#0ea5e9";
      ctx.fillRect(fx + 5, fy + 3.5, 28, 8);
      ctx.fillStyle = "#10b981";
      ctx.fillRect(fx + 9, fy + 5, 7, 4);
      ctx.fillRect(fx + 21, fy + 6, 8, 4.5);
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(fx + 6, fy + 4, 10, 1.5);
      ctx.fillRect(fx + 22, fy + 4.5, 7, 1);
      ctx.fillStyle = "rgba(186, 230, 253, 0.35)";
      ctx.fillRect(fx + 4, fy + 2.5, 30, 1.5);
    }

    if (done.includes("m7_dart")) {
      const fx = 152, fy = 26, fw = 38, fh = 14;
      pxChamfer(ctx, fx, fy, fw, fh, "#0a1628", "#060910", "#f97316", "#1e293b", 1);
      ctx.strokeStyle = "#38bdf8";
      ctx.beginPath();
      ctx.moveTo(fx + 4, fy + 10);
      ctx.lineTo(fx + 21, fy + 6.5);
      ctx.stroke();
      ctx.strokeStyle = "#f59e0b";
      ctx.setLineDash([2, 1.5]);
      ctx.beginPath();
      ctx.moveTo(fx + 21, fy + 6.5);
      ctx.lineTo(fx + 33, fy + 4);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#94a3b8";
      ctx.fillRect(fx + 19, fy + 5, 4.5, 3.5);
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(fx + 12, fy + 7.5, 2, 2);
      ctx.fillStyle = "#33ff66";
      ctx.fillRect(fx + 32, fy + 3.5, 2, 2);
    }

    if (done.includes("m5_mars")) {
      const fx = 324, fy = 26, fw = 34, fh = 14;
      pxChamfer(ctx, fx, fy, fw, fh, "#2e1008", "#060910", "#fb923c", "#431407", 1);
      ctx.fillStyle = "#c2410c";
      ctx.fillRect(fx + 3, fy + 4, 28, 7.5);
      ctx.fillStyle = "#ea580c";
      ctx.fillRect(fx + 5, fy + 5, 11, 4);
      ctx.fillRect(fx + 20, fy + 4.5, 9, 4.5);
      ctx.fillStyle = "#7c2d12";
      ctx.fillRect(fx + 11, fy + 7.5, 13, 3.5);
      ctx.fillStyle = "#fdba74";
      ctx.fillRect(fx + 4, fy + 3, 26, 1.5);
    }

    if (done.includes("m2_cml2")) {
      const fx = 410, fy = 26, fw = 38, fh = 14;
      pxChamfer(ctx, fx, fy, fw, fh, "#0f172a", "#060910", "#94a3b8", "#334155", 1);
      pxEllipse(ctx, fx + 19, fy + 7, 7, 4.5, "#cbd5e1");
      pxEllipse(ctx, fx + 16.5, fy + 6.5, 2, 1.5, "#64748b");
      pxEllipse(ctx, fx + 21.5, fy + 7.5, 2.2, 1.5, "#475569");
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(fx + 6, fy + 4.5, 3, 1.5);
      ctx.fillRect(fx + 29, fy + 9, 3, 1.5);
      ctx.fillStyle = "#facc15";
      ctx.fillRect(fx + 19, fy + 9, 1.5, 1.5);
    }

    if (done.includes("m14_voyager")) {
      const vx = 257, vy = 26, vw = 21, vh = 14;
      pxChamfer(ctx, vx, vy, vw, vh, "#1e1b18", "#060910", "#fbbf24", "#78350f", 1);
      pxEllipse(ctx, vx + 10.5, vy + 7, 4.8, 4.4, "#fbbf24");
      pxEllipse(ctx, vx + 10.5, vy + 7, 1.5, 1.4, "#78350f");
      ctx.fillStyle = "#fef08a";
      ctx.fillRect(vx + 8, vy + 4, 2, 1);
      ctx.fillRect(vx + 3, vy + 5, 2, 1);
      ctx.fillRect(vx + 16, vy + 9, 2, 1);
    }
  }

  drawWorkbenchHoloGlobe(ctx: CanvasRenderingContext2D) {
    const gx = 220, gy = 56;
    const bob = Math.sin(this.time * 2.8) * 0.9;
    pxChamfer(ctx, gx - 6, gy + 5, 12, 4, "#0f172a", "#060910", "#38bdf8", null, 1);
    const halo = ctx.createRadialGradient(gx, gy - 1 + bob, 1, gx, gy - 1 + bob, 9);
    halo.addColorStop(0, "rgba(56, 189, 248, 0.55)");
    halo.addColorStop(1, "rgba(56, 189, 248, 0)");
    ctx.fillStyle = halo;
    ctx.fillRect(gx - 9, gy - 10 + bob, 18, 18);
    pxEllipse(ctx, gx, gy - 1 + bob, 5, 4.8, "#0284c7");
    const lon = Math.sin(this.time * 1.9) * 2.2;
    ctx.fillStyle = "#34d399";
    ctx.fillRect(pxSnap(gx - 2 + lon * 0.6), pxSnap(gy - 3 + bob), 3, 2);
    ctx.fillRect(pxSnap(gx + 0.5 - lon * 0.4), pxSnap(gy + bob), 2.5, 2);
    ctx.fillStyle = "#e0f2fe";
    ctx.fillRect(pxSnap(gx - 2.5), pxSnap(gy - 4.5 + bob), 2, 1);
  }

  drawMoonVitrine(ctx: CanvasRenderingContext2D, lights: LightDef[]) {
    const vx = 363, vy = 52, vw = 17, vh = 28;
    const li = this.sampleLightAt(vx + vw * 0.5, vy + vh, lights);
    drawEntityDropShadow(ctx, vx + vw * 0.5, vy + vh + 0.5, 9.5, 2.6, 0, li);
    this.drawBlock25D(vx, vy + 10, vw, vh - 10, 7, "#273449", "#0f172a", "#94a3b8");
    pxChamfer(ctx, vx + 2.5, vy + 1, vw - 5, 13, "#0d1a2e", "#060910", "#bae6fd", null, 1.5);
    pxEllipse(ctx, vx + vw * 0.5, vy + 9, 4.2, 3.2, "#cbd5e1");
    ctx.fillStyle = "#64748b";
    ctx.fillRect(vx + 6, vy + 8, 2, 1.5);
    ctx.fillRect(vx + 9.5, vy + 9.5, 2, 1.5);
    ctx.fillStyle = "rgba(186, 230, 253, 0.35)";
    ctx.fillRect(vx + 4, vy + 2.5, 1.5, 9);
  }

  drawSolarCMEMonitor(ctx: CanvasRenderingContext2D) {
    const mx = 16, my = 158, mw = 15, mh = 32;
    pxChamfer(ctx, mx, my, mw, mh, "#1e293b", "#060910", "#f59e0b", "#0f172a", 1.5);
    ctx.fillStyle = "#160b04";
    ctx.fillRect(mx + 2, my + 3, mw - 4, mh - 7);
    pxEllipse(ctx, mx + 4.5, my + 16, 2.5, 3.5, "#f59e0b");
    const flare = 0.5 + 0.5 * Math.sin(this.time * 4.6);
    ctx.strokeStyle = `rgba(251, 146, 60, ${(0.55 + flare * 0.45).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(mx + 5, my + 16, 4 + flare * 2.5, -1.0, 1.0);
    ctx.stroke();
    this.drawLiveWaveform(ctx, mx + 2.5, my + 22, mw - 5, 4, "#fbbf24", 4.1);
  }

  drawJWSTShowcase(ctx: CanvasRenderingContext2D, lights: LightDef[]) {
    const jx = 232, jy = 46, jw = 26, jh = 30;
    const li = this.sampleLightAt(jx + jw * 0.5, jy + jh, lights);
    drawEntityDropShadow(ctx, jx + jw * 0.5, jy + jh + 0.5, 13.5, 3.2, 0, li);
    this.drawBlock25D(jx, jy + 12, jw, jh - 12, 7, "#1e293b", "#0b1322", "#fbbf24");
    pxChamfer(ctx, jx + 3.5, jy + 1, jw - 7, 15, "#090d16", "#060910", "#fbbf24", null, 2);
    const cx = jx + jw * 0.5;
    const cy = jy + 8.5;
    const glint = 0.65 + 0.35 * Math.sin(this.time * 3.2);
    const hexCol = `rgba(251, 191, 36, ${glint.toFixed(2)})`;
    const cells = [
      [-4.5, -3], [0, -3.5], [4.5, -3],
      [-5.5, 0], [0, 0], [5.5, 0],
      [-4.5, 3], [0, 3.5], [4.5, 3]
    ];
    for (const [ox, oy] of cells) {
      ctx.fillStyle = ox === 0 && oy === 0 ? "#0f172a" : hexCol;
      ctx.fillRect(pxSnap(cx + ox - 1.8), pxSnap(cy + oy - 1.4), 3.6, 2.8);
    }
    ctx.fillStyle = "#fef08a";
    ctx.fillRect(pxSnap(cx - 1), pxSnap(cy - 1), 2, 2);
  }

  drawMarsRover(ctx: CanvasRenderingContext2D, lights: LightDef[]) {
    const rv = this.rover;
    const rx = pxSnap(rv.x), ry = pxSnap(rv.y);
    const li = this.sampleLightAt(rx, ry, lights);
    drawEntityDropShadow(ctx, rx, ry + 0.5, 8.5, 2.4, 0, li);
    const facingLeft = rv.dir === "left";
    const jiggle = Math.sin(rv.wheelPhase * Math.PI * 2) * 0.45;
    ctx.fillStyle = "#090d14";
    for (const wx of [-6.5, -1.5, 3.5]) {
      ctx.fillRect(pxSnap(rx + wx), pxSnap(ry - 2.5 + jiggle * 0.4), 3, 2.5);
    }
    pxChamfer(ctx, rx - 7, ry - 7.5 + jiggle * 0.5, 14, 5.5, "#f1f5f9", "#060910", "#ffffff", "#94a3b8", 1);
    ctx.fillStyle = "#fb923c";
    ctx.fillRect(pxSnap(rx - 4), pxSnap(ry - 6.5 + jiggle * 0.5), 8, 2);
    const mastX = facingLeft ? rx - 5 : rx + 3;
    ctx.fillStyle = "#cbd5e1";
    ctx.fillRect(pxSnap(mastX), pxSnap(ry - 12.5 + jiggle * 0.5), 2, 5.5);
    pxChamfer(ctx, mastX - 1.5, ry - 14.5 + jiggle * 0.5, 5, 3, "#f8fafc", "#060910", "#ffffff", null, 0.5);
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(pxSnap(facingLeft ? mastX - 1 : mastX + 1.5), pxSnap(ry - 13.5 + jiggle * 0.5), 2, 1.5);
  }

  drawEuropaCylinder(ctx: CanvasRenderingContext2D, lights: LightDef[]) {
    const ex = 446, ey = 122, ew = 12, eh = 18;
    const li = this.sampleLightAt(ex + ew * 0.5, ey + eh, lights);
    drawEntityDropShadow(ctx, ex + ew * 0.5, ey + eh + 0.5, 7, 2.2, 0, li);
    this.drawBlock25D(ex, ey + 6, ew, eh - 6, 5, "#1e293b", "#091220", "#38bdf8");
    pxChamfer(ctx, ex + 2, ey - 4, ew - 4, 13, "#0c4a6e", "#060910", "#7dd3fc", "#082f49", 1.5);
    const bubY = ey + 6 - ((this.time * 9) % 8);
    ctx.fillStyle = "#bae6fd";
    ctx.fillRect(pxSnap(ex + 5), pxSnap(bubY), 2, 1.5);
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(ex + 2, ey - 5, ew - 4, 2);
  }

  drawCassiniHologram(ctx: CanvasRenderingContext2D, lights: LightDef[]) {
    const cx = 166, cy = 197;
    const li = this.sampleLightAt(cx, 206, lights);
    drawEntityDropShadow(ctx, cx, 206.5, 11, 3, 0, li);
    this.drawBlock25D(156, 188, 20, 18, 7, "#1e293b", "#091220", "#fbbf24");
    const bob = Math.sin(this.time * 2.8) * 1;
    ctx.strokeStyle = "rgba(251, 191, 36, 0.85)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 8 + bob, 9.5, 3.2, -0.22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
    pxEllipse(ctx, cx, cy - 8 + bob, 4.2, 4, "#f59e0b");
    ctx.fillStyle = "#fde68a";
    ctx.fillRect(cx - 2, cy - 9.5 + bob, 3, 1);
    const tx = cx + Math.cos(this.time * 2.2) * 8;
    const ty = cy - 9 + bob + Math.sin(this.time * 2.2) * 3;
    ctx.fillStyle = "#fb923c";
    ctx.fillRect(pxSnap(tx), pxSnap(ty), 2, 2);
  }

  drawParkerShowcase(ctx: CanvasRenderingContext2D, lights: LightDef[]) {
    const px = 110, py = 50, pw = 20, ph = 26;
    const li = this.sampleLightAt(px + pw * 0.5, py + ph, lights);
    drawEntityDropShadow(ctx, px + pw * 0.5, py + ph + 0.5, 10, 2.8, 0, li);
    this.drawBlock25D(px, py + 9, pw, ph - 9, 7, "#27272a", "#0f172a", "#f97316");
    const glow = 0.65 + 0.35 * Math.sin(this.time * 4.5);
    pxChamfer(ctx, px + 3, py + 1, pw - 6, 13, "#18181b", "#060910", "#f97316", null, 2);
    pxEllipse(ctx, px + pw * 0.5, py + 7, 4.8, 3.5, `rgba(251, 146, 60, ${glow.toFixed(2)})`);
    pxChamfer(ctx, px + 6, py + 4, 8, 5.5, "#e2e8f0", "#060910", "#ffffff", "#64748b", 1);
  }

  drawGatewayModule(ctx: CanvasRenderingContext2D, lights: LightDef[]) {
    const gx = 344, gy = 156, gw = 20, gh = 24;
    const li = this.sampleLightAt(gx + gw * 0.5, gy + gh, lights);
    drawEntityDropShadow(ctx, gx + gw * 0.5, gy + gh + 0.5, 11, 3, 0, li);
    this.drawBlock25D(gx, gy + 7, gw, gh - 7, 7, "#1e3a8a", "#0f172a", "#38bdf8");
    pxChamfer(ctx, gx + 5, gy + 1, 10, 11, "#f1f5f9", "#060910", "#ffffff", "#94a3b8", 1.5);
    ctx.fillStyle = "#0ea5e9";
    ctx.fillRect(gx + 1, gy + 4, 4, 5);
    ctx.fillRect(gx + 15, gy + 4, 4, 5);
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(gx + 8, gy + 3, 4, 2);
    ctx.fillStyle = Math.sin(this.time * 5) > 0 ? "#33ff66" : "#065f46";
    ctx.fillRect(gx + 9, gy + 8, 2, 2);
  }

  drawJunoReactorCore(ctx: CanvasRenderingContext2D, lights: LightDef[]) {
    const rx = 66, ry = 200, rw = 18, rh = 18;
    const li = this.sampleLightAt(rx + rw * 0.5, ry + rh, lights);
    drawEntityDropShadow(ctx, rx + rw * 0.5, ry + rh + 0.5, 10, 2.8, 0, li);
    this.drawBlock25D(rx, ry + 5, rw, rh - 5, 6, "#182232", "#090f1a", "#33ff66");
    const pulse = 0.65 + 0.35 * Math.sin(this.time * 5.4);
    pxChamfer(ctx, rx + 3, ry - 4, rw - 6, 13, "#0f172a", "#060910", "#475569", null, 1.5);
    ctx.fillStyle = `rgba(51, 255, 102, ${pulse.toFixed(2)})`;
    ctx.fillRect(rx + 6, ry - 1, rw - 12, 8);
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(rx + 4, ry + 2, 2, 4);
    ctx.fillRect(rx + rw - 6, ry + 2, 2, 4);
  }

  drawRomanDeepMonitor(ctx: CanvasRenderingContext2D) {
    const mx = 456, my = 152, mw = 13, mh = 30;
    pxChamfer(ctx, mx, my, mw, mh, "#1e293b", "#060910", "#c084fc", "#0f172a", 1.5);
    ctx.fillStyle = "#08051a";
    ctx.fillRect(mx + 2, my + 3, mw - 4, mh - 7);
    for (let i = 0; i < 6; i++) {
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(this.time * 3.5 + i * 1.3));
      ctx.fillStyle = i % 2 === 0 ? `rgba(192, 132, 252, ${tw.toFixed(2)})` : `rgba(56, 189, 248, ${tw.toFixed(2)})`;
      ctx.fillRect(mx + 3 + (i % 3) * 2.5, my + 5 + i * 3.4, 2, 1.5);
    }
  }

  drawDragonflyPad(ctx: CanvasRenderingContext2D, lights: LightDef[]) {
    const dx = 22, dy = 204, dw = 16, dh = 14;
    const li = this.sampleLightAt(dx + dw * 0.5, dy + dh, lights);
    drawEntityDropShadow(ctx, dx + dw * 0.5, dy + dh + 0.5, 8.5, 2.5, 0, li);
    this.drawBlock25D(dx, dy + 4, dw, dh - 4, 5, "#1e293b", "#0f172a", "#38bdf8");
    const hover = Math.sin(this.time * 4.2) * 1.1;
    pxChamfer(ctx, dx + 4, dy - 3 + hover, 8, 5, "#f59e0b", "#060910", "#fde68a", null, 1);
    const blade = Math.sin(this.time * 22) > 0 ? 5 : 2.5;
    ctx.fillStyle = "#bae6fd";
    ctx.fillRect(dx + 8 - blade, dy - 4.5 + hover, blade * 2, 1);
  }

  drawMarsBaseHologram(ctx: CanvasRenderingContext2D, lvl: number) {
    const cx = 242;
    const cy = lvl === 3 ? 156 : 158;
    const bob = Math.sin(this.time * 2.6) * 1.2;
    const holoGrad = ctx.createLinearGradient(cx, cy + 4, cx, cy - 22);
    holoGrad.addColorStop(0, "rgba(249, 115, 22, 0.28)");
    holoGrad.addColorStop(1, "rgba(56, 189, 248, 0)");
    ctx.fillStyle = holoGrad;
    ctx.fillRect(cx - 12, cy - 22, 24, 26);
    pxEllipse(ctx, cx, cy - 11 + bob, 4.5, 4.2, "#c2410c");
    ctx.fillStyle = "#fb923c";
    ctx.fillRect(cx - 2, cy - 13 + bob, 2.5, 1.5);
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 11 + bob, 11, 3.8, Math.sin(this.time * 0.7) * 0.2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
    const sx = cx + Math.cos(this.time * 1.8) * 11;
    const sy = cy - 11 + bob + Math.sin(this.time * 1.8) * 3.8;
    ctx.fillStyle = "#fbbf24";
    ctx.fillRect(pxSnap(sx) - 1, pxSnap(sy) - 1, 2.5, 2.5);
  }

  drawDartKineticTrophy(ctx: CanvasRenderingContext2D, lvl: number, lights: LightDef[]) {
    const cx = lvl === 3 ? 264 : 242;
    const cy = lvl === 3 ? 156 : 158;
    const bob = Math.sin(this.time * 3) * 0.9;
    if (lvl < 3) {
      const li = this.sampleLightAt(cx, 166, lights);
      drawEntityDropShadow(ctx, cx, 166.5, 8.5, 2.5, 0, li);
      this.drawBlock25D(cx - 8, cy - 4, 16, 12, 6, "#1e293b", "#0b3d91", "#fbbf24");
    } else {
      pxEllipse(ctx, cx, cy + 2, 7.5, 2.5, "#090d14");
    }
    pxEllipse(ctx, cx - 2.5, cy - 7 + bob, 3.2, 2.6, "#94a3b8");
    ctx.fillStyle = "#f97316";
    ctx.fillRect(pxSnap(cx + 1), pxSnap(cy - 8 + bob), 3, 2);
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(pxSnap(cx + 4), pxSnap(cy - 9.5 + bob), 1.5, 5);
    ctx.fillStyle = "#fde047";
    ctx.fillRect(pxSnap(cx - 0.5), pxSnap(cy - 7.5 + bob), 1.5, 1.5);
  }
}

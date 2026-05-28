import * as Phaser from "phaser";
import { FONT, THEME, EASE } from "./theme";

export function ensureParticleTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists("frx-particle")) return;
  const g = scene.make.graphics({ x: 0, y: 0 });
  g.setVisible(false);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(4, 4, 4);
  g.generateTexture("frx-particle", 8, 8);
  g.destroy();

  if (!scene.textures.exists("frx-glow")) {
    const g2 = scene.make.graphics({ x: 0, y: 0 });
    g2.setVisible(false);
    g2.fillStyle(0xffffff, 1);
    g2.fillCircle(16, 16, 16);
    g2.generateTexture("frx-glow", 32, 32);
    g2.destroy();
  }
}

export function spawnTrail(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: number
): Phaser.GameObjects.Particles.ParticleEmitter {
  return scene.add.particles(x, y, "frx-particle", {
    speed: { min: 8, max: 40 },
    scale: { start: 0.5, end: 0 },
    alpha: { start: 0.8, end: 0 },
    lifespan: 320,
    frequency: 30,
    tint: color,
    blendMode: Phaser.BlendModes.ADD,
    follow: undefined as unknown as Phaser.Types.Math.Vector2Like,
  });
}

export function tweenFlyToTray(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  targetX: number,
  targetY: number,
  color: number,
  onComplete: () => void
): void {
  const trail = scene.add.particles(container.x, container.y, "frx-particle", {
    speed: { min: 4, max: 24 },
    scale: { start: 0.45, end: 0 },
    alpha: { start: 0.7, end: 0 },
    lifespan: 280,
    frequency: 25,
    tint: color,
    blendMode: Phaser.BlendModes.ADD,
  });

  scene.tweens.add({
    targets: container,
    x: targetX,
    y: targetY,
    scale: 0.55,
    duration: EASE.flyDuration,
    ease: EASE.fly,
    onUpdate: () => {
      trail.setPosition(container.x, container.y);
    },
    onComplete: () => {
      trail.destroy();
      onComplete();
    },
  });
}

export function matchExplosion(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: number,
  amount: number
): void {
  try {
    const burst = scene.add.particles(x, y, "frx-particle", {
      speed: { min: 80, max: 220 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 520,
      quantity: 22,
      tint: [color, THEME.glowMatch, THEME.hudCyan],
      blendMode: Phaser.BlendModes.ADD,
    });

    const ring = scene.add.image(x, y, "frx-glow");
    ring.setTint(THEME.glowMatch);
    ring.setAlpha(0.7);
    ring.setScale(0.2);
    ring.setBlendMode(Phaser.BlendModes.ADD);
    ring.setDepth(9000);

    scene.tweens.add({
      targets: ring,
      scale: 2.2,
      alpha: 0,
      duration: 380,
      ease: "Cubic.easeOut",
      onComplete: () => ring.destroy(),
    });

    floatScoreText(scene, x, y - 20, amount, "#26d0ff");
    scene.time.delayedCall(600, () => burst.destroy());
  } catch {
    // particles optional
  }

  pulseCamera(scene);
}

export function floatScoreText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  amount: number,
  colorHex = "#26d0ff"
): void {
  const txt = scene.add.text(x, y, `+${amount}`, {
    fontFamily: FONT.display,
    fontSize: "24px",
    color: colorHex,
    fontStyle: "bold",
    stroke: "#0a0e14",
    strokeThickness: 5,
  });
  txt.setOrigin(0.5, 0.5);
  txt.setDepth(10_000);

  scene.tweens.add({
    targets: txt,
    y: y - 56,
    alpha: 0,
    scale: 1.4,
    duration: 720,
    ease: "Cubic.easeOut",
    onComplete: () => txt.destroy(),
  });
}

export function pulseCamera(scene: Phaser.Scene): void {
  scene.cameras.main.flash(90, 0xff, 0x46, 0x55);
  scene.cameras.main.shake(60, 0.003);
}

export function shrinkAndVanish(
  scene: Phaser.Scene,
  targets: Phaser.GameObjects.Container[],
  onComplete: () => void
): void {
  if (targets.length === 0) {
    onComplete();
    return;
  }
  let done = 0;
  for (const t of targets) {
    scene.tweens.add({
      targets: t,
      scale: 0,
      alpha: 0,
      angle: Phaser.Math.Between(-20, 20),
      duration: EASE.matchShrink,
      ease: "Back.easeIn",
      onComplete: () => {
        t.destroy();
        done += 1;
        if (done >= targets.length) onComplete();
      },
    });
  }
}

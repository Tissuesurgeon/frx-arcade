import * as Phaser from "phaser";
import { FONT } from "./theme";

export function burstMatchParticles(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: number
): void {
  try {
    const emitter = scene.add.particles(x, y, "frx-particle", {
      speed: { min: 40, max: 140 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.6, end: 0 },
      lifespan: 420,
      quantity: 14,
      tint: color,
      blendMode: Phaser.BlendModes.ADD,
    });
    scene.time.delayedCall(500, () => emitter.destroy());
  } catch {
    // Particles optional if texture missing
  }
}

export function ensureParticleTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists("frx-particle")) return;
  const g = scene.make.graphics({ x: 0, y: 0 });
  g.setVisible(false);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(4, 4, 4);
  g.generateTexture("frx-particle", 8, 8);
  g.destroy();
}

export function floatScoreText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  amount: number
): void {
  const txt = scene.add.text(x, y, `+${amount}`, {
    fontFamily: FONT.family,
    fontSize: "22px",
    color: "#67e8f9",
    fontStyle: "bold",
    stroke: "#0f172a",
    strokeThickness: 4,
  });
  txt.setOrigin(0.5, 0.5);
  txt.setDepth(10_000);

  scene.tweens.add({
    targets: txt,
    y: y - 48,
    alpha: 0,
    scale: 1.35,
    duration: 680,
    ease: "Cubic.easeOut",
    onComplete: () => txt.destroy(),
  });
}

export function pulseCamera(scene: Phaser.Scene, color = 0x67e8f9): void {
  scene.cameras.main.flash(
    100,
    (color >> 16) & 0xff,
    (color >> 8) & 0xff,
    color & 0xff,
    false
  );
  scene.cameras.main.shake(80, 0.002);
}

export function tweenPickTile(
  container: Phaser.GameObjects.Container,
  onComplete: () => void
): void {
  const scene = container.scene;
  scene.tweens.add({
    targets: container,
    scaleX: 0.2,
    scaleY: 0.2,
    alpha: 0,
    y: container.y - 24,
    duration: 180,
    ease: "Back.easeIn",
    onComplete,
  });
}

export function popInTrayTile(
  obj: Phaser.GameObjects.Container,
  delay = 0
): void {
  const scene = obj.scene;
  obj.setScale(0.3);
  obj.setAlpha(0);
  scene.tweens.add({
    targets: obj,
    scale: 1,
    alpha: 1,
    duration: 220,
    delay,
    ease: "Back.easeOut",
  });
}

export function shakeTrayTiles(
  scene: Phaser.Scene,
  targets: Phaser.GameObjects.GameObject[]
): void {
  for (const t of targets) {
    scene.tweens.add({
      targets: t,
      x: "+=" + 4,
      duration: 50,
      yoyo: true,
      repeat: 3,
      ease: "Sine.easeInOut",
    });
  }
}

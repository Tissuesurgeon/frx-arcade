import * as Phaser from "phaser";
import { EASE } from "./theme";

export function tweenFlyToTray(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  targetX: number,
  targetY: number,
  onComplete: () => void
): void {
  scene.tweens.add({
    targets: container,
    x: targetX,
    y: targetY,
    scale: 0.55,
    duration: EASE.flyDuration,
    ease: EASE.fly,
    onComplete: () => {
      onComplete();
    },
  });
}

export function tweenMatchClear(
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
      scale: 0.4,
      alpha: 0,
      duration: EASE.matchShrink,
      ease: "Cubic.easeIn",
      onComplete: () => {
        t.destroy();
        done += 1;
        if (done >= targets.length) onComplete();
      },
    });
  }
}

export function pulseBoardContainer(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container
): void {
  scene.tweens.add({
    targets: container,
    scale: { from: 1, to: 1.006 },
    duration: EASE.shufflePulse / 2,
    yoyo: true,
    ease: "Sine.easeInOut",
  });
}

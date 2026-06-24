"use client";

import { useEffect, useRef, useState } from "react";
import { GALAXY } from "@/lib/galaxy/theme";

export function BlacktopArcade({ prompts }: { prompts: readonly string[] }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let game: { destroy: (removeCanvas: boolean, noReturn?: boolean) => void } | null = null;
    let mounted = true;

    void import("phaser")
      .then((Phaser) => {
        if (!mounted || !host) return;
        class BlacktopScene extends Phaser.Scene {
          private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
          private player?: Phaser.GameObjects.Arc;
          private promptText?: Phaser.GameObjects.Text;
          private score = 0;

          create() {
            this.cameras.main.setBackgroundColor("#05070d");
            this.add.rectangle(360, 190, 660, 300, 0x111827).setStrokeStyle(2, 0xf4c95d, 0.45);
            this.add.grid(360, 190, 660, 300, 44, 44, 0x111827, 0.2, 0x00e5ff, 0.18);
            this.player = this.add.circle(360, 250, 14, 0xf4c95d);
            this.add.text(28, 22, "SIGNAL SPRINT COURT", { color: "#f4c95d", fontSize: "14px", fontFamily: "Arial", fontStyle: "bold" });
            this.promptText = this.add.text(28, 48, prompts[0] ?? "Read the route.", { color: "#dce7ff", fontSize: "16px", fontFamily: "Arial", wordWrap: { width: 620 } });
            this.cursors = this.input.keyboard?.createCursorKeys();
            this.input.keyboard?.on("keydown-SPACE", () => {
              this.score = Math.min(this.score + 1, prompts.length - 1);
              this.promptText?.setText(prompts[this.score] ?? "Route complete. Bring it back to Rookie Plaza.");
            });
          }

          update() {
            if (!this.cursors || !this.player) return;
            const speed = 3.2;
            if (this.cursors.left.isDown) this.player.x -= speed;
            if (this.cursors.right.isDown) this.player.x += speed;
            if (this.cursors.up.isDown) this.player.y -= speed;
            if (this.cursors.down.isDown) this.player.y += speed;
            this.player.x = Phaser.Math.Clamp(this.player.x, 40, 680);
            this.player.y = Phaser.Math.Clamp(this.player.y, 80, 330);
          }
        }

        game = new Phaser.Game({
          type: Phaser.AUTO,
          width: 720,
          height: 380,
          parent: host,
          backgroundColor: "#05070d",
          input: { keyboard: true, mouse: true, touch: true, gamepad: false },
          disableContextMenu: true,
          scene: BlacktopScene,
        });
      })
      .catch(() => setFallback(true));

    return () => {
      mounted = false;
      game?.destroy(true, true);
    };
  }, [prompts]);

  return (
    <div style={{ border: `1px solid ${GALAXY.gold}66`, borderRadius: 14, overflow: "hidden", background: "#05070d", minHeight: 380 }}>
      <div ref={hostRef} style={{ width: "100%", minHeight: 380 }} />
      {fallback && (
        <div style={{ padding: 18, color: GALAXY.text }}>
          <strong>Signal Sprint fallback</strong>
          <div style={{ color: GALAXY.textMuted, marginTop: 6 }}>{prompts.join(" · ")}</div>
        </div>
      )}
    </div>
  );
}

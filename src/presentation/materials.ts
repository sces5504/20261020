import Phaser from "phaser";
/** Original runtime vector materials. No character illustration is edited. */
export function planetMaterial(
  scene: Phaser.Scene,
  key: string,
  color: string,
  seed: number,
) {
  if (scene.textures.exists(key)) return;
  const texture = scene.textures.createCanvas(key, 256, 256)!;
  const ctx = texture.context;
  ctx.clearRect(0, 0, 256, 256);
  ctx.save();
  ctx.beginPath();
  ctx.arc(128, 128, 112, 0, Math.PI * 2);
  ctx.clip();
  const base = ctx.createRadialGradient(83, 68, 8, 134, 145, 145);
  base.addColorStop(0, color);
  base.addColorStop(0.45, color + "aa");
  base.addColorStop(1, "#020710");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  let rng = seed + 123;
  const rand = () => {
    rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0;
    return rng / 4294967296;
  };
  for (let layer = 0; layer < 2; layer++)
    for (let i = 0; i < 28; i++) {
      const y = rand() * 256,
        x = rand() * 256;
      ctx.fillStyle = layer ? "#e3f2ec22" : "#071b2455";
      ctx.beginPath();
      ctx.ellipse(
        x,
        y,
        18 + rand() * 60,
        3 + rand() * 16,
        rand(),
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  const shadow = ctx.createLinearGradient(35, 30, 225, 210);
  shadow.addColorStop(0, "#fff2");
  shadow.addColorStop(0.45, "#0000");
  shadow.addColorStop(0.85, "#010613bb");
  shadow.addColorStop(1, "#000");
  ctx.fillStyle = shadow;
  ctx.fillRect(0, 0, 256, 256);
  ctx.restore();
  ctx.strokeStyle = color + "99";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(128, 128, 113, 0, Math.PI * 2);
  ctx.stroke();
  texture.refresh();
}
export function enemyMaterial(
  scene: Phaser.Scene,
  key: string,
  color: string,
  boss: boolean,
  pattern: string,
) {
  if (scene.textures.exists(key)) return;
  const texture = scene.textures.createCanvas(key, 256, 256)!,
    c = texture.context;
  c.translate(128, 128);
  c.lineJoin = "round";
  const metal = c.createLinearGradient(-70, -90, 70, 90);
  metal.addColorStop(0, "#6b818e");
  metal.addColorStop(0.45, "#223847");
  metal.addColorStop(1, "#0a1522");
  c.shadowColor = color;
  c.shadowBlur = 14;
  c.fillStyle = metal;
  c.strokeStyle = color + "bb";
  c.lineWidth = 2;
  const shape = (points: number[]) => {
    c.beginPath();
    c.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2)
      c.lineTo(points[i], points[i + 1]);
    c.closePath();
    c.fill();
    c.stroke();
  };
  if (boss) {
    for (let i = 0; i < 6; i++) {
      c.save();
      c.rotate((i * Math.PI) / 3);
      shape([-19, -48, -32, -87, -15, -111, 15, -111, 32, -87, 19, -48]);
      c.restore();
    }
    c.beginPath();
    c.arc(0, 0, 59, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.strokeStyle = "#d2c3ef66";
    c.lineWidth = 5;
    c.beginPath();
    c.arc(0, 0, 45, 0, Math.PI * 2);
    c.stroke();
  } else {
    for (const side of [-1, 1]) {
      c.save();
      c.scale(side, 1);
      shape([12, -30, 78, -76, 108, -54, 83, 28, 27, 53]);
      c.restore();
    }
    shape([0, -89, 37, -23, 28, 62, 0, 91, -28, 62, -37, -23]);
    if (pattern === "fan") {
      c.fillStyle = "#1a2c3d";
      shape([-68, -25, -45, -45, -32, 35, -58, 52]);
      shape([68, -25, 45, -45, 32, 35, 58, 52]);
    }
  }
  const glow = c.createRadialGradient(0, 0, 2, 0, 0, boss ? 34 : 22);
  glow.addColorStop(0, "#ffffff");
  glow.addColorStop(0.2, color);
  glow.addColorStop(1, color + "00");
  c.fillStyle = glow;
  c.beginPath();
  c.arc(0, 0, boss ? 34 : 22, 0, Math.PI * 2);
  c.fill();
  texture.refresh();
}

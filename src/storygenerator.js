// ============================================================
// STORY GENERATOR
// Generate gambar WA Story 1080×1920:
//   - Foto anggota di tengah atas
//   - Nama besar + info
//   - Bubble Kak Taksaka (kiri bawah) & Dokter Taksaka (kanan bawah)
// ============================================================

import { createCanvas, loadImage } from "canvas";
import axios from "axios";
import fs from "fs";
import path from "path";

// ── Warna tema ───────────────────────────────────────────────
const C = {
  bg1: "#0a0a1a",
  bg2: "#1a1040",
  bg3: "#0d1f3c",
  gold: "#FFD700",
  goldLight: "#FFF59D",
  white: "#FFFFFF",
  w80: "rgba(255,255,255,0.80)",
  w50: "rgba(255,255,255,0.50)",
  w15: "rgba(255,255,255,0.15)",
  w08: "rgba(255,255,255,0.08)",
  taksaka: "#4ecdc4",
  taksakaBg: "rgba(78,205,196,0.15)",
  taksakaBorder: "rgba(78,205,196,0.6)",
  dokter: "#ff6b6b",
  dokterBg: "rgba(255,107,107,0.15)",
  dokterBorder: "rgba(255,107,107,0.6)",
  accent: "#a78bfa",
};

// ── Helpers ──────────────────────────────────────────────────
function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ── Fetch foto dari URL → buffer ─────────────────────────────
async function fetchImage(url) {
  try {
    // Kalau path lokal (relative), skip fetch
    if (!url.startsWith("http")) return null;
    const res = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 10000,
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    return Buffer.from(res.data);
  } catch {
    return null; // fallback ke avatar default
  }
}

// ── Gambar foto bulat (avatar) ───────────────────────────────
async function drawAvatar(ctx, fotoUrl, cx, cy, radius) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  try {
    const buf = await fetchImage(fotoUrl);
    if (buf) {
      const img = await loadImage(buf);
      ctx.drawImage(img, cx - radius, cy - radius, radius * 2, radius * 2);
    } else {
      throw new Error("no image");
    }
  } catch {
    // Fallback: lingkaran dengan inisial
    ctx.fillStyle = C.w15;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = C.w15;
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    ctx.font = `bold ${radius * 0.7}px sans-serif`;
    ctx.fillStyle = C.gold;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("👤", cx, cy);
  }

  ctx.restore();
  ctx.textBaseline = "alphabetic";
}

// ── Gambar ring hias di sekitar avatar ───────────────────────
function drawAvatarRing(ctx, cx, cy, radius) {
  // Ring emas
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 6, 0, Math.PI * 2);
  ctx.strokeStyle = C.gold;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Ring luar tipis
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 14, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,215,0,0.3)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([8, 6]);
  ctx.stroke();
  ctx.setLineDash([]);
}

// ── Gambar confetti & bintang dekoratif ──────────────────────
function drawDecorations(ctx, W, H) {
  const items = [
    { x: 0.06, y: 0.06, r: 16, c: C.gold, rot: 0.3 },
    { x: 0.94, y: 0.05, r: 12, c: C.taksaka, rot: 1.1 },
    { x: 0.12, y: 0.18, r: 9, c: C.dokter, rot: 0.7 },
    { x: 0.88, y: 0.15, r: 11, c: C.gold, rot: 2.1 },
    { x: 0.04, y: 0.38, r: 7, c: C.taksaka, rot: 0.5 },
    { x: 0.96, y: 0.32, r: 8, c: C.dokter, rot: 1.8 },
    { x: 0.08, y: 0.55, r: 10, c: C.gold, rot: 0.9 },
    { x: 0.92, y: 0.50, r: 9, c: C.accent, rot: 1.5 },
    { x: 0.50, y: 0.03, r: 14, c: C.gold, rot: 0.1 },
    { x: 0.30, y: 0.08, r: 7, c: C.dokter, rot: 1.3 },
    { x: 0.70, y: 0.07, r: 8, c: C.taksaka, rot: 0.8 },
  ];
  for (const item of items) {
    ctx.save();
    ctx.translate(item.x * W, item.y * H);
    ctx.rotate(item.rot);
    ctx.fillStyle = item.c;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const r = i % 2 === 0 ? item.r : item.r * 0.4;
      i === 0
        ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
        : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

// ── Gambar bubble ucapan AI ───────────────────────────────────
function drawBubble(ctx, { x, y, w, h, color, bgColor, borderColor, label, emoji, text, side }) {
  const r = 22;

  // Shadow halus
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  roundedRect(ctx, x, y, w, h, r);
  ctx.fillStyle = bgColor;
  ctx.fill();
  ctx.restore();

  // Border
  roundedRect(ctx, x, y, w, h, r);
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Ekor bubble
  const tailW = 16, tailH = 20;
  ctx.beginPath();
  if (side === "left") {
    ctx.moveTo(x - tailW, y + 50);
    ctx.lineTo(x + 2, y + 36);
    ctx.lineTo(x + 2, y + 64);
  } else {
    ctx.moveTo(x + w + tailW, y + 50);
    ctx.lineTo(x + w - 2, y + 36);
    ctx.lineTo(x + w - 2, y + 64);
  }
  ctx.closePath();
  ctx.fillStyle = bgColor;
  ctx.fill();
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const pad = 18;
  const innerW = w - pad * 2;

  // Header: emoji + nama
  ctx.font = "bold 26px sans-serif";
  ctx.fillStyle = color;
  ctx.textAlign = "left";
  ctx.fillText(`${emoji} ${label}`, x + pad, y + pad + 22);

  // Garis pemisah
  ctx.beginPath();
  ctx.moveTo(x + pad, y + pad + 34);
  ctx.lineTo(x + w - pad, y + pad + 34);
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.25;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Teks ucapan
  ctx.font = "20px sans-serif";
  ctx.fillStyle = C.w80;
  const lines = wrapText(ctx, text, innerW);
  let ty = y + pad + 58;
  for (const line of lines) {
    if (ty > y + h - 14) break;
    ctx.fillText(line, x + pad, ty);
    ty += 28;
  }
}

// ── MAIN: Generate story image ────────────────────────────────
export async function generateStoryImage({ anggota, ucapanTaksaka, ucapanDokter, outputPath }) {
  const W = 1080, H = 1920;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // ── Background gradient ──────────────────────────────────
  const grad = ctx.createLinearGradient(0, 0, W * 0.4, H);
  grad.addColorStop(0, C.bg1);
  grad.addColorStop(0.45, C.bg2);
  grad.addColorStop(1, C.bg3);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Lingkaran dekoratif background
  for (const [cx, cy, r, a] of [
    [-80, -80, 220, 0.06], [W + 80, -60, 240, 0.05],
    [-60, H * 0.45, 180, 0.04], [W + 60, H * 0.5, 200, 0.04],
    [W / 2, H + 100, 260, 0.05],
  ]) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,${a})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Dekorasi bintang
  drawDecorations(ctx, W, H);

  // ── Brand PAGASKA ────────────────────────────────────────
  ctx.font = "bold 38px sans-serif";
  ctx.fillStyle = C.gold;
  ctx.textAlign = "center";
  ctx.fillText("✦ PAGASKA ✦", W / 2, 72);

  ctx.font = "22px sans-serif";
  ctx.fillStyle = C.w50;
  ctx.fillText("Pandu Garuda Sakti · SMKN 5 Kota Madiun", W / 2, 108);

  // Garis emas
  const lineGrad = ctx.createLinearGradient(W * 0.15, 0, W * 0.85, 0);
  lineGrad.addColorStop(0, "transparent");
  lineGrad.addColorStop(0.5, C.gold);
  lineGrad.addColorStop(1, "transparent");
  ctx.beginPath();
  ctx.moveTo(W * 0.15, 124);
  ctx.lineTo(W * 0.85, 124);
  ctx.strokeStyle = lineGrad;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // ── "Selamat Ulang Tahun" ────────────────────────────────
  ctx.font = "bold 48px sans-serif";
  ctx.fillStyle = C.white;
  ctx.textAlign = "center";
  ctx.fillText("🎂 Selamat Ulang Tahun 🎂", W / 2, 210);

  // ── Foto anggota (bulat, di tengah) ─────────────────────
  const avatarR = 190;
  const avatarCX = W / 2;
  const avatarCY = 460;

  drawAvatarRing(ctx, avatarCX, avatarCY, avatarR);
  await drawAvatar(ctx, anggota.foto, avatarCX, avatarCY, avatarR);

  // Lencana generasi
  const badgeY = avatarCY + avatarR + 30;
  roundedRect(ctx, W / 2 - 90, badgeY, 180, 38, 19);
  ctx.fillStyle = "rgba(255,215,0,0.2)";
  ctx.fill();
  ctx.strokeStyle = C.gold;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.font = "bold 20px sans-serif";
  ctx.fillStyle = C.gold;
  ctx.textAlign = "center";
  ctx.fillText(`Generasi ${anggota.generasi} · Pagaska`, W / 2, badgeY + 25);

  // ── Kotak nama ──────────────────────────────────────────
  const namaBoxY = badgeY + 58;
  const namaBoxH = 130;
  const namaBoxW = 860;
  const namaBoxX = (W - namaBoxW) / 2;

  roundedRect(ctx, namaBoxX, namaBoxY, namaBoxW, namaBoxH, 24);
  const namaBoxGrad = ctx.createLinearGradient(namaBoxX, 0, namaBoxX + namaBoxW, 0);
  namaBoxGrad.addColorStop(0, "rgba(78,205,196,0.12)");
  namaBoxGrad.addColorStop(0.5, "rgba(255,215,0,0.10)");
  namaBoxGrad.addColorStop(1, "rgba(255,107,107,0.12)");
  ctx.fillStyle = namaBoxGrad;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,215,0,0.4)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Nama
  const namaLen = anggota.nama.length;
  const namaFont = namaLen > 22 ? 52 : namaLen > 16 ? 62 : 72;
  ctx.font = `bold ${namaFont}px sans-serif`;
  const namaGrad = ctx.createLinearGradient(namaBoxX, 0, namaBoxX + namaBoxW, 0);
  namaGrad.addColorStop(0, C.taksaka);
  namaGrad.addColorStop(0.5, C.gold);
  namaGrad.addColorStop(1, C.dokter);
  ctx.fillStyle = namaGrad;
  ctx.textAlign = "center";
  ctx.fillText(anggota.nama, W / 2, namaBoxY + namaBoxH * 0.62);

  // Jabatan
  ctx.font = "bold 26px sans-serif";
  ctx.fillStyle = C.w80;
  ctx.fillText(anggota.jabatan, W / 2, namaBoxY + namaBoxH - 14);

  // Emoji perayaan
  ctx.font = "42px sans-serif";
  ctx.fillText("🎉 🎊 🎈 🎁 🎉", W / 2, namaBoxY + namaBoxH + 60);

  // ── 2 Bubble AI ──────────────────────────────────────────
  const bY = namaBoxY + namaBoxH + 90;
  const bW = 488;
  const bH = Math.min(530, H - bY - 120);
  const bPad = 24;

  // Kiri: Kak Taksaka
  drawBubble(ctx, {
    x: bPad,
    y: bY,
    w: bW,
    h: bH,
    color: C.taksaka,
    bgColor: C.taksakaBg,
    borderColor: C.taksakaBorder,
    label: "Kak Taksaka",
    emoji: "🤖",
    text: ucapanTaksaka,
    side: "left",
  });

  // Kanan: Dokter Taksaka
  drawBubble(ctx, {
    x: W - bW - bPad,
    y: bY,
    w: bW,
    h: bH,
    color: C.dokter,
    bgColor: C.dokterBg,
    borderColor: C.dokterBorder,
    label: "Dokter Taksaka",
    emoji: "🩺",
    text: ucapanDokter,
    side: "right",
  });

  // Ikon di antara 2 bubble
  ctx.font = "32px sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = C.gold;
  ctx.fillText("✨", W / 2, bY + bH / 2);

  // ── Footer ───────────────────────────────────────────────
  const fY = H - 110;
  ctx.beginPath();
  ctx.moveTo(W * 0.12, fY);
  ctx.lineTo(W * 0.88, fY);
  ctx.strokeStyle = lineGrad;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.font = "bold 30px sans-serif";
  ctx.fillStyle = C.gold;
  ctx.textAlign = "center";
  ctx.fillText("✦ PAGASKA ✦", W / 2, fY + 44);

  ctx.font = "22px sans-serif";
  ctx.fillStyle = C.w50;
  ctx.fillText("Bersama dalam satu jiwa, satu semangat.", W / 2, fY + 76);

  // ── Simpan file ──────────────────────────────────────────
  const buffer = canvas.toBuffer("image/jpeg", { quality: 0.93 });
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, buffer);
  console.log(`[Story] ✓ Gambar disimpan: ${outputPath}`);
  return buffer;
}
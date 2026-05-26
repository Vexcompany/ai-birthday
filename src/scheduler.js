// ============================================================
// SCHEDULER
// Cek ulang tahun setiap hari jam 07:00 WIB (Asia/Jakarta)
// ============================================================

import cron from "node-cron";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { generateUcapanTaksaka, generateUcapanDokter } from "./aiService.js";
import { generateStoryImage } from "./storyGenerator.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

function loadAnggota() {
  return require("../data/anggota.json");
}

// ── Cek siapa yang ulang tahun hari ini ──────────────────────
export function getCelebratedToday() {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
  const MM = String(now.getMonth() + 1).padStart(2, "0");
  const DD = String(now.getDate()).padStart(2, "0");
  const today = `${MM}-${DD}`;
  return loadAnggota().filter((a) => a.tanggalLahir === today);
}

// ── Proses satu anggota: generate ucapan + gambar + kirim ────
export async function processBirthday(anggota, sock) {
  console.log(`\n[Scheduler] 🎂 Proses: ${anggota.nama} (Gen ${anggota.generasi})`);

  try {
    // 1. Generate 2 ucapan secara paralel
    console.log("[Scheduler] Generating ucapan dari 2 AI...");
    const [ucapanTaksaka, ucapanDokter] = await Promise.all([
      generateUcapanTaksaka(anggota.panggilan, anggota.jabatan, anggota.generasi),
      generateUcapanDokter(anggota.panggilan, anggota.jabatan, anggota.generasi),
    ]);
    console.log(`[Scheduler] ✓ Taksaka: ${ucapanTaksaka.substring(0, 55)}...`);
    console.log(`[Scheduler] ✓ Dokter: ${ucapanDokter.substring(0, 55)}...`);

    // 2. Generate gambar
    const safeName = anggota.nama.replace(/[^a-zA-Z0-9]/g, "_");
    const outputPath = path.join(__dirname, `../assets/story/${safeName}_${Date.now()}.jpg`);
    const imageBuffer = await generateStoryImage({ anggota, ucapanTaksaka, ucapanDokter, outputPath });

    // 3. Post ke WA Story
    if (sock) {
      await sock.sendMessage(
        "status@broadcast",
        {
          image: imageBuffer,
          caption:
            `🎂 *Selamat Ulang Tahun ${anggota.nama}* 🎉

✨ Jabatan:
${anggota.jabatan}

🎖 Generasi:
Generasi ${anggota.generasi}

📱 Sosmed:
${anggota.sosmed}

Semoga panjang umur, sehat selalu, dan terus jadi kebanggaan PAGASKA ✨`,
        },
        { statusJidList: [] }
      );
      console.log(`[Scheduler] ✓ Story diposting untuk ${anggota.nama}`);
    }

    return { success: true, nama: anggota.nama, outputPath };
  } catch (err) {
    console.error(`[Scheduler] ✗ Gagal: ${err.message}`);
    return { success: false, nama: anggota.nama, error: err.message };
  }
}

// ── Mulai cron scheduler ─────────────────────────────────────
export function startScheduler(sock) {
  console.log("[Scheduler] ✓ Aktif — cek ulang tahun setiap hari jam 07:00 WIB");

  cron.schedule(
    "0 7 * * *",
    async () => {
      console.log("\n[Scheduler] ⏰ Cek ulang tahun...");
      const celebrants = getCelebratedToday();

      if (celebrants.length === 0) {
        console.log("[Scheduler] Tidak ada ulang tahun hari ini.");
        return;
      }

      console.log(`[Scheduler] 🎉 ${celebrants.length} ulang tahun hari ini!`);
      for (const a of celebrants) {
        await processBirthday(a, sock);
        await new Promise((r) => setTimeout(r, 3000));
      }
    },
    { timezone: "Asia/Jakarta" }
  );

  // Info kalau ada ulang tahun hari ini
  const today = getCelebratedToday();
  if (today.length > 0) {
    console.log(`[Scheduler] ℹ️  Ulang tahun HARI INI: ${today.map((a) => a.nama).join(", ")}`);
    console.log("[Scheduler]    Akan diproses jam 07:00 WIB.");
  }
}
// ============================================================
// PAGASKA BIRTHDAY BOT — Entry Point
// Koneksi WA pakai PAIRING CODE (tidak perlu scan QR)
// ============================================================

import "dotenv/config";
import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from "@blckrose/baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";
import path from "path";
import { fileURLToPath } from "url";
import readline from "readline";
import { startScheduler, getCelebratedToday, processBirthday } from "./scheduler.js";
import { loginBot } from "./aiService.js";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const AUTH_DIR = path.join(__dirname, "../auth_session");

const logger = pino({ level: "silent" }); // ganti ke "info" untuk debug

// ── Tanya input dari terminal ────────────────────────────────
function question(prompt) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(prompt, (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });
}

// ── Validasi env vars ────────────────────────────────────────
function validateEnv() {
  const required = ["BACKEND_URL", "BOT_MEMBER_NAMA", "BOT_MEMBER_JABATAN", "BOT_MEMBER_GENERASI", "PAIRING_NUMBER"];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(`\n[Boot] ✗ ENV tidak lengkap! Yang kurang: ${missing.join(", ")}`);
    console.error("[Boot]   Salin .env.example → .env lalu isi nilainya.\n");
    process.exit(1);
  }
}

// ── Main ─────────────────────────────────────────────────────
async function startBot() {
  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║   🎂  PAGASKA BIRTHDAY BOT               ║");
  console.log("║   Paskibra Gala Taksaka · SMKN 5 Madiun     ║");
  console.log("╚══════════════════════════════════════════╝\n");

  validateEnv();

  // Coba login ke backend AI
  console.log("[Boot] Menghubungkan ke backend AI...");
  try {
    await loginBot();
  } catch {
    console.warn("[Boot] ⚠ Backend AI belum bisa dihubungi sekarang, akan retry saat diperlukan.\n");
  }

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger,
    auth: state,
    printQRInTerminal: false, // kita pakai pairing code, bukan QR
    browser: ["Pagaska Bot", "Chrome", "1.0.0"],
    connectTimeoutMs: 60000,
  });

  // ── Event: connection update ─────────────────────────────
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, isNewLogin } = update;

    // ── Pairing Code: minta saat sesi baru ────────────────
    if (isNewLogin || (!state.creds.registered && connection !== "close")) {
      const phoneNumber = process.env.PAIRING_NUMBER.replace(/[^0-9]/g, "");

      try {
        // Tunggu sebentar agar socket siap
        await new Promise((r) => setTimeout(r, 2000));
        const code = await sock.requestPairingCode(phoneNumber);

        console.log("\n╔══════════════════════════════════════════╗");
        console.log("║   📱  PAIRING CODE WhatsApp               ║");
        console.log("║                                            ║");
        console.log(`║   Kode kamu: \x1b[1m\x1b[33m${code}\x1b[0m                   ║`);
        console.log("║                                            ║");
        console.log("║   Cara pakai:                              ║");
        console.log("║   WA → Setelan → Perangkat Tertaut         ║");
        console.log("║   → Tautkan Perangkat → Tautkan dgn        ║");
        console.log("║     Nomor Telepon → masukkan kode          ║");
        console.log("╚══════════════════════════════════════════╝\n");
      } catch (err) {
        console.error("[Pairing] Gagal minta pairing code:", err.message);
        console.log("[Pairing] Coba jalankan ulang bot.");
      }
    }

    if (connection === "close") {
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const reconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(`[WA] Koneksi terputus (${statusCode}). ${reconnect ? "Reconnect dalam 5 detik..." : "Session berakhir."}`);
      if (reconnect) {
        setTimeout(startBot, 5000);
      } else {
        console.log("[WA] Hapus folder auth_session/ dan jalankan ulang untuk pairing ulang.");
        process.exit(0);
      }
    }

    if (connection === "open") {
      console.log("[WA] ✅ Bot berhasil terhubung ke WhatsApp!\n");
      startScheduler(sock);
      setupCommands(sock);
      printHelp();
    }
  });

  sock.ev.on("creds.update", saveCreds);
}

// ── Command handler via chat ke diri sendiri ─────────────────
function setupCommands(sock) {
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const msg of messages) {
      if (!msg.key.fromMe) continue; // hanya proses pesan dari diri sendiri

      const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        "";

      if (!text.startsWith("!")) continue;

      const [cmd, ...args] = text.trim().toLowerCase().split(" ");
      const jid = msg.key.remoteJid;

      // !cek — siapa yang ulang tahun hari ini
      if (cmd === "!cek") {
        const list = getCelebratedToday();
        const reply =
          list.length === 0
            ? "😊 Tidak ada ulang tahun hari ini."
            : `🎂 Ulang tahun hari ini (${list.length} orang):\n` +
              list.map((a) => `• ${a.nama} — Gen ${a.generasi} (${a.jabatan})`).join("\n");
        await sock.sendMessage(jid, { text: reply });
      }

      // !tes — kirim story untuk yang ulang tahun hari ini
      if (cmd === "!tes") {
        const list = getCelebratedToday();
        if (list.length === 0) {
          await sock.sendMessage(jid, { text: "Tidak ada ulang tahun hari ini.\nGunakan: !ultah <nama>" });
          return;
        }
        await sock.sendMessage(jid, { text: `Memproses ${list.length} ulang tahun...` });
        for (const a of list) {
          const res = await processBirthday(a, sock);
          await sock.sendMessage(jid, {
            text: res.success ? `✅ Story ${a.nama} berhasil!` : `❌ ${a.nama}: ${res.error}`,
          });
        }
      }

      // !ultah <nama/panggilan> — force kirim story
      if (cmd === "!ultah" && args.length > 0) {
        const keyword = args.join(" ");
        const all = require("../data/anggota.json");
        const found = all.find(
          (a) =>
            a.nama.toLowerCase().includes(keyword) ||
            a.panggilan.toLowerCase().includes(keyword)
        );
        if (!found) {
          await sock.sendMessage(jid, { text: `❌ Anggota "${keyword}" tidak ditemukan.` });
          return;
        }
        await sock.sendMessage(jid, { text: `Memproses ulang tahun ${found.nama}...` });
        const res = await processBirthday(found, sock);
        await sock.sendMessage(jid, {
          text: res.success
            ? `✅ Story ${found.nama} berhasil diposting!`
            : `❌ Gagal: ${res.error}`,
        });
      }

      // !list [generasi] — lihat daftar anggota
      if (cmd === "!list") {
        const all = require("../data/anggota.json");
        const gen = args[0] ? parseInt(args[0]) : null;
        const filtered = gen ? all.filter((a) => a.generasi === gen) : all;
        const grouped = {};
        for (const a of filtered) {
          if (!grouped[a.generasi]) grouped[a.generasi] = [];
          grouped[a.generasi].push(`• ${a.panggilan} (${a.jabatan})`);
        }
        let reply = `📋 Daftar Anggota Pagaska${gen ? ` Gen ${gen}` : ""}:\n`;
        for (const [g, members] of Object.entries(grouped)) {
          reply += `\n*Generasi ${g}* (${members.length} orang)\n${members.join("\n")}`;
        }
        await sock.sendMessage(jid, { text: reply });
      }

      // !help
      if (cmd === "!help") {
        await sock.sendMessage(jid, { text: getHelpText() });
      }
    }
  });
}

function getHelpText() {
  return `🎂 *Pagaska Birthday Bot — Commands*

!cek              → Siapa yang ulang tahun hari ini
!tes              → Test kirim story hari ini
!ultah <nama>     → Force kirim story (contoh: !ultah Zahra)
!list             → Daftar semua anggota
!list 2           → Daftar anggota Generasi 2
!list 3           → Daftar anggota Generasi 3
!help             → Tampilkan bantuan ini

Kirim command ini ke chat diri sendiri (Saved Messages).`;
}

function printHelp() {
  console.log("─────────────────────────────────────────");
  console.log("📬 Commands (kirim ke chat diri sendiri):");
  console.log("   !cek          → cek ulang tahun hari ini");
  console.log("   !tes          → test kirim story");
  console.log("   !ultah <nama> → force story untuk anggota");
  console.log("   !list [gen]   → daftar anggota");
  console.log("   !help         → bantuan");
  console.log("─────────────────────────────────────────\n");
}

startBot().catch((err) => {
  console.error("[Boot] Fatal:", err.message);
  process.exit(1);
});

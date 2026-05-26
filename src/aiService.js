// ============================================================
// AI SERVICE
// Memanggil backend AI kamu (Vercel) untuk generate ucapan
// dari 2 persona: Kak Taksaka & Dokter Taksaka
// ============================================================

import axios from "axios";

const BACKEND_URL = process.env.BACKEND_URL?.replace(/\/$/, "");
let _token = null;

// ── Login ke backend untuk dapat JWT token ──────────────────
export async function loginBot() {
  const body = {
    nama: process.env.BOT_MEMBER_NAMA,
    jabatan: process.env.BOT_MEMBER_JABATAN,
    generasi: process.env.BOT_MEMBER_GENERASI,
  };

  try {
    const res = await axios.post(`${BACKEND_URL}/api/auth/login`, body, {
      timeout: 15000,
    });
    _token = res.data.token;
    console.log(`[AI] ✓ Login berhasil sebagai: ${res.data.user.nama}`);
    return _token;
  } catch (err) {
    const msg = err.response?.data?.error || err.message;
    console.error(`[AI] ✗ Login gagal: ${msg}`);
    throw new Error(`Login AI gagal: ${msg}`);
  }
}

async function getToken() {
  if (!_token) await loginBot();
  return _token;
}

// ── Panggil /api/chat/gemini dengan persona tertentu ────────
async function callAI(message, persona) {
  let token = await getToken();

  const doRequest = async (t) =>
    axios.post(
      `${BACKEND_URL}/api/chat/gemini`,
      { message, persona },
      {
        headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
        timeout: 30000,
      }
    );

  try {
    const res = await doRequest(token);
    return res.data.reply;
  } catch (err) {
    // Token expired → refresh sekali
    if (err.response?.status === 401) {
      console.log("[AI] Token expired, refresh...");
      _token = null;
      token = await loginBot();
      const res = await doRequest(token);
      return res.data.reply;
    }
    throw err;
  }
}

// ── Ucapan dari Kak Taksaka (persona: taksaka) ──────────────
export async function generateUcapanTaksaka(panggilan, jabatan, generasi) {
  const prompt =
    `Hari ini ulang tahun ${panggilan}, ${jabatan} Pagaska generasi ${generasi}. ` +
    `Buat ucapan ulang tahun yang hangat, semangat, dan personal khas Pagaska. ` +
    `Sertakan 1 quote motivasi singkat yang unik dan tidak klise. ` +
    `Maksimal 3 kalimat. Bahasa santai dan friendly. ` +
    `Langsung tulis ucapannya saja, tanpa pembuka seperti "Berikut ucapannya:".`;
  return callAI(prompt, "taksaka");
}

// ── Ucapan dari Dokter Taksaka (persona: dokter) ────────────
export async function generateUcapanDokter(panggilan, jabatan, generasi) {
  const prompt =
    `Hari ini ulang tahun ${panggilan}, ${jabatan} Pagaska generasi ${generasi}. ` +
    `Buat ucapan ulang tahun yang hangat, menyentuh, dan penuh empati. ` +
    `Sertakan 1 kalimat inspiratif tentang tumbuh dan berkembang jadi versi terbaik diri sendiri. ` +
    `Maksimal 3 kalimat. Bahasa lembut. ` +
    `Langsung tulis ucapannya saja, tanpa pembuka.`;
  return callAI(prompt, "dokter");
}
/*
 * Widget Asisten PSB — satu file, membuat tampilannya sendiri.
 * Pasang di halaman mana pun:
 *   <link rel="stylesheet" href="widget.css">
 *   <script src="widget.js"></script>
 * Jika backend berada di domain lain, tambahkan atribut: data-api="https://backend-kamu.onrender.com"
 */
(function () {
  const script = document.currentScript;
  const API = ((script && script.dataset.api) || (script && script.src ? new URL(script.src).origin : '') || '').replace(/\/$/, '');
  const STORE = 'psb-chat-history';
  const MAX_LEN = 500;

  let history = [];
  let busy = false;
  let started = false;

  // ---------- Markup ----------
  const root = document.createElement('div');
  root.innerHTML = `
    <button id="psb-bubble" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="psb-window">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>
      ✦ &nbsp; Tanya PSB
    </button>
    <section id="psb-window" role="dialog" aria-label="Asisten PSB" hidden>
      <div id="psb-head">
        <div class="psb-head-brand"><img src="assets/logo-sekolah.jpg" alt=""><div><strong>Asisten PSB</strong><small>SMK Muhammadiyah 1 Kota Sukabumi · ● Online</small></div></div>
        <div class="psb-tools">
          <button type="button" id="psb-reset" title="Mulai percakapan baru">Ulangi</button>
          <button type="button" id="psb-close" aria-label="Tutup chat">Tutup</button>
        </div>
      </div>
      <div id="psb-messages" role="log" aria-live="polite"></div>
      <div id="psb-chips"></div>
      <form id="psb-form" autocomplete="off">
        <input id="psb-input" type="text" maxlength="${MAX_LEN}" placeholder="Tulis pertanyaan..." aria-label="Pesan" />
        <button id="psb-send" type="submit">Kirim</button>
      </form>
    </section>`;
  document.body.append(...root.children);

  const $ = (id) => document.getElementById(id);
  const bubble = $('psb-bubble'), win = $('psb-window'), msgs = $('psb-messages');
  const chips = $('psb-chips'), form = $('psb-form'), input = $('psb-input'), send = $('psb-send');

  // ---------- Util ----------
  const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Markdown minimal (aman): **tebal**, daftar "- " / "* ", paragraf
  function render(text) {
    const lines = esc(text).split('\n');
    let html = '', list = false;
    const inline = (t) => t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    for (const raw of lines) {
      const li = raw.match(/^\s*[-*•]\s+(.*)$/);
      if (li) { if (!list) { html += '<ul>'; list = true; } html += `<li>${inline(li[1])}</li>`; continue; }
      if (list) { html += '</ul>'; list = false; }
      if (raw.trim()) html += `<p>${inline(raw)}</p>`;
    }
    if (list) html += '</ul>';
    return html;
  }

  function add(text, who, extra) {
    const row = document.createElement('div');
    row.className = `psb-msg ${who}${extra ? ' ' + extra : ''}`;
    const b = document.createElement('div');
    b.className = 'psb-bubble';
    if (who === 'bot') b.innerHTML = render(text); else b.textContent = text;
    row.appendChild(b);
    msgs.appendChild(row);
    msgs.scrollTop = msgs.scrollHeight;
    return row;
  }

  function typing() {
    const row = document.createElement('div');
    row.className = 'psb-msg bot';
    row.innerHTML = '<div class="psb-bubble"><span class="psb-typing" role="status" aria-label="Asisten sedang mengetik"><i></i><i></i><i></i></span></div>';
    msgs.appendChild(row);
    msgs.scrollTop = msgs.scrollHeight;
    return row;
  }

  function salam() {
    const h = new Date().getHours();
    const waktu = h < 11 ? 'pagi' : h < 15 ? 'siang' : h < 18 ? 'sore' : 'malam';
    return `Selamat ${waktu}! Saya Asisten PSB. Tanyakan seputar jurusan, syarat, jadwal, dan alur pendaftaran.`;
  }

  function save() {
    try { sessionStorage.setItem(STORE, JSON.stringify(history)); } catch (_) {}
  }

  function restore() {
    try { history = JSON.parse(sessionStorage.getItem(STORE) || '[]'); } catch (_) { history = []; }
    if (!Array.isArray(history)) history = [];
  }

  function mulai() {
    msgs.innerHTML = '';
    add(salam(), 'bot');
    history.forEach((m) => add(m.text, m.role === 'user' ? 'user' : 'bot'));
    chips.hidden = history.length > 0;
  }

  // ---------- Kirim pesan ----------
  async function kirim(text) {
    text = text.trim().slice(0, MAX_LEN);
    if (!text || busy) return;

    busy = true; send.disabled = true; chips.hidden = true;
    add(text, 'user');
    history.push({ role: 'user', text });
    input.value = '';
    const wait = typing();

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30000);

    try {
      const res = await fetch(`${API}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history }),
        signal: ctrl.signal,
      });
      const data = await res.json().catch(() => ({}));
      wait.remove();
      if (!res.ok || !data.result) {
        history.pop(); // pesan gagal tidak disimpan agar bisa dicoba lagi
        add(data.message || 'Maaf, terjadi kesalahan. Coba lagi sebentar.', 'bot', 'error');
      } else {
        add(data.result, 'bot');
        history.push({ role: 'model', text: data.result });
      }
    } catch (err) {
      wait.remove();
      history.pop();
      add(err.name === 'AbortError' ? 'Jawaban terlalu lama. Coba kirim ulang pertanyaanmu.' : 'Chatbot tidak dapat dihubungi. Periksa koneksi internet lalu coba lagi.', 'bot', 'error');
    } finally {
      clearTimeout(timer);
      busy = false; send.disabled = false; save();
      input.focus();
    }
  }

  // ---------- Buka / tutup ----------
  function open() {
    win.hidden = false;
    bubble.setAttribute('aria-expanded', 'true');
    if (!started) { started = true; mulai(); muatChips(); }
    input.focus();
  }
  function close() {
    win.hidden = true;
    bubble.setAttribute('aria-expanded', 'false');
    bubble.focus();
  }

  async function muatChips() {
    try {
      const res = await fetch(`${API}/api/sekolah`);
      const s = await res.json();
      chips.innerHTML = '';
      (s.pertanyaanCepat || []).forEach((q) => {
        const b = document.createElement('button');
        b.type = 'button'; b.textContent = q;
        b.addEventListener('click', () => kirim(q));
        chips.appendChild(b);
      });
      chips.hidden = history.length > 0;
    } catch (_) { /* chips bersifat opsional */ }
  }

  bubble.addEventListener('click', open);
  $('psb-close').addEventListener('click', close);
  $('psb-reset').addEventListener('click', () => { history = []; save(); mulai(); chips.hidden = false; input.focus(); });
  form.addEventListener('submit', (e) => { e.preventDefault(); kirim(input.value); });
  win.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  restore();
  window.PSBChat = { open, close };
})();

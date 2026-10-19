# WEB-SEKOLAH-PSB — SMK Muhammadiyah 1 Kota Sukabumi

Versi ini sengaja mengikuti struktur ZIP contoh `web-sekolah-psb`, tetapi desainnya diubah menjadi **HD monochrome**, menggunakan foto gedung dan logo yang diberikan, aksen kuning/merah, kartu jurusan, FAQ, alur PSB, dan widget AI.

## Struktur
```text
web-sekolah-psb/
├── data/
│   └── sekolah.json
├── public/
│   ├── assets/
│   │   ├── logo-sekolah.jpg
│   │   ├── background-sekolah.jpg
│   │   ├── preview-visual.png
│   │   └── jurusan/
│   │       ├── pplg.svg
│   │       ├── tjkt.svg
│   │       └── dkv.svg
│   ├── index.html
│   ├── style.css
│   ├── site.js
│   ├── widget.css
│   └── widget.js
├── index.js
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## Jalankan
```bat
npm.cmd install
copy .env.example .env
```
Isi `GEMINI_API_KEY` di `.env`, lalu:
```bat
npm.cmd start
```
Buka:
`http://localhost:3000`

## Data sekolah
Semua data yang dipakai halaman dan chatbot berasal dari `data/sekolah.json`.
Beberapa jurusan, jadwal, syarat, dan kontak pada template **belum merupakan data resmi** dan wajib diganti/diverifikasi sebelum dipublikasikan.

## Asset
Logo dan foto gedung yang diberikan sudah dimasukkan ke `public/assets/`.

Icon jurusan yang ada adalah **icon ilustratif**, bukan klaim logo resmi jurusan. Ganti file SVG jika sekolah mempunyai logo resmi tiap jurusan.

## Chatbot
Widget mempertahankan pola API dari contoh:
`POST /api/chat`
dengan body:
`{ "history": [...] }`

Data sekolah tersedia melalui:
`GET /api/sekolah`

Health check:
`GET /api/health`

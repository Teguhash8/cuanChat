# 💰 CuanChat

Aplikasi keuangan pribadi berbasis chat — catat pengeluaran secara natural seperti chat WhatsApp. Dilengkapi fitur **scan struk otomatis (OCR)** dan **voice note (speech-to-text)**.

## ✨ Fitur

- 💬 **Chat Natural Language** — Ketik "Nasi goreng 15rb pake gopay" dan transaksi otomatis tercatat
- 📷 **Scan Struk (OCR)** — Foto struk belanja, otomatis di-scan dan dijadikan transaksi
- 🎤 **Voice Note** — Rekam suara, otomatis di-transcribe dan dijadikan transaksi
- 📊 **Dashboard** — Ringkasan keuangan bulanan dengan grafik
- 💳 **Multi Wallet** — Kelola saldo Tunai, BCA, OVO, GoPay, ShopeePay
- 📁 **Kategori** — Makanan, Transportasi, Belanja, Hiburan, dll
- 💰 **Budget** — Atur anggaran per kategori dan pantau sisa budget
- 📤 **Export** — Export data transaksi
- 🔐 **Auth** — Register & Login dengan JWT

## 🛠️ Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Frontend | Next.js + React + TailwindCSS |
| Backend | Express.js (Node.js) |
| Database | SQLite (sql.js) |
| OCR | Tesseract.js (browser-side) |
| Speech-to-Text | Web Speech API (browser) |
| Auth | JWT + bcrypt |

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm

### Install & Run

```bash
# Clone repo
git clone https://github.com/Teguhash8/cuanChat.git
cd cuanChat

# Install dependencies
npm install

# Jalankan development server
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser.

### Available Scripts

| Command | Keterangan |
|---------|-----------|
| `npm run dev` | Jalankan frontend + backend (development) |
| `npm test` | Jalankan unit tests |
| `npm run build` | Build untuk production |
| `npm start` | Jalankan production build |

## 📂 Struktur Project

```
cuanChat/
├── server/                 # Backend Express.js
│   ├── index.js            # Entry point server
│   ├── db.js               # Database (SQLite) initialization
│   ├── middleware/
│   │   └── auth.js         # JWT authentication middleware
│   └── routes/
│       ├── auth.js         # Register & Login
│       ├── chat.js         # Chat parsing & transaction detection
│       ├── attachments.js  # File upload (photo & audio)
│       ├── transactions.js # CRUD transaksi
│       ├── categories.js   # Kategori pengeluaran/pemasukan
│       ├── wallets.js      # Dompet/wallet management
│       ├── budgets.js      # Budget per kategori
│       └── dashboard.js    # Dashboard stats
├── src/                    # Frontend Next.js
│   ├── app/
│   │   ├── page.js         # Dashboard
│   │   ├── chat/           # Chat page (main feature)
│   │   ├── transaksi/      # Daftar transaksi
│   │   ├── kategori/       # Kelola kategori
│   │   ├── dompet/         # Kelola dompet
│   │   ├── budget/         # Atur budget
│   │   ├── export/         # Export data
│   │   ├── login/          # Login page
│   │   └── register/       # Register page
│   └── lib/
│       └── auth.js         # Auth helper (token, authFetch)
├── tests/                  # Unit tests
│   ├── chat.test.js        # Chat parsing tests
│   ├── auth.test.js        # Auth middleware tests
│   └── privacy.test.js     # Privacy & security checks
└── .gitignore
```

## 💬 Contoh Penggunaan Chat

```
User: Nasi goreng 15rb pake gopay
Bot:  📝 Transaksi Baru
      Kategori: 🍔 Makanan & Minuman
      Nominal: Rp15.000
      Akun: 🟢 GoPay

User: Grab ke kantor 24k
Bot:  📝 Transaksi Baru
      Kategori: 🚕 Transportasi
      Nominal: Rp24.000

User: Sisa budget makan?
Bot:  💰 Budget Makanan & Minuman bulan ini:
      Anggaran: Rp1.000.000
      Terpakai: Rp600.000
      Sisa: Rp400.000

User: Cek saldo
Bot:  💳 Saldo Dompet:
      💵 Tunai: Rp500.000
      🏦 BCA: Rp2.500.000
      ...
```

## 🧪 Testing

```bash
npm test
```

Menjalankan 45 unit tests:
- **Chat Parsing** — Deteksi nominal, kategori, dompet, deskripsi
- **Auth Middleware** — Validasi JWT token
- **Privacy** — Cek .gitignore, keamanan password

## 📄 License

MIT

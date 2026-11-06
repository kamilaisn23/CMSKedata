# Environment Variables: Kedata CMS (rekonstruksi)

**Status:** Reconstructed — menunggu konfirmasi manusia  
**Versi:** 0.1 · **Tanggal:** 2026-11-06  
Nilai aktual tidak disalin. Tabel memisahkan variabel yang benar-benar dibaca kode dari yang hanya tercantum di contoh konfigurasi/dokumentasi.

## Variabel yang dibaca aplikasi

| Nama | Pembaca | Rahasia? | Tujuan/temuan |
|---|---|---:|---|
| `DATABASE_URL` | `prisma/schema.prisma` (root dan salinan) | Tidak, tetapi path/data perlu dilindungi | URL DB Prisma. Template menunjuk SQLite `file:./prisma/dev.db`; karena schema berada di folder `prisma/`, database sample yang terlacak ada di `prisma/prisma/dev.db`. Path harus diverifikasi sebelum `db push` agar tidak menimpa data yang sudah ada. |
| `NODE_ENV` | `server.ts`, `src/server/auth.ts`, `src/server/db.ts` (kedua salinan) | Tidak | Menentukan prod/dev serving, atribut cookie `Secure`, serta logging/caching Prisma. |
| `ADMIN_EMAIL` | `prisma/seed.ts` (kedua salinan) | Tidak | Email admin seed; fallback di kode jika tidak disetel. |
| `ADMIN_PASSWORD` | `prisma/seed.ts` (kedua salinan) | Ya | Password awal seed; ada fallback di kode. Script seed mencetak kredensial admin dan API key seed ke stdout — log seed harus diperlakukan rahasia. |
| `ADMIN_NAME` | `prisma/seed.ts` (kedua salinan) | Tidak | Nama admin seed; fallback di kode. |
| `DISABLE_HMR` | `vite.config.ts` root | Tidak | Mengatur HMR/watch di kondisi khusus. Tidak ditemukan di `vite.config.ts` salinan pada pemeriksaan yang dilakukan. |
| `KEDATA_API_KEY` | `src/views/ApiExplorerView.tsx`; contoh Next.js/PHP | Ya | API key untuk playground/integrasi. Contoh Next.js juga menyediakan fallback demo; jangan dipakai di deployment nyata. |
| `KEDATA_CMS_URL` | `examples/nextjs/page.tsx` | URL internal, bukan secret | Base URL API untuk contoh Next.js; ada fallback localhost. |
| `KEDATA_WEBHOOK_SECRET` | `examples/nextjs/api/revalidate/route.ts` | Ya | Verifikasi webhook pada contoh Next.js; kode contoh juga mempunyai fallback statis, yang tidak aman untuk produksi. |
| `VITE_KEDATA_API_KEY` | `examples/vue-nuxt/useKedataCms.ts` | Ya | API key contoh Vue/Nuxt. Prefix `VITE_` biasanya mengekspos nilainya ke bundle browser; jangan menaruh kunci rahasia di frontend publik. |

## Tercantum di `.env.example` tetapi tidak ditemukan pembaca runtime yang eksplisit

| Nama | Status bukti | Catatan |
|---|---|---|
| `GEMINI_API_KEY` | Unknown / template saja | `.env.example` menyebut AI Studio/Gemini, tetapi pencarian source tidak menemukan pembacaan eksplisit. Apakah fitur AI aktif belum diverifikasi. |
| `APP_URL` | Template saja | Disebut untuk URL Cloud Run/OAuth, tetapi tidak ditemukan pembaca di kode CMS yang diperiksa. |
| `SESSION_SECRET` | Template saja | Tidak dibaca di `auth.ts`; sesi dibuat dengan token acak dan disimpan di DB. Keberadaan di template tidak membuktikan proteksi kriptografis menggunakannya. |
| `PORT` | Template saja | Tidak dipakai server; `server.ts` menggunakan port 3000 konstan dan bind `0.0.0.0`. Mengubah `PORT` tidak mengubah listener saat ini. |

## File konfigurasi dan keamanan

- Ada `.env.example` di root dan di `kedata-cms/`. Tidak ditemukan `.env` di kedua lokasi pada checkout saat diperiksa.
- `.gitignore` mengabaikan `.env*` kecuali `.env.example`.
- Template memuat nilai placeholder/default untuk kredensial/session; jangan menyalin nilai contoh ke production. Hasil seed mencetak password dan generated API keys, jadi redaksi log sangat penting.
- Dua database SQLite sample terlacak. Isi bisnis/PII tidak disertakan dalam dokumen; anggap sensitif sampai ditinjau.
- File `cookies.txt` juga terlacak; kontennya belum diperiksa. Pastikan file itu fixture aman, bukan sesi/cookie aktif, sebelum berbagi repository.
- Contoh integrasi tidak menggunakan satu konfigurasi bersama. Pastikan URL dan API key per contoh disediakan lewat environment yang aman.

## Tidak diketahui

Belum ada bukti tentang environment produksi, secret manager, rotasi kredensial, konfigurasi CORS deployment, atau environment variable untuk logging/monitoring. Semua variabel di atas adalah inventory source, bukan rekomendasi deployment.

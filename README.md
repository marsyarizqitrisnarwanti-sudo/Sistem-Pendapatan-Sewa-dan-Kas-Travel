# Shabila Trans - Sistem Akuntansi

Aplikasi sederhana untuk mencatat pendapatan sewa, DP, kas, biaya perjalanan, komisi driver, dan biaya bulanan pada usaha shuttle bus travel.

## Struktur

- `frontend/` - HTML, CSS, dan JavaScript dashboard.
- `backend/schema.sql` - ERD tiga entitas dan skema Supabase/Postgres.
- `backend/app.js` - API HTTP Node.js tanpa dependensi eksternal.

## Menjalankan

1. Jalankan seluruh isi `backend/schema.sql` di SQL Editor Supabase.
2. Buka `frontend/index.html` langsung di browser. Frontend sudah menggunakan Supabase REST secara langsung, sehingga tidak perlu menginstal Node.js, menjalankan server, atau mengisi environment variable.
3. Dari menu `Perjalanan sewa`, tambahkan pelanggan terlebih dahulu, kemudian isi perjalanan dan simpan.

Pada form perjalanan tersedia titik keberangkatan, titik turun, tanggal perjalanan, pilihan jam 06:00-21:00, dan kursi 1A sampai 4D. Jika tabel sudah pernah dibuat sebelumnya, jalankan ulang file SQL agar perintah migrasi kolom baru ikut diterapkan.

Frontend menggunakan endpoint Supabase REST dan publishable key. `backend/app.js` tetap tersedia sebagai opsi API lokal, tetapi tidak diperlukan untuk menjalankan frontend. Untuk produksi, tambahkan autentikasi Supabase dan ganti policy anon pada SQL.

## Catatan model bisnis

- Satu baris `perjalanan_sewa` mewakili satu perjalanan.
- Komisi driver adalah tarif tetap per perjalanan.
- Bensin dicatat dari pengisian aktual.
- Bensin, tol, dan parkir dapat dibayar driver lalu dibukukan sebagai penggantian.
- DP otomatis membuat transaksi pemasukan di `kas`.
- Biaya rutin seperti servis, pajak, cicilan, dan gaji dicatat manual di `kas` dengan kategori `biaya_bulanan`.

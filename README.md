# Welcome to Tani Apps 👋

Aplikasi mobile untuk manajemen pertanian berbasis **Expo** (React Native).

## Clone Database

1. ke Dashboard Supabase

2. Menu Authentication -> Sign In/Providers

3. Disable Confirm Email

4. Run as Administrator Powershell

5. Download PGSQL menggunakan Powershell

6) Download berkas untuk restore

Unduh file berikut:

- [schema_public.dump](https://github.com/Ferrr1/Tani/blob/master/dump/schema_public.dump?raw=1)
- [toc.list](https://github.com/Ferrr1/Tani/blob/master/dump/toc.list?raw=1)
- [auth_users.dump](https://github.com/Ferrr1/Tani/blob/master/dump/auth_users.dump?raw=1)
- [auth_toc.list](https://github.com/Ferrr1/Tani/blob/master/dump/auth_toc.list?raw=1)

7. Konfigurasi URL Supabase yang terletak pada connection string pada navbar dashboard supabase (Button Connect).

8. Tuliskan seperti ini pada powershell

9. ```bash
   $env:DB_URL = 'postgresql://postgres:IniAdalahPasswordDB%40%2C.@db.URLDB.supabase.co:5432/postgres'
   ```

10. Lakukan Restore menggunakan command ini | Note Pastikan penempatan file directory sesuai dengan powershell

```bash
	pg_restore -L .\toc.list --section=pre-data --no-owner --no-privileges `
  -d "$env:DB_URL" schema_public.dump
```

```bash
	pg_restore -L .\toc.list --section=post-data --no-owner --no-privileges `
  -d "$env:DB_URL" schema_public.dump
```

```bash
	pg_restore -L .\auth_toc.triggers.list --no-owner --no-privileges `
  -d "$env:DB_URL" .\auth_users.dump
```

10. Ke Menu Edge Function -> Deploy new via Editor
    !! Pastikan Nama Function Sesuai !!
    Download disini:

- [admin-update-user](https://github.com/Ferrr1/Tani/blob/master/lib/functions/admin-update-user?raw=1)
- [verify-mother-name](https://github.com/Ferrr1/Tani/blob/master/lib/functions/verify-mother-name?raw=1)
  a. admin-update-user -> paste kode yang ada pada file admin-update-user
  b. verify-mother-name -> paste kode yang ada pada file verify-mother-name

12. Paste kode sql ini ke editor supabase

```bash
    create extension if not exists unaccent with schema extensions;
```

## Get started

1. **Konfigurasikan Environment Variables** (lihat contoh di `.env.example`)

   Tambahkan nilai berikut ke file `.env` di root proyek:

   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start Aplikasi**
   ```bash
   npx expo start
   ```

Setelah perintah di atas berjalan, pilih target untuk membuka aplikasi:

Development build

Android emulator

iOS simulator

Expo Go
— sandbox ringan untuk mencoba aplikasi Expo

Catatan: Anda juga bisa membuka aplikasi di perangkat fisik menggunakan Expo Go yang sudah terpasang.

## Tutorial Build

1. Install dependencies eas-cli

   ```bash
   npm install -g eas-cli
   ```

2. Login ke akun Expo

   ```bash
   npx eas login
   ```

3. Build Aplikasi

   ```bash
   npx eas build --platform android
   ```

## Unit Testing

Proyek ini dilengkapi dengan suite pengujian unit untuk memastikan keakuratan logika perhitungan dan integrasi layanan.

### 1. Cara Menjalankan Tes

Untuk menjalankan semua pengujian unit:

```bash
npm test
```

Untuk menjalankan tes pada berkas spesifik:
```bash
npx jest utils/__tests__/number.test.ts
```

### 2. Deskripsi Pengujian

Daftar suite pengujian yang tersedia:

#### Utilitas (Utils)
*   **[`number.test.ts`](file:///Users/ferisetya/Project/Mobile/Tani/utils/__tests__/number.test.ts)**: Memverifikasi fungsi normalisasi angka, konversi string ke angka (format Indonesia/US), dan pemformatan ribuan.
*   **[`expense-calculator.test.ts`](file:///Users/ferisetya/Project/Mobile/Tani/utils/__tests__/expense-calculator.test.ts)**: Menguji logika perhitungan pengeluaran, termasuk biaya bibit, tenaga kerja, alat, serta perhitungan biaya prorata.
*   **[`report-calculator.test.ts`](file:///Users/ferisetya/Project/Mobile/Tani/utils/__tests__/report-calculator.test.ts)**: Memastikan kalkulasi laporan tahunan akurat, menangani faktor skala luas lahan (*land factor*), dan perhitungan rasio R/C.
*   **[`chart-calculator.test.ts`](file:///Users/ferisetya/Project/Mobile/Tani/utils/__tests__/chart-calculator.test.ts)**: Menguji transformasi data pengeluaran untuk visualisasi diagram lingkaran (pie chart) dan perhitungan total pengeluaran.

#### Layanan (Services)
*   **[`authService.test.ts`](file:///Users/ferisetya/Project/Mobile/Tani/services/__tests__/authService.test.ts)**: Menguji logika pemulihan sesi (*session restoration*) dan interaksi dengan Supabase Auth menggunakan *mocking*.
*   **[`profileService.test.ts`](file:///Users/ferisetya/Project/Mobile/Tani/services/__tests__/profileService.test.ts)**: Memverifikasi fungsi pengambilan dan pembaruan profil pengguna (GET/PATCH) dengan simulasi respons API.
*   **[`expenseService.test.ts`](file:///Users/ferisetya/Project/Mobile/Tani/services/__tests__/expenseService.test.ts)**: Memverifikasi manajemen pengeluaran (list, create, detail) termasuk panggilan RPC untuk operasi atomik di database.
*   **[`seasonService.test.ts`](file:///Users/ferisetya/Project/Mobile/Tani/services/__tests__/seasonService.test.ts)**: Menguji pengelolaan musim tanam (list, create, status aktif) dan validasi kepemilikan data.
*   **[`receiptService.test.ts`](file:///Users/ferisetya/Project/Mobile/Tani/services/__tests__/receiptService.test.ts)**: Menguji pencatatan kuitansi/penerimaan hasil panen dengan validasi kepemilikan musim tanam.
*   **[`adminUserService.test.ts`](file:///Users/ferisetya/Project/Mobile/Tani/services/__tests__/adminUserService.test.ts)**: Memastikan manajemen akun operator (pendaftaran via Edge Function) dan update profil di Supabase.
*   **[`superAdminService.test.ts`](file:///Users/ferisetya/Project/Mobile/Tani/services/__tests__/superAdminService.test.ts)**: Menguji fungsi manajemen superadmin, termasuk pembuatan operator baru dan pencegahan duplikasi superadmin.
*   **[`informationService.test.ts`](file:///Users/ferisetya/Project/Mobile/Tani/services/__tests__/informationService.test.ts)**: Memverifikasi CRUD konten edukasi/informasi yang hanya dapat dilakukan oleh admin/operator.
*   **[`weatherService.test.ts`](file:///Users/ferisetya/Project/Mobile/Tani/services/__tests__/weatherService.test.ts)**: Melakukan pengujian integrasi API cuaca (Open Meteo) dengan simulasi respons sukses dan gagal.
*   **[`openWhatsApp.test.ts`](file:///Users/ferisetya/Project/Mobile/Tani/services/__tests__/openWhatsApp.test.ts)**: Menguji utilitas pembukaan WhatsApp dengan fallback ke URL web jika aplikasi tidak terpasang.

### 3. Lingkungan Pengujian

Pengujian berjalan di lingkungan **Node.js** menggunakan **Jest**. Semua dependensi asli (seperti Supabase dan AsyncStorage) telah disimulasikan menggunakan sistem *mocking* global pada [**`jest-setup.ts`**](file:///Users/ferisetya/Project/Mobile/Tani/jest-setup.ts).

---

Terima Kasih :)

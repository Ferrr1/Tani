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
$env:DB_URL = 'postgresql://postgres:IniAdalahPasswordDB%40%2C.@db.URLDB.supabase.co:5432/postgres'

9. Lakukan Restore menggunakan command ini | Note Pastikan penempatan file directory sesuai dengan powershell
	1. pg_restore -L .\toc.list --section=pre-data --no-owner --no-privileges `
  -d "$env:DB_URL" schema_public.dump

  2. pg_restore -L .\toc.list --section=post-data --no-owner --no-privileges `
  -d "$env:DB_URL" schema_public.dump

  3. pg_restore -L .\auth_toc.triggers.list --no-owner --no-privileges `
  -d "$env:DB_URL" .\auth_users.dump

10. Ke Menu Edge Function -> Deploy new via Editor
 !! Pastikan Nama Function Sesuai !!
Download disini:
- [admin-update-user](https://github.com/Ferrr1/Tani/blob/master/lib/functions/admin-update-user?raw=1)
- [verify-mother-name](https://github.com/Ferrr1/Tani/blob/master/lib/functions/verify-mother-name?raw=1)
 a. admin-update-user -> paste kode yang ada pada file admin-update-user
 b. verify-mother-name -> paste kode yang ada pada file verify-mother-name

12. Paste kode sql ini ke editor supabase
```
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


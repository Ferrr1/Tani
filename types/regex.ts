// Mengizinkan huruf/angka dan karakter umum di local-part,
// domain label tidak boleh diawali/diakhiri '-' dan ada TLD ≥ 2 huruf.
export const EMAIL_REGEX =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

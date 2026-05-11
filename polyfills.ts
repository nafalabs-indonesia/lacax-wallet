// polyfills.ts
import { Buffer } from "buffer";
import * as Crypto from "expo-crypto";

// 1. Polyfill Buffer
global.Buffer = global.Buffer || Buffer;

// 2. Polyfill crypto.getRandomValues yang AMAN
if (typeof global.crypto === "undefined" || !global.crypto.getRandomValues) {
  // Buat objek crypto jika belum ada
  if (typeof global.crypto === "undefined") {
    (global as any).crypto = {};
  }

  // Override getRandomValues dengan implementasi native dari expo-crypto
  (global as any).crypto.getRandomValues = <T extends ArrayBufferView | null>(
    array: T,
  ): T => {
    if (array === null) {
      throw new TypeError("The provided array is null");
    }

    // Gunakan expo-crypto untuk mendapatkan byte acak yang aman
    const randomBytes = Crypto.getRandomBytes(array.byteLength);

    // Salin byte ke dalam array yang diberikan
    const view = new Uint8Array(randomBytes);
    const target = new Uint8Array(
      array.buffer,
      array.byteOffset,
      array.byteLength,
    );
    target.set(view);

    return array;
  };

  console.log("✅ Secure Crypto Polyfill Loaded (using expo-crypto)");
} else {
  console.log("✅ Native Crypto API already available");
}

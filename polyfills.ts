import { Buffer } from "buffer";
import * as Crypto from "expo-crypto";

global.Buffer = global.Buffer || Buffer;

if (typeof global.crypto === "undefined" || !global.crypto.getRandomValues) {
  if (typeof global.crypto === "undefined") {
    (global as any).crypto = {};
  }

  (global as any).crypto.getRandomValues = <T extends ArrayBufferView | null>(
    array: T,
  ): T => {
    if (array === null) {
      throw new TypeError("The provided array is null");
    }

    const randomBytes = Crypto.getRandomBytes(array.byteLength);

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

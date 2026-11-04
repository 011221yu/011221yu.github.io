const FORMAT = "love-os-encrypted-backup";
const ITERATIONS = 600000;
const context = new TextEncoder().encode(FORMAT + ":1");

function cryptoApi() {
  if (!globalThis.crypto?.subtle) throw new Error("当前浏览器无法加密备份，请使用 HTTPS 网页或新版 Safari。");
  return globalThis.crypto;
}
function encode(bytes) {
  let text = "";
  for (let i = 0; i < bytes.length; i += 8192) text += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(text);
}
function decode(value) {
  if (typeof value !== "string" || !value.length || value.length % 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) throw new Error("加密备份格式无效。");
  return Uint8Array.from(atob(value), c => c.charCodeAt(0));
}
async function keyFor(password, salt, usage) {
  if (typeof password !== "string" || !password || password.length > 256) throw new Error("请输入备份密码。");
  const api = cryptoApi();
  const material = await api.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  return api.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERATIONS }, material,
    { name: "AES-GCM", length: 256 }, false, [usage]);
}
export function isEncryptedBackup(source) {
  try { return JSON.parse(source)?.format === FORMAT; } catch { return false; }
}
export async function encryptBackup(source, password) {
  if (typeof source !== "string") throw new TypeError("备份内容无效。");
  if (typeof password !== "string" || password.length < 12 || password.length > 256 || !password.trim()) throw new Error("备份密码需要 12–256 个字符，建议使用好记的长口令。");
  const api = cryptoApi(), salt = api.getRandomValues(new Uint8Array(16)), iv = api.getRandomValues(new Uint8Array(12));
  const key = await keyFor(password, salt, "encrypt");
  const encrypted = await api.subtle.encrypt({ name: "AES-GCM", iv, additionalData: context, tagLength: 128 }, key, new TextEncoder().encode(source));
  return JSON.stringify({ format: FORMAT, version: 1, cipher: "AES-256-GCM", kdf: "PBKDF2-SHA256", iterations: ITERATIONS,
    salt: encode(salt), iv: encode(iv), data: encode(new Uint8Array(encrypted)) });
}
export async function decryptBackup(source, password) {
  let envelope;
  try { envelope = JSON.parse(source); } catch { throw new Error("加密备份格式无效。"); }
  if (envelope?.format !== FORMAT || envelope.version !== 1 || envelope.cipher !== "AES-256-GCM" ||
    envelope.kdf !== "PBKDF2-SHA256" || envelope.iterations !== ITERATIONS) throw new Error("不支持这个加密备份版本。");
  const salt = decode(envelope.salt), iv = decode(envelope.iv), data = decode(envelope.data);
  if (salt.length !== 16 || iv.length !== 12 || data.length < 16) throw new Error("加密备份格式无效。");
  const key = await keyFor(password, salt, "decrypt");
  try {
    const plain = await cryptoApi().subtle.decrypt({ name: "AES-GCM", iv, additionalData: context, tagLength: 128 }, key, data);
    return new TextDecoder("utf-8", { fatal: true }).decode(plain);
  } catch { throw new Error("密码不正确，或备份文件已损坏。原记录没有改动。"); }
}

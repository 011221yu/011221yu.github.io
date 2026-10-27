import { recordKinds } from "./domain.js?v=8";

export const LEGACY_STORAGE_KEY = "love-os.records.v1";
export const MAX_PHOTO_BYTES = 20 * 1024 * 1024;
export const BACKUP_FORMAT = "love-os-backup";
export const BACKUP_VERSION = 2;

const DATABASE_NAME = "love-os";
const DATABASE_VERSION = 1;
const STORE_NAME = "records";
let databasePromise;

export async function readRecords() {
  const database = await openDatabase();
  const records = await runRequest(database, "readonly", (store) => store.getAll());
  if (records.length > 0) return sortRecords(records);

  const legacyRecords = readLegacyRecords();
  if (legacyRecords.length === 0) return [];

  await runTransaction(database, "readwrite", (store) => {
    for (const record of legacyRecords) store.put(record);
  });
  globalThis.localStorage?.removeItem(LEGACY_STORAGE_KEY);
  return sortRecords(legacyRecords);
}

export async function addRecord(record) {
  const database = await openDatabase();
  await runTransaction(database, "readwrite", (store) => store.put(record));
  return readRecords();
}

export async function removeRecord(id) {
  const database = await openDatabase();
  await runTransaction(database, "readwrite", (store) => store.delete(id));
  return readRecords();
}

export async function createBackup(records, exportedAt = new Date().toISOString()) {
  return JSON.stringify({
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt,
    records: await Promise.all(records.map(serializeRecord)),
  });
}

export async function restoreBackup(source) {
  const imported = await parseBackup(source);
  const database = await openDatabase();
  const current = await runRequest(database, "readonly", (store) => store.getAll());
  const merged = mergeRecords(current, imported);
  await runTransaction(database, "readwrite", (store) => {
    for (const record of merged) store.put(record);
  });
  return { records: sortRecords(merged), importedCount: imported.length };
}

export async function parseBackup(source) {
  let backup;
  try {
    backup = JSON.parse(source);
  } catch {
    throw new Error("备份文件不是有效的 Love OS 文件。");
  }
  if (backup?.format !== BACKUP_FORMAT || ![1, BACKUP_VERSION].includes(backup.version) || !Array.isArray(backup.records)) {
    throw new Error("备份文件版本不受支持。");
  }
  if (backup.records.length > 10000) throw new Error("备份文件包含过多记录。");
  return Promise.all(backup.records.map(deserializeRecord));
}

export function mergeRecords(current, imported) {
  const merged = new Map(current.map((record) => [record.id, record]));
  for (const record of imported) {
    const existing = merged.get(record.id);
    if (!existing || record.updatedAt >= existing.updatedAt) merged.set(record.id, record);
  }
  return [...merged.values()];
}

export function sortRecords(records) {
  return [...records].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function validatePhotoFile(file) {
  const typeLooksRight = file.type?.startsWith("image/");
  const nameLooksRight = /\.(gif|heic|heif|jpe?g|png|webp)$/i.test(file.name ?? "");
  if (!typeLooksRight && !nameLooksRight) throw new TypeError("请选择图片文件。");
  if (file.size > MAX_PHOTO_BYTES) throw new RangeError("单张照片不能超过 20 MB。");
  return file;
}

export function readLegacyRecords(storage = globalThis.localStorage) {
  const raw = storage?.getItem(LEGACY_STORAGE_KEY);
  if (raw === null || raw === undefined) return [];

  let records;
  try {
    records = JSON.parse(raw);
  } catch {
    throw new Error("本机已有记录无法读取。为避免覆盖原数据，Love OS 已暂停保存。");
  }
  if (!Array.isArray(records)) {
    throw new Error("本机记录格式异常。为避免覆盖原数据，Love OS 已暂停保存。");
  }
  return records;
}

async function serializeRecord(record) {
  const payload = { ...record.payload };
  if (payload.photo instanceof Blob) payload.photo = await serializePhoto(payload.photo);
  if (Array.isArray(payload.photos)) {
    payload.photos = await Promise.all(payload.photos.map(serializePhoto));
  }
  return { ...record, payload };
}

async function serializePhoto(photo) {
  if (!(photo instanceof Blob)) throw new Error("照片无法读取，备份未导出。请保留本机记录。");
  const bytes = new Uint8Array(await photo.arrayBuffer());
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 32768) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
  }
  return {
    backupType: "photo",
    name: photo.name || "photo",
    mimeType: photo.type || "",
    data: btoa(binary),
  };
}

function deserializePhoto(photo) {
  if (
    photo?.backupType !== "photo" || typeof photo.data !== "string" ||
    typeof photo.name !== "string" || typeof photo.mimeType !== "string"
  ) {
    throw new Error("备份文件中的照片格式异常。");
  }
  if (photo.data.length > Math.ceil(MAX_PHOTO_BYTES / 3) * 4 + 4) {
    throw new Error("备份文件中的照片超过 20 MB。");
  }
  let bytes;
  try {
    const binary = atob(photo.data);
    bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    throw new Error("备份文件中的照片无法读取。");
  }
  validatePhotoFile({ name: photo.name, type: photo.mimeType, size: bytes.length });
  return typeof File === "function"
    ? new File([bytes], photo.name, { type: photo.mimeType })
    : new Blob([bytes], { type: photo.mimeType });
}

async function deserializeRecord(record) {
  if (
    !record || typeof record !== "object" || Array.isArray(record) ||
    typeof record.id !== "string" || !record.id || !recordKinds.includes(record.kind) ||
    typeof record.createdAt !== "string" || typeof record.updatedAt !== "string" ||
    Number.isNaN(Date.parse(record.createdAt)) || Number.isNaN(Date.parse(record.updatedAt)) ||
    !record.payload || typeof record.payload !== "object" || Array.isArray(record.payload)
  ) {
    throw new Error("备份文件中包含格式异常的记录。");
  }

  const payload = { ...record.payload };
  if (payload.photo !== undefined) {
    payload.photo = deserializePhoto(payload.photo);
  }
  if (payload.photos !== undefined) {
    if (!Array.isArray(payload.photos)) throw new Error("备份文件中的照片列表格式异常。");
    payload.photos = payload.photos.map(deserializePhoto);
  }

  return {
    id: record.id,
    kind: record.kind,
    ownerId: "local-user",
    schemaVersion: 1,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    deletedAt: null,
    payload,
  };
}

function openDatabase(indexedDB = globalThis.indexedDB) {
  if (!indexedDB) throw new Error("当前浏览器不支持本机照片存储，请改用新版 Safari、Chrome 或 Edge。");
  if (databasePromise) return databasePromise;

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return databasePromise;
}

function runRequest(database, mode, action) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const request = action(transaction.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function runTransaction(database, mode, action) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    action(transaction.objectStore(STORE_NAME));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export const recordKinds = Object.freeze([
  "timeline",
  "daily",
  "preference",
  "date",
  "anniversary",
  "memory",
]);

export const modules = Object.freeze([
  { kind: "timeline", icon: "↗", title: "恋爱时间轴", description: "收藏第一次与重要片段" },
  { kind: "daily", icon: "☀", title: "每日生活", description: "三餐、照片、心情和小事" },
  { kind: "preference", icon: "♡", title: "她的偏好", description: "认真记住喜欢与在意" },
  { kind: "date", icon: "⌖", title: "约会清单", description: "想去的地方与完成的约定" },
  { kind: "anniversary", icon: "◇", title: "纪念日", description: "重要日期与温柔提醒" },
  { kind: "memory", icon: "✦", title: "回忆总结", description: "在本机把一段时光整理成文" },
]);

export function createRecord(kind, payload, options = {}) {
  if (!recordKinds.includes(kind)) {
    throw new TypeError(`Unknown record kind: ${kind}`);
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new TypeError("payload must be an object");
  }

  const now = options.now ?? new Date().toISOString();
  const id = options.id ?? crypto.randomUUID();

  return {
    id,
    kind,
    ownerId: "local-user",
    schemaVersion: 1,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    payload: structuredClone(payload),
  };
}

export function updateRecord(record, payload, updatedAt = new Date().toISOString()) {
  return { ...record, updatedAt, payload: structuredClone(payload) };
}

export function getRecordPhotos(payload) {
  return Array.isArray(payload.photos) ? payload.photos : payload.photo ? [payload.photo] : [];
}

export function matchesRecordSearch(record, query) {
  const normalized = query.trim().toLocaleLowerCase("zh-CN");
  if (!normalized) return true;
  const searchable = Object.values(record.payload)
    .filter((value) => ["string", "number", "boolean"].includes(typeof value))
    .join(" ")
    .toLocaleLowerCase("zh-CN");
  return searchable.includes(normalized);
}

export function daysUntilAnniversary(dateValue, today = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return null;
  const [, month, day] = dateValue.split("-").map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  let targetUtc = Date.UTC(today.getFullYear(), month - 1, day);
  if (targetUtc < todayUtc) targetUtc = Date.UTC(today.getFullYear() + 1, month - 1, day);
  return Math.round((targetUtc - todayUtc) / 86400000);
}

export function createMemorySummary(records, { dateFrom = "", dateTo = "" } = {}) {
  if (dateFrom && dateTo && dateFrom > dateTo) throw new RangeError("开始日期不能晚于结束日期。");
  const sourceRecords = records.filter((record) => {
    if (record.kind === "memory") return false;
    const date = record.payload.date || record.payload.plannedDate || record.createdAt.slice(0, 10);
    return (!dateFrom || date >= dateFrom) && (!dateTo || date <= dateTo);
  });
  if (sourceRecords.length === 0) throw new RangeError("这个时间范围内还没有可总结的记录。");

  const labels = { timeline: "重要时刻", daily: "日常", preference: "偏好", date: "约会", anniversary: "纪念日" };
  const counts = new Map();
  const moods = new Map();
  let photoCount = 0;
  let completedDates = 0;
  for (const record of sourceRecords) {
    counts.set(record.kind, (counts.get(record.kind) || 0) + 1);
    if (record.payload.mood) moods.set(record.payload.mood, (moods.get(record.payload.mood) || 0) + 1);
    if (getRecordPhotos(record.payload).length) photoCount += 1;
    if (record.kind === "date" && record.payload.status === "已完成") completedDates += 1;
  }

  const breakdown = [...counts].map(([kind, count]) => `${labels[kind]} ${count} 条`).join("、");
  const sentences = [`这段时间，你一共留下了 ${sourceRecords.length} 条记录：${breakdown}。`];
  if (moods.size) {
    const [mood] = [...moods].sort((left, right) => right[1] - left[1])[0];
    sentences.push(`记录里最常出现的心情是“${mood}”。`);
  }
  if (completedDates) sentences.push(`你们完成了 ${completedDates} 次约会。`);
  if (photoCount) sentences.push(`其中有 ${photoCount} 条记录留有照片。`);

  const range = dateFrom || dateTo ? `${dateFrom || "最早记录"} 至 ${dateTo || "现在"}` : "全部时光";
  return { title: `回忆总结 · ${range}`, summary: sentences.join(""), sourceCount: sourceRecords.length };
}

export function buildDashboard(records, today = new Date()) {
  const todayKey = localDateKey(today);
  const monthPrefix = todayKey.slice(0, 7);
  const sourceRecords = records.filter((record) => record.kind !== "memory");
  const recordDate = (record) => {
    const value = record.payload.date || record.payload.plannedDate || record.createdAt.slice(0, 10);
    return typeof value === "string" ? value : "";
  };
  const relationshipDates = sourceRecords
    .filter((record) => record.kind === "anniversary" && record.payload.category === "恋爱纪念" && record.payload.date)
    .map(recordDate)
    .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= todayKey)
    .sort();
  if (relationshipDates.length === 0) {
    relationshipDates.push(...sourceRecords
      .filter((record) => record.kind === "timeline" && /^\d{4}-\d{2}-\d{2}$/.test(record.payload.date) && record.payload.date <= todayKey)
      .map(recordDate)
      .sort());
  }

  const startDate = relationshipDates[0] || null;
  const daysTogether = startDate
    ? Math.floor((Date.parse(`${todayKey}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86400000) + 1
    : null;
  const anniversaries = sourceRecords
    .filter((record) => record.kind === "anniversary")
    .map((record) => ({ title: record.payload.title, days: daysUntilAnniversary(record.payload.date, today) }))
    .filter((item) => item.days !== null)
    .sort((left, right) => left.days - right.days);

  return {
    daysTogether,
    startDate,
    monthRecords: sourceRecords.filter((record) => recordDate(record).startsWith(monthPrefix)).length,
    pendingDates: sourceRecords.filter((record) => record.kind === "date" && record.payload.status !== "已完成").length,
    nextAnniversary: anniversaries[0] || null,
  };
}

function localDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

import {
  buildDashboard,
  createMemorySummary,
  createRecord,
  daysUntilAnniversary,
  matchesRecordSearch,
  modules,
  updateRecord,
} from "./domain.js";
import {
  addRecord,
  createBackup,
  readRecords,
  removeRecord,
  restoreBackup,
  validatePhotoFile,
} from "./storage.js";

const grid = document.querySelector("#module-grid");
const workspace = document.querySelector("#workspace");
const form = document.querySelector("#record-form");
const formTitle = document.querySelector("#form-title");
const formDescription = document.querySelector("#form-description");
const formFields = document.querySelector("#form-fields");
const statusMessage = document.querySelector("#status-message");
const recordList = document.querySelector("#record-list");
const recordCount = document.querySelector("#record-count");
const exportBackupButton = document.querySelector("#export-backup");
const importBackupInput = document.querySelector("#import-backup");
const backupStatus = document.querySelector("#backup-status");
const cancelEditButton = document.querySelector("#cancel-edit");
const recordSearch = document.querySelector("#record-search");
const daysTogether = document.querySelector("#days-together");
const daysTogetherNote = document.querySelector("#days-together-note");
const monthRecords = document.querySelector("#month-records");
const pendingDates = document.querySelector("#pending-dates");
const nextAnniversary = document.querySelector("#next-anniversary");
const nextAnniversaryNote = document.querySelector("#next-anniversary-note");

const formDefinitions = Object.freeze({
  timeline: {
    title: "记一段重要时刻",
    description: "适合第一次、纪念片段和想长期记住的故事。",
    fields: [
      { name: "date", label: "日期", type: "date", required: true },
      { name: "title", label: "发生了什么", type: "text", required: true, placeholder: "例如：第一次一起打羽毛球" },
      { name: "location", label: "地点", type: "text", placeholder: "例如：华农校园" },
      { name: "mood", label: "当时的心情", type: "text", placeholder: "例如：紧张又开心" },
      { name: "note", label: "想记住的细节", type: "textarea", placeholder: "那天有哪些小事让你印象很深？" },
      { name: "photo", label: "照片", type: "file" },
    ],
  },
  daily: {
    title: "记录今天的生活",
    description: "不用写成长篇日记，几件小事就够了。",
    fields: [
      { name: "date", label: "日期", type: "date", required: true },
      { name: "breakfast", label: "早餐", type: "text", placeholder: "吃了什么，和谁一起" },
      { name: "lunch", label: "午餐", type: "text", placeholder: "今天中午的小记忆" },
      { name: "dinner", label: "晚餐", type: "text", placeholder: "晚饭或夜宵" },
      { name: "mood", label: "今天的心情", type: "select", required: true, options: ["开心", "温暖", "平静", "想念", "疲惫", "难过"] },
      { name: "moment", label: "今天最想记住的小事", type: "textarea", placeholder: "例如：她实验结束很累，但还是陪我聊了很久。" },
      { name: "keywords", label: "关键词", type: "text", placeholder: "例如：陪伴、晚风、拥抱" },
      { name: "photo", label: "照片", type: "file" },
    ],
  },
  preference: {
    title: "认真记住她的偏好",
    description: "记录她明确表达过的喜欢、习惯和在意。",
    fields: [
      { name: "category", label: "分类", type: "select", required: true, options: ["食物", "饮品", "礼物", "地点", "习惯", "在意的事"] },
      { name: "item", label: "她喜欢或在意什么", type: "text", required: true, placeholder: "例如：喜欢有仪式感的惊喜" },
      { name: "note", label: "补充细节", type: "textarea", placeholder: "她什么时候说的？有哪些要避免的误解？" },
      { name: "photo", label: "参考照片", type: "file" },
    ],
  },
  date: {
    title: "安排一次约会",
    description: "把想去的地方、约定和已经完成的约会放在一起。",
    fields: [
      { name: "status", label: "状态", type: "select", required: true, options: ["想去", "计划中", "已完成"] },
      { name: "title", label: "约会主题", type: "text", required: true, placeholder: "例如：一起去海边看日落" },
      { name: "plannedDate", label: "计划日期", type: "date" },
      { name: "location", label: "地点", type: "text", placeholder: "例如：深圳湾公园" },
      { name: "note", label: "想做的事", type: "textarea", placeholder: "路线、餐厅或想一起完成的小事" },
      { name: "photo", label: "参考照片", type: "file" },
    ],
  },
  anniversary: {
    title: "记住一个纪念日",
    description: "保存重要日期，随时看看距离下一次周年还有多久。",
    fields: [
      { name: "date", label: "日期", type: "date", required: true },
      { name: "title", label: "纪念日名称", type: "text", required: true, placeholder: "例如：我们确认关系的日子" },
      { name: "category", label: "类型", type: "select", required: true, options: ["恋爱纪念", "生日", "第一次", "节日", "其他"] },
      { name: "note", label: "想记住的细节", type: "textarea", placeholder: "那天发生了什么，下一次想怎样度过？" },
      { name: "photo", label: "纪念照片", type: "file" },
    ],
  },
  memory: {
    title: "整理一段回忆",
    description: "不联网、不调用 GPT，只根据本机已有记录生成回顾。日期留空表示总结全部时光。",
    submitLabel: "生成并保存回忆",
    fields: [
      { name: "dateFrom", label: "开始日期", type: "date" },
      { name: "dateTo", label: "结束日期", type: "date" },
      { name: "summary", label: "这段回忆", type: "generated" },
    ],
  },
});

const moduleNames = Object.fromEntries(modules.map((module) => [module.kind, module.title]));
let selectedKind = "daily";
let records = [];
let storageReady = true;
let editingId = null;

try {
  records = await readRecords();
} catch (error) {
  storageReady = false;
  showStatus(error.message, true);
}

for (const module of modules) {
  const card = document.createElement("button");
  const enabled = Boolean(formDefinitions[module.kind]);
  card.type = "button";
  card.className = "module-card";
  card.dataset.kind = module.kind;
  card.disabled = !enabled;
  card.setAttribute("aria-pressed", String(module.kind === selectedKind));

  const icon = document.createElement("span");
  icon.className = "module-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = module.icon;

  const title = document.createElement("h3");
  title.textContent = module.title;

  const description = document.createElement("p");
  description.textContent = module.description;

  const status = document.createElement("span");
  status.className = "status";
  status.textContent = enabled ? (module.kind === "memory" ? "可以生成" : "可以记录") : "后续加入";

  card.append(icon, title, description, status);
  if (enabled) card.addEventListener("click", () => selectModule(module.kind));
  grid.append(card);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!storageReady) return;

  const definition = formDefinitions[selectedKind];
  const values = new FormData(form);

  try {
    const payload = {};
    for (const field of definition.fields) {
      if (field.type === "generated") continue;
      if (field.type === "file") {
        const file = values.get(field.name);
        if (file?.size) payload[field.name] = validatePhotoFile(file);
      } else {
        payload[field.name] = String(values.get(field.name) ?? "").trim();
      }
    }
    const existing = editingId ? records.find((record) => record.id === editingId) : null;
    const finalPayload = existing ? { ...existing.payload, ...payload } : payload;
    if (selectedKind === "memory") Object.assign(finalPayload, createMemorySummary(records, finalPayload));
    records = await addRecord(existing ? updateRecord(existing, finalPayload) : createRecord(selectedKind, finalPayload));
    const wasEditing = Boolean(existing);
    editingId = null;
    form.reset();
    renderForm();
    renderRecords();
    showStatus(wasEditing ? "修改已保存到这台设备。" : selectedKind === "memory" ? "回忆已生成并保存到这台设备。" : "已安全保存到这台设备。", false);
  } catch (error) {
    showStatus(error.message || "保存失败。浏览器空间可能已满，请先不要清理或刷新页面。", true);
  }
});

cancelEditButton.addEventListener("click", () => {
  editingId = null;
  form.reset();
  renderForm();
  showStatus("已取消编辑。", false);
});

recordSearch.addEventListener("input", renderRecords);

exportBackupButton.addEventListener("click", async () => {
  try {
    const contents = await createBackup(records);
    const url = URL.createObjectURL(new Blob([contents], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `love-os-backup-${todayString()}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    showBackupStatus(`已导出 ${records.length} 条记录，请把文件保存到“文件”或其他安全位置。`, false);
  } catch {
    showBackupStatus("备份导出失败，请稍后再试。", true);
  }
});

importBackupInput.addEventListener("change", async () => {
  const file = importBackupInput.files?.[0];
  if (!file) return;
  try {
    const restored = await restoreBackup(await file.text());
    records = restored.records;
    renderRecords();
    showBackupStatus(`已恢复 ${restored.importedCount} 条备份记录，原有记录已保留。`, false);
  } catch (error) {
    showBackupStatus(error.message || "备份恢复失败。", true);
  } finally {
    importBackupInput.value = "";
  }
});

selectModule(selectedKind);

function selectModule(kind) {
  selectedKind = kind;
  editingId = null;
  recordSearch.value = "";
  for (const card of grid.querySelectorAll(".module-card")) {
    card.setAttribute("aria-pressed", String(card.dataset.kind === kind));
  }
  renderForm();
  renderRecords();
  if (storageReady) showStatus("", false);
}

function renderForm() {
  const definition = formDefinitions[selectedKind];
  formTitle.textContent = definition.title;
  formDescription.textContent = definition.description;
  formFields.replaceChildren();

  for (const field of definition.fields) {
    if (field.type === "generated") continue;
    const wrapper = document.createElement("label");
    wrapper.className = ["textarea", "file"].includes(field.type) ? "field field-wide" : "field";
    wrapper.append(field.label, createControl(field));
    if (field.type === "file") {
      const hint = document.createElement("small");
      hint.textContent = editingId ? "不重新选择将保留原照片；新照片不超过 20 MB。" : "可从相册选择或直接拍照，单张不超过 20 MB。";
      wrapper.append(hint);
    }
    formFields.append(wrapper);
  }

  const submitButton = form.querySelector("button[type='submit']");
  submitButton.textContent = editingId ? "保存修改" : definition.submitLabel || "保存到本机";
  submitButton.disabled = !storageReady;
  cancelEditButton.hidden = !editingId;
  setDefaultDate();
}

function createControl(field) {
  let control;
  if (field.type === "textarea") {
    control = document.createElement("textarea");
    control.rows = 4;
  } else if (field.type === "select") {
    control = document.createElement("select");
    const prompt = document.createElement("option");
    prompt.value = "";
    prompt.textContent = "请选择";
    control.append(prompt);
    for (const value of field.options) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      control.append(option);
    }
  } else {
    control = document.createElement("input");
    control.type = field.type;
    if (field.type === "file") control.accept = "image/*,.heic,.heif";
  }

  control.name = field.name;
  control.required = Boolean(field.required);
  if (field.placeholder) control.placeholder = field.placeholder;
  return control;
}

function setDefaultDate() {
  const dateInput = form.elements.namedItem("date");
  if (!dateInput) return;
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  dateInput.value = `${year}-${month}-${day}`;
}

function todayString() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

function renderRecords() {
  renderDashboard();
  const moduleRecords = records.filter((record) => record.kind === selectedKind);
  const query = recordSearch.value;
  const visibleRecords = moduleRecords.filter((record) => matchesRecordSearch(record, query));
  recordCount.textContent = query.trim() ? `${visibleRecords.length}/${moduleRecords.length} 条` : `${moduleRecords.length} 条`;
  recordList.replaceChildren();

  if (visibleRecords.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = query.trim() ? "没有找到匹配的记录。" : `还没有${moduleNames[selectedKind]}记录，从左边写下第一条吧。`;
    recordList.append(empty);
    return;
  }

  for (const record of visibleRecords) recordList.append(createRecordCard(record));
}

function renderDashboard() {
  const dashboard = buildDashboard(records);
  daysTogether.textContent = dashboard.daysTogether ?? "—";
  daysTogetherNote.textContent = dashboard.startDate ? `从 ${formatDate(dashboard.startDate)} 开始` : "先记录恋爱纪念日或时间轴";
  monthRecords.textContent = dashboard.monthRecords;
  pendingDates.textContent = dashboard.pendingDates;
  nextAnniversary.textContent = dashboard.nextAnniversary
    ? dashboard.nextAnniversary.days === 0 ? "今天" : `${dashboard.nextAnniversary.days} 天`
    : "—";
  nextAnniversaryNote.textContent = dashboard.nextAnniversary?.title || "还没有纪念日";
}

function createRecordCard(record) {
  const definition = formDefinitions[record.kind];
  const card = document.createElement("article");
  card.className = "record-card";

  const top = document.createElement("div");
  top.className = "record-card-top";
  const heading = document.createElement("div");
  const kind = document.createElement("span");
  kind.className = "record-kind";
  kind.textContent = moduleNames[record.kind];
  const title = document.createElement("h3");
  title.textContent = getRecordTitle(record);
  heading.append(kind, title);
  if (record.kind === "anniversary") {
    const days = daysUntilAnniversary(record.payload.date);
    if (days !== null) {
      const countdown = document.createElement("p");
      countdown.className = "anniversary-countdown";
      countdown.textContent = days === 0 ? "就是今天" : `距离下次周年还有 ${days} 天`;
      heading.append(countdown);
    }
  }

  const actions = document.createElement("div");
  actions.className = "record-actions";
  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "edit-button";
  editButton.textContent = "编辑";
  editButton.setAttribute("aria-label", `编辑记录：${title.textContent}`);
  editButton.addEventListener("click", () => startEditing(record));

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "delete-button";
  removeButton.textContent = "删除";
  removeButton.setAttribute("aria-label", `删除记录：${title.textContent}`);
  removeButton.addEventListener("click", async () => {
    if (!window.confirm("确定删除这条记录吗？删除后无法恢复。")) return;
    try {
      records = await removeRecord(record.id);
      if (editingId === record.id) {
        editingId = null;
        renderForm();
      }
      renderRecords();
      showStatus("记录已删除。", false);
    } catch {
      showStatus("删除失败，请稍后再试。", true);
    }
  });
  actions.append(editButton, removeButton);
  top.append(heading, actions);

  const photo = record.payload.photo;
  let photoElement;
  if (photo instanceof Blob) {
    photoElement = document.createElement("img");
    photoElement.className = "record-photo";
    photoElement.alt = `${title.textContent}的记录照片`;
    const photoUrl = URL.createObjectURL(photo);
    photoElement.src = photoUrl;
    photoElement.addEventListener("load", () => URL.revokeObjectURL(photoUrl), { once: true });
  }

  const details = document.createElement("dl");
  for (const field of definition.fields) {
    const value = record.payload[field.name];
    if (!value || field.type === "file" || ["title", "item"].includes(field.name)) continue;
    const term = document.createElement("dt");
    term.textContent = field.label;
    const detail = document.createElement("dd");
    detail.textContent = field.type === "date" ? formatDate(value) : value;
    details.append(term, detail);
  }

  const savedAt = document.createElement("p");
  savedAt.className = "saved-at";
  const wasUpdated = record.updatedAt !== record.createdAt;
  savedAt.textContent = `${wasUpdated ? "更新" : "保存"}于 ${new Date(wasUpdated ? record.updatedAt : record.createdAt).toLocaleString("zh-CN", { dateStyle: "medium", timeStyle: "short" })}`;
  card.append(top);
  if (photoElement) card.append(photoElement);
  card.append(details, savedAt);
  return card;
}

function startEditing(record) {
  editingId = record.id;
  renderForm();
  for (const field of formDefinitions[record.kind].fields) {
    if (["file", "generated"].includes(field.type)) continue;
    const control = form.elements.namedItem(field.name);
    if (control) control.value = record.payload[field.name] || "";
  }
  formTitle.textContent = `编辑${moduleNames[record.kind]}`;
  workspace.scrollIntoView({ behavior: "smooth", block: "start" });
}

function getRecordTitle(record) {
  if (["timeline", "date", "anniversary", "memory"].includes(record.kind)) return record.payload.title;
  if (record.kind === "preference") return record.payload.item;
  return `${formatDate(record.payload.date)} · ${record.payload.mood}`;
}

function formatDate(value) {
  const [year, month, day] = value.split("-");
  return `${year}年${Number(month)}月${Number(day)}日`;
}

function showStatus(message, isError) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle("is-error", isError);
  workspace.classList.toggle("storage-error", !storageReady);
}

function showBackupStatus(message, isError) {
  backupStatus.textContent = message;
  backupStatus.classList.toggle("is-error", isError);
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}


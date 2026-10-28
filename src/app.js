import {
  buildDashboard,
  createMemorySummary,
  createRecord,
  daysUntilAnniversary,
  getRecordPhotos,
  getRecordKind,
  validatePeriodDates,
  matchesRecordSearch,
  modules,
  updateRecord,
} from "./domain.js?v=10";
import {
  addRecord,
  createBackup,
  readRecords,
  removeRecord,
  restoreBackup,
  validatePhotoFile,
} from "./storage.js?v=10";

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
const editor = document.querySelector("#editor");
const kindPicker = document.querySelector("#entry-kind");
const moreMenu = document.querySelector("#more-menu");
const photoViewer = document.querySelector("#photo-viewer");
const viewerImage = document.querySelector("#viewer-image");
const viewerError = document.querySelector("#viewer-error");
const toast = document.querySelector("#toast");

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
    title: "记下一件特别事项",
    description: "喜欢什么、什么时候不舒服、怎样陪伴她，都值得记住。日期与补充内容可以留空。",
    fields: [
      { name: "category", label: "分类", type: "select", required: true, options: ["身体不适", "情绪与压力", "饮食禁忌", "食物", "饮品", "礼物", "地点", "习惯", "在意的事", "其他"] },
      { name: "item", label: "需要记住什么", type: "text", required: true, placeholder: "例如：今天胃不舒服 / 忙的时候想安静一会儿" },
      { name: "date", label: "发生日期（选填）", type: "date" },
      { name: "timing", label: "时间或情境（选填）", type: "text", placeholder: "例如：今天晚饭后 / 连续熬夜时 / 生理期第一天" },
      { name: "note", label: "具体情况与细节", type: "textarea", placeholder: "发生了什么、持续多久，或她提到的喜好和需要留意的事。" },
      { name: "care", label: "怎么照顾与陪伴", type: "textarea", placeholder: "她希望你做什么？哪些做法有帮助，哪些需要避免？" },
      { name: "photo", label: "参考照片", type: "file" },
    ],
  },
  period: {
    title: "记录这一次生理期",
    description: "每次记一条，结束后再补结束日期。按开始月份整理，也可以补记过去的月份。",
    fields: [
      { name: "date", label: "开始日期", type: "date", required: true },
      { name: "endDate", label: "结束日期（选填）", type: "date" },
      { name: "item", label: "一句话备注（选填）", type: "text", placeholder: "例如：这次想多休息" },
      { name: "symptoms", label: "身体感受", type: "textarea", placeholder: "记录她说的不舒服、发生时间和持续情况。" },
      { name: "note", label: "需要注意的事", type: "textarea", placeholder: "这次要留意什么？她提到哪些习惯或安排需要调整？" },
      { name: "care", label: "照顾与陪伴", type: "textarea", placeholder: "她希望怎样被照顾？记下有帮助的做法。" },
      { name: "timing", label: "其他时间与情境（选填）", type: "text", placeholder: "补充具体时间，或保留以前记录的情境" },
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
let selectedKind = "all";
let formKind = "daily";
let records = [];
let storageReady = true;
let editingId = null;
let selectedPhotos = [];
let previewUrls = [];
let recordPhotoUrls = [];
let saving = false;
let draftDirty = false;
let albumView = false;
let viewerPhotos = [];
let viewerIndex = 0;
let viewerUrl;
let toastTimer;

try {
  records = await readRecords();
} catch (error) {
  storageReady = false;
  showStatus(error.message, true);
}

const icons = { all: "book", timeline: "book", daily: "sun", preference: "heart", period: "calendar", date: "pin", anniversary: "calendar", memory: "spark" };
for (const module of [{ kind: "all", title: "全部手账" }, ...modules]) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "module-card";
  card.dataset.kind = module.kind;
  card.setAttribute("aria-pressed", String(module.kind === selectedKind));
  const title = document.createElement("span");
  title.className = "module-label";
  title.textContent = module.title;
  const count = document.createElement("span");
  count.className = "module-count";
  card.append(createIcon(icons[module.kind]), title, count);
  card.addEventListener("click", () => selectModule(module.kind));
  grid.append(card);
}

document.querySelector("#today-label").textContent = new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" });
document.querySelector("#new-entry").addEventListener("click", () => openEditor());
document.querySelector("#mobile-compose").addEventListener("click", () => openEditor());
document.querySelector("#close-editor").addEventListener("click", closeEditor);
editor.addEventListener("cancel", (event) => { event.preventDefault(); closeEditor(); });
form.addEventListener("input", () => { draftDirty = true; });
kindPicker.addEventListener("change", () => {
  if (draftDirty && !window.confirm("切换记录类型会清空当前未保存内容，继续吗？")) {
    kindPicker.value = formKind;
    return;
  }
  formKind = kindPicker.value;
  draftDirty = false;
  renderForm();
  showStatus("", false);
});
document.querySelectorAll("[data-browse]").forEach((button) => button.addEventListener("click", () => {
  moreMenu.close();
  selectModule(button.dataset.browse);
  workspace.scrollIntoView({ behavior: "smooth", block: "start" });
}));
document.querySelectorAll("[data-create]").forEach((button) => button.addEventListener("click", () => openEditor(button.dataset.create)));
document.querySelector("#open-more").addEventListener("click", () => openDialog(moreMenu));
document.querySelector("[data-close-more]").addEventListener("click", () => moreMenu.close());
document.querySelectorAll("[data-backup]").forEach((button) => button.addEventListener("click", () => {
  moreMenu.close();
  const panel = document.querySelector("#backup-panel");
  panel.open = true;
  panel.scrollIntoView({ behavior: "smooth", block: "center" });
  panel.querySelector("summary").focus();
}));
for (const dialog of [editor, moreMenu, photoViewer]) {
  dialog.addEventListener("close", () => document.body.classList.toggle("modal-open", Boolean(document.querySelector("dialog[open]"))));
}
document.querySelector("#view-journal").addEventListener("click", () => { albumView = false; renderRecords(); });
document.querySelector("#view-album").addEventListener("click", () => { albumView = true; renderRecords(); });
document.querySelector("#close-photo-viewer").addEventListener("click", () => photoViewer.close());
document.querySelector("#previous-photo").addEventListener("click", () => changePhoto(-1));
document.querySelector("#next-photo").addEventListener("click", () => changePhoto(1));
photoViewer.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    event.preventDefault();
    changePhoto(event.key === "ArrowLeft" ? -1 : 1);
  }
});
photoViewer.addEventListener("close", () => {
  if (viewerUrl) URL.revokeObjectURL(viewerUrl);
  viewerUrl = undefined;
  viewerImage.removeAttribute("src");
  viewerPhotos = [];
});
viewerImage.addEventListener("error", () => { viewerImage.hidden = true; viewerError.hidden = false; });

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!storageReady || saving) return;

  const definition = formDefinitions[formKind];
  const values = new FormData(form);
  saving = true;
  form.inert = true;
  kindPicker.disabled = true;
  form.querySelector("button[type='submit']").disabled = true;

  try {
    const payload = {};
    for (const field of definition.fields) {
      if (field.type === "generated") continue;
      if (field.type === "file") {
        payload.photos = selectedPhotos.map(validatePhotoFile);
      } else {
        payload[field.name] = String(values.get(field.name) ?? "").trim();
      }
    }
    const existing = editingId ? records.find((record) => record.id === editingId) : null;
    const finalPayload = existing ? { ...existing.payload, ...payload } : payload;
    if (definition.fields.some((field) => field.type === "file")) delete finalPayload.photo;
    if (formKind === "memory") Object.assign(finalPayload, createMemorySummary(records, finalPayload));
    if (formKind === "period") validatePeriodDates(finalPayload);
    records = await addRecord(existing ? updateRecord({ ...existing, kind: formKind }, finalPayload) : createRecord(formKind, finalPayload));
    const wasEditing = Boolean(existing);
    const savedKind = formKind;
    editingId = null;
    draftDirty = false;
    editor.close();
    form.reset();
    renderForm();
    if (selectedKind !== "all" && selectedKind !== savedKind) selectModule(savedKind);
    else renderRecords();
    showStatus(wasEditing ? "修改已保存，原记录已更新。" : savedKind === "memory" ? "这一段回忆，整理好了。" : "这一刻，已经好好收藏。", false);
  } catch (error) {
    showStatus(error.message || "保存失败。浏览器空间可能已满，请先不要清理或刷新页面。", true);
  } finally {
    saving = false;
    form.inert = false;
    kindPicker.disabled = Boolean(editingId);
    form.querySelector("button[type='submit']").disabled = !storageReady;
  }
});

cancelEditButton.addEventListener("click", closeEditor);

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
  document.querySelectorAll(".bottom-nav [data-browse]").forEach((button) => {
    if (button.dataset.browse === kind) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  document.querySelector("#records-title").textContent = kind === "all" ? "留住的小事" : moduleNames[kind];
  renderRecords();
  if (storageReady) showStatus("", false);
}

function renderForm() {
  for (const url of previewUrls) URL.revokeObjectURL(url);
  previewUrls = [];
  const existing = editingId ? records.find((record) => record.id === editingId) : null;
  selectedPhotos = existing ? [...getRecordPhotos(existing.payload)] : [];
  const definition = formDefinitions[formKind];
  kindPicker.value = formKind;
  kindPicker.disabled = Boolean(editingId);
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
      hint.textContent = "支持一次选多张，也可继续选图追加；单张不超过 20 MB。";
      wrapper.append(hint);
    }
    formFields.append(wrapper);
    if (field.type === "file") {
      const preview = document.createElement("div");
      preview.className = "field-wide photo-selection";
      formFields.append(preview);
      const control = wrapper.querySelector("input");
      control.addEventListener("change", () => {
        try {
          const added = [...control.files].map(validatePhotoFile);
          selectedPhotos.push(...added);
          if (added.length) draftDirty = true;
          renderPhotoSelection(preview);
          if (added.length) showStatus(`已选 ${selectedPhotos.length} 张照片，点击保存后生效。`, false);
        } catch (error) {
          showStatus(error.message, true);
        } finally {
          control.value = "";
        }
      });
      renderPhotoSelection(preview);
    }
  }

  const submitButton = form.querySelector("button[type='submit']");
  submitButton.textContent = editingId ? "保存修改" : definition.submitLabel || "保存这一刻";
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
    if (field.type === "file") {
      control.accept = "image/*,.heic,.heif";
      control.multiple = true;
    }
  }

  control.name = field.name;
  control.required = Boolean(field.required);
  if (field.placeholder) control.placeholder = field.placeholder;
  return control;
}

function renderPhotoSelection(container) {
  for (const url of previewUrls) URL.revokeObjectURL(url);
  previewUrls = [];
  container.replaceChildren();
  if (!selectedPhotos.length) return;

  const count = document.createElement("p");
  count.className = "photo-count";
  count.textContent = `共 ${selectedPhotos.length} 张照片 · 保存后生效`;
  const gallery = document.createElement("div");
  gallery.className = "photo-gallery";
  selectedPhotos.forEach((photo, index) => {
    const item = document.createElement("div");
    const image = document.createElement("img");
    const url = URL.createObjectURL(photo);
    previewUrls.push(url);
    image.src = url;
    image.alt = `已选照片 ${index + 1}`;
    image.className = "record-photo";
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "delete-button";
    remove.textContent = `移除第 ${index + 1} 张`;
    remove.addEventListener("click", () => {
      draftDirty = true;
      selectedPhotos.splice(index, 1);
      renderPhotoSelection(container);
    });
    item.append(image, remove);
    gallery.append(item);
  });
  container.append(count, gallery);
}

function setDefaultDate() {
  if (formKind === "preference") return;
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
  for (const url of recordPhotoUrls) URL.revokeObjectURL(url);
  recordPhotoUrls = [];
  renderDashboard();
  const moduleRecords = records.filter((record) => selectedKind === "all" || getRecordKind(record) === selectedKind);
  const query = recordSearch.value;
  const visibleRecords = moduleRecords.filter((record) => matchesRecordSearch(record, query))
    .sort((left, right) => getRecordDate(right).localeCompare(getRecordDate(left)) || right.createdAt.localeCompare(left.createdAt));
  recordCount.textContent = query.trim() ? `${visibleRecords.length}/${moduleRecords.length} 条` : `${moduleRecords.length} 条`;
  recordList.classList.toggle("album-view", albumView);
  document.querySelector("#view-journal").setAttribute("aria-pressed", String(!albumView));
  document.querySelector("#view-album").setAttribute("aria-pressed", String(albumView));
  for (const button of grid.querySelectorAll(".module-card")) {
    button.querySelector(".module-count").textContent = records.filter((record) => button.dataset.kind === "all" || getRecordKind(record) === button.dataset.kind).length;
  }
  recordList.replaceChildren();
  if (selectedKind === "period" && !albumView) {
    const hint = document.createElement("p");
    hint.className = "panel-description";
    hint.textContent = "按开始月份查看，每次记录一条；结束日期可以稍后补充。旧生理期事项也收在这里，请编辑核对开始日期。";
    recordList.append(hint);
  }

  const photoRecords = visibleRecords.filter((record) => getRecordPhotos(record.payload).length);
  if (visibleRecords.length === 0 || (albumView && photoRecords.length === 0)) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    const title = document.createElement("h3");
    title.textContent = query.trim() ? "这个瞬间，还没找到" : albumView ? "等一张值得收藏的照片" : selectedKind === "period" ? "从这一次，开始记下" : "故事，从一件小事开始";
    const text = document.createElement("p");
    text.textContent = query.trim() ? "换个词试试看，或者清空搜索查看全部。" : albumView ? "编辑已有记录或记一笔，把照片也留在故事里。" : selectedKind === "period" ? "记下开始日期、身体感受和注意事项，结束后再来补一笔。" : "一顿晚饭，一次散步，一句想记住的话。简单写下就好。";
    const action = document.createElement("button");
    action.type = "button";
    action.textContent = query.trim() ? "清空搜索" : "＋ 记下这一刻";
    action.addEventListener("click", () => {
      if (query.trim()) { recordSearch.value = ""; renderRecords(); }
      else openEditor();
    });
    empty.append(createIcon(albumView ? "photo" : "book"), title, text, action);
    recordList.append(empty);
    return;
  }

  if (albumView) {
    let photoCount = 0;
    for (const record of photoRecords) {
      getRecordPhotos(record.payload).filter((photo) => photo instanceof Blob).forEach((photo, index) => {
        const item = document.createElement("article");
        item.className = "album-item";
        const caption = document.createElement("div");
        caption.className = "album-caption";
        const title = document.createElement("strong");
        title.textContent = getRecordTitle(record);
        const date = document.createElement("small");
        date.textContent = formatDate(getRecordDate(record));
        caption.append(title, date);
        item.append(createPhotoTile(record, photo, index), caption);
        recordList.append(item);
        photoCount += 1;
      });
    }
    recordCount.textContent = `${photoCount} 张照片`;
    return;
  }

  let previousDate;
  for (const record of visibleRecords) {
    const date = getRecordDate(record);
    const group = selectedKind === "period" ? date.slice(0, 7) : date;
    if (group !== previousDate) {
      const divider = document.createElement("div");
      divider.className = "date-divider";
      const day = document.createElement("strong");
      day.textContent = selectedKind === "period" ? `${Number(date.slice(5, 7))}月` : String(Number(date.slice(8, 10)));
      const month = document.createElement("span");
      month.textContent = selectedKind === "period" ? `${date.slice(0, 4)}年` : `${Number(date.slice(5, 7))}月 · ${date.slice(0, 4)}`;
      divider.append(day, month);
      recordList.append(divider);
      previousDate = group;
    }
    recordList.append(createRecordCard(record));
  }
}

function renderDashboard() {
  const dashboard = buildDashboard(records);
  daysTogether.textContent = dashboard.daysTogether ?? "—";
  daysTogetherNote.textContent = dashboard.startDate ? `从 ${formatDate(dashboard.startDate)} 开始` : "先记录恋爱纪念日或时间轴";
  monthRecords.textContent = dashboard.monthRecords;
  pendingDates.textContent = dashboard.pendingDates;
  document.querySelector("#photo-total").textContent = records.reduce((sum, record) => sum + getRecordPhotos(record.payload).length, 0);
  nextAnniversary.textContent = dashboard.nextAnniversary
    ? dashboard.nextAnniversary.days === 0 ? "今天" : `${dashboard.nextAnniversary.days} 天`
    : "—";
  nextAnniversaryNote.textContent = dashboard.nextAnniversary?.title || "还没有纪念日";
}

function createRecordCard(record) {
  const recordKind = getRecordKind(record);
  const definition = formDefinitions[recordKind];
  const card = document.createElement("article");
  card.className = "record-card";

  const top = document.createElement("div");
  top.className = "record-card-top";
  const heading = document.createElement("div");
  const kind = document.createElement("span");
  kind.className = "record-kind";
  kind.textContent = moduleNames[recordKind];
  const title = document.createElement("h3");
  title.textContent = getRecordTitle(record);
  heading.append(kind, title);
  if (recordKind === "period") {
    const dates = document.createElement("p");
    dates.className = "panel-description";
    dates.textContent = record.kind === "preference"
      ? `旧生理期事项 · ${record.payload.date ? "原记录日期：" + formatDate(record.payload.date) : "尚未填写日期"}（请编辑核对开始日）`
      : `${formatDate(record.payload.date)} 开始 · ${record.payload.endDate ? formatDate(record.payload.endDate) + " 结束" : "结束日期待补充"}`;
    heading.append(dates);
  }
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

  const photos = getRecordPhotos(record.payload);
  const gallery = document.createElement("div");
  gallery.className = "photo-gallery";
  gallery.dataset.count = String(photos.length);
  for (const [index, photo] of photos.entries()) {
    if (!(photo instanceof Blob)) continue;
    gallery.append(createPhotoTile(record, photo, index));
  }

  const details = document.createElement("dl");
  for (const field of definition.fields) {
    const value = record.payload[field.name];
    if (!value || field.type === "file" || ["title", "item", "date"].includes(field.name) || (recordKind === "period" && field.name === "endDate")) continue;
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
  if (gallery.childElementCount) card.append(gallery);
  card.append(details, savedAt);
  return card;
}

function startEditing(record) {
  editingId = record.id;
  formKind = getRecordKind(record);
  draftDirty = false;
  renderForm();
  for (const field of formDefinitions[formKind].fields) {
    if (["file", "generated"].includes(field.type)) continue;
    const control = form.elements.namedItem(field.name);
    if (control) control.value = record.payload[field.name] || "";
  }
  formTitle.textContent = `编辑${moduleNames[formKind]}`;
  if (record.kind === "preference" && formKind === "period") {
    formDescription.textContent = "这是原来的生理期事项，文字和照片都已保留。请核对开始日期，保存后作为独立生理期记录。";
  }
  showStatus("", false);
  openDialog(editor);
}

function getRecordTitle(record) {
  if (getRecordKind(record) === "period") return record.payload.item || "这一次生理期";
  if (["timeline", "date", "anniversary", "memory"].includes(record.kind)) return record.payload.title;
  if (record.kind === "preference") return record.payload.item;
  return `${record.payload.mood || "平常"}的一天`;
}

function getRecordDate(record) {
  return record.payload.date || record.payload.plannedDate || record.createdAt.slice(0, 10);
}

function createIcon(name) {
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.classList.add("icon");
  icon.setAttribute("aria-hidden", "true");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", `#icon-${name}`);
  icon.append(use);
  return icon;
}

function openDialog(dialog) {
  if (!dialog.open) dialog.showModal();
  document.body.classList.add("modal-open");
}

function openEditor(kind = selectedKind === "all" ? "daily" : selectedKind) {
  editingId = null;
  formKind = kind;
  draftDirty = false;
  renderForm();
  showStatus("", false);
  openDialog(editor);
}

function closeEditor() {
  if (saving) return;
  if (draftDirty && !window.confirm("这一笔还没有保存，确定放弃修改吗？")) return;
  editor.close();
  editingId = null;
  draftDirty = false;
  selectedPhotos = [];
  for (const url of previewUrls) URL.revokeObjectURL(url);
  previewUrls = [];
}

function createPhotoTile(record, photo, index) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "photo-tile";
  button.setAttribute("aria-label", `查看${getRecordTitle(record)}的第 ${index + 1} 张照片`);
  const image = document.createElement("img");
  image.className = "record-photo";
  image.alt = `${getRecordTitle(record)}的照片 ${index + 1}`;
  image.loading = "lazy";
  const url = URL.createObjectURL(photo);
  recordPhotoUrls.push(url);
  image.src = url;
  image.addEventListener("error", () => {
    const fallback = document.createElement("span");
    fallback.className = "photo-fallback";
    fallback.textContent = "照片已保存 · 点开查看或下载";
    button.replaceChildren(fallback);
  }, { once: true });
  button.append(image);
  button.addEventListener("click", () => {
    viewerPhotos = getRecordPhotos(record.payload);
    viewerIndex = index;
    document.querySelector("#photo-viewer-title").textContent = getRecordTitle(record);
    renderViewer();
    openDialog(photoViewer);
  });
  return button;
}

function changePhoto(step) {
  const next = viewerIndex + step;
  if (next < 0 || next >= viewerPhotos.length) return;
  viewerIndex = next;
  renderViewer();
}

function renderViewer() {
  if (viewerUrl) URL.revokeObjectURL(viewerUrl);
  const photo = viewerPhotos[viewerIndex];
  viewerUrl = URL.createObjectURL(photo);
  viewerImage.hidden = false;
  viewerError.hidden = true;
  viewerImage.src = viewerUrl;
  viewerImage.alt = `第 ${viewerIndex + 1} 张照片`;
  document.querySelector("#viewer-position").textContent = `${viewerIndex + 1} / ${viewerPhotos.length}`;
  document.querySelector("#previous-photo").disabled = viewerIndex === 0;
  document.querySelector("#next-photo").disabled = viewerIndex === viewerPhotos.length - 1;
  const download = document.querySelector("#download-photo");
  download.href = viewerUrl;
  download.download = photo.name || `love-os-photo-${viewerIndex + 1}`;
}

function formatDate(value) {
  const [year, month, day] = value.split("-");
  return `${year}年${Number(month)}月${Number(day)}日`;
}

function showStatus(message, isError) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle("is-error", isError);
  workspace.classList.toggle("storage-error", !storageReady);
  if (!editor.open && message) {
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, isError ? 15000 : 5000);
  }
}

function showBackupStatus(message, isError) {
  backupStatus.textContent = message;
  backupStatus.classList.toggle("is-error", isError);
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}

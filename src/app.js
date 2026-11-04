import {
  buildDashboard,
  createMemorySummary,
  createRecord,
  daysUntilAnniversary,
  getRecordPhotos,
  getRecordKind,
  canPublishKind,
  getRecordsForView,
  getAlbumRecords,
  validatePeriodDates,
  matchesRecordSearch,
  modules,
  updateRecord,
} from "./domain.js?v=16";
import {
  addRecord,
  readRecords,
  removeRecord,
  validatePhotoFile,
} from "./storage.js?v=16";
import { setupSync } from "./sync-ui.js?v=16";
import { setupBackup } from "./backup-ui.js?v=16";

const grid = document.querySelector("#module-grid");
const workspace = document.querySelector("#workspace");
const form = document.querySelector("#record-form");
const formTitle = document.querySelector("#form-title");
const formDescription = document.querySelector("#form-description");
const formFields = document.querySelector("#form-fields");
const statusMessage = document.querySelector("#status-message");
const recordList = document.querySelector("#record-list");
const recordCount = document.querySelector("#record-count");
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
const composeMenu = document.querySelector("#compose-menu");
const morePanel = document.querySelector("#more-panel");
const recordDetail = document.querySelector("#record-detail");
const visibilitySelect = document.querySelector("#record-visibility");
const photoViewer = document.querySelector("#photo-viewer");
const viewerImage = document.querySelector("#viewer-image");
const viewerError = document.querySelector("#viewer-error");
const toast = document.querySelector("#toast");

const formDefinitions = Object.freeze({
  feeling: {
    title: "写一封心情来信",
    description: "开心可以分享，低落也可以慢慢说。今天的心情，想说给谁听？",
    fields: [
      { name: "date", label: "日期", type: "date", required: true },
      { name: "mood", label: "此刻心情（选填）", type: "select", options: ["开心", "平静", "想念", "有点低落", "委屈", "焦虑", "疲惫", "说不清"] },
      { name: "moment", label: "想说的话（选填）", type: "textarea", placeholder: "可以写发生了什么，也可以只说：今天有点累，想被抱抱。" },
      { name: "care", label: "今天希望怎样被关心？（选填）", type: "select", options: ["陪我聊聊", "给我一个拥抱", "帮我带份饭", "让我安静休息", "一起散散步", "暂时不用做什么", "其他（写在下面）"] },
      { name: "careNote", label: "具体想要什么（选填）", type: "textarea", placeholder: "例如：今晚想聊十分钟，先听我说说就好。也可以留空。" },
      { name: "photo", label: "此刻的照片（选填）", type: "file" },
    ],
  },
  photo: {
    title: "收藏一组照片",
    description: "一次选多张照片，给这组画面写几句说明。",
    fields: [
      { name: "date", label: "日期", type: "date", required: true },
      { name: "title", label: "这组照片的名字", type: "text", required: true, placeholder: "例如：周末的校园散步" },
      { name: "location", label: "地点", type: "text" },
      { name: "note", label: "照片里的故事", type: "textarea" },
      { name: "photo", label: "照片（至少一张）", type: "file" },
    ],
  },
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
let selectedKind = "home";
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
let albumScope = "private";
let feedKind = "all";
let viewerPhotos = [];
let viewerRecord = null;
let viewerIndex = 0;
let viewerUrl;
let toastTimer;
let cloudMode = false;
let cloudUserId = null;
let draftId = crypto.randomUUID();
let viewerGeneration = 0;
let accountGeneration = 0;
let heldCloudDraft = null;

try {
  records = await readRecords();
} catch (error) {
  storageReady = false;
  showStatus(error.message, true);
}

const icons = { home: "home", feed: "heart", album: "photo", more: "more", all: "book", timeline: "book", daily: "sun", feeling: "mail", preference: "book", period: "calendar", photo: "photo", date: "pin", anniversary: "calendar", memory: "spark" };
const regularModules = modules.filter(module => canPublishKind(module.kind));
for (const module of [{ kind: "home", title: "首页" }, { kind: "feed", title: "共同动态" }, { kind: "album", title: "相册" }, { group: "我的手账" }, ...regularModules, { group: "悄悄关心 · 仅自己" }, ...modules.filter(module => !canPublishKind(module.kind)), { kind: "more", title: "更多与账号" }]) {
  if (module.group) {
    const caption = document.createElement("p"); caption.className = "nav-caption"; caption.textContent = module.group; grid.append(caption); continue;
  }
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

for (const module of regularModules) {
  const notebook = document.createElement("button"); notebook.type = "button"; notebook.dataset.browse = module.kind;
  const label = document.createElement("span"); label.textContent = module.title;
  notebook.append(createIcon(icons[module.kind]), label, createIcon("arrow"));
  document.querySelector("#my-notebooks").append(notebook);
  const create = document.createElement("button"); create.type = "button"; create.dataset.create = module.kind;
  const text = document.createElement("span"); const name = document.createElement("strong"), description = document.createElement("small");
  name.textContent = module.title; description.textContent = module.description; text.append(name, description);
  create.append(createIcon(icons[module.kind]), text, createIcon("arrow")); document.querySelector("#compose-kinds").append(create);
}

document.querySelector("#today-label").textContent = new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" });
const backup = setupBackup({
  getRecords: () => records, isCloud: () => cloudMode, getCloud: () => sync.client(),
  onRestore: next => { records = next; renderRecords(); },
});
const sync = setupSync({
  getLocal: readRecords,
  isBusy: () => editor.open || photoViewer.open || recordDetail.open || composeMenu.open || saving || backup.isBusy(),
  onAccountLock: uid => {
    accountGeneration++;
    if (cloudMode && editor.open && draftDirty) {
      heldCloudDraft = {
        uid: uid || cloudUserId, kind: formKind, id: draftId,
        existing: editingId ? records.find(record => record.id === editingId) : null,
        values: [...new FormData(form)].filter(([, value]) => typeof value === "string"),
        photos: [...selectedPhotos],
      };
    }
    backup.lock();
    for (const dialog of [editor, photoViewer, recordDetail, composeMenu]) if (dialog.open) dialog.close();
    document.querySelector("#record-detail-body").replaceChildren();
    form.reset(); formFields.replaceChildren(); selectedPhotos = []; editingId = null; draftDirty = false;
    for (const url of [...previewUrls, ...recordPhotoUrls]) URL.revokeObjectURL(url);
    previewUrls = []; recordPhotoUrls = [];
    statusMessage.textContent = ""; toast.hidden = true;
  },
  onRecords: async (next, active, uid) => {
    if (cloudMode !== active) albumScope = active ? "shared" : "private";
    records = next; cloudMode = active; cloudUserId = uid;
    editingId = null; selectedPhotos = []; renderRecords();
    document.querySelector("footer small").textContent = active ? "Love OS · 两人空间，只有彼此能看见共享记录" : "Love OS · 记录留在本机，请定期备份";
    if (active && heldCloudDraft?.uid === uid) {
      const draft = heldCloudDraft; heldCloudDraft = null;
      if (draft.existing) {
        records = records.filter(record => record.id !== draft.existing.id);
        records.push(draft.existing);
      }
      editingId = draft.existing?.id || (records.some(record => record.id === draft.id) ? draft.id : null);
      formKind = draft.kind; draftId = draft.id; renderForm();
      for (const [name, value] of draft.values) { const control = form.elements.namedItem(name); if (control && control.type !== "file") control.value = value; }
      updateSaveAction();
      selectedPhotos = draft.photos;
      const preview = formFields.querySelector(".photo-selection"); if (preview) renderPhotoSelection(preview);
      draftDirty = true; openDialog(editor); showStatus("上次未保存的草稿已恢复，请核对后保存。", false);
    }
  },
});
document.querySelector("#new-entry").addEventListener("click", () => openDialog(composeMenu));
document.querySelector("#mobile-compose").addEventListener("click", () => openDialog(composeMenu));
document.querySelector("#home-connect").addEventListener("click", () => sync.open());
document.querySelectorAll("[data-account-open]").forEach(button => button.addEventListener("click", () => sync.open()));
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
  composeMenu.close();
  selectModule(button.dataset.browse);
  document.querySelector(".page-top").scrollIntoView({ behavior: "smooth", block: "start" });
}));
document.querySelectorAll("[data-create]").forEach((button) => button.addEventListener("click", () => { composeMenu.close(); openEditor(button.dataset.create); }));
document.querySelector("[data-close-compose]").addEventListener("click", () => composeMenu.close());
document.querySelectorAll("[data-backup]").forEach((button) => button.addEventListener("click", () => {
  composeMenu.close(); selectModule("more");
  const panel = document.querySelector("#backup-panel");
  panel.open = true;
  panel.scrollIntoView({ behavior: "smooth", block: "center" });
  panel.querySelector("summary").focus();
}));
for (const dialog of [editor, composeMenu, photoViewer, recordDetail]) {
  dialog.addEventListener("close", () => document.body.classList.toggle("modal-open", Boolean(document.querySelector("dialog[open]"))));
}
document.querySelector("#view-journal").addEventListener("click", () => { albumView = false; renderRecords(); });
document.querySelector("#view-album").addEventListener("click", () => { albumView = true; renderRecords(); });
visibilitySelect.addEventListener("change", () => { draftDirty = true; updateSaveAction(); });
document.querySelectorAll("[data-feed-kind]").forEach(button => button.addEventListener("click", () => { feedKind = button.dataset.feedKind; renderRecords(); }));
document.querySelectorAll("[data-album-scope]").forEach(button => button.addEventListener("click", () => {
  if (button.dataset.albumScope === "shared" && !cloudMode) { void sync.open(); return; }
  albumScope = button.dataset.albumScope; renderRecords();
}));
document.querySelector("#close-record-detail").addEventListener("click", () => recordDetail.close());
recordDetail.addEventListener("close", () => document.querySelector("#record-detail-body").replaceChildren());
document.querySelector("#open-photo-record").addEventListener("click", () => {
  const record = viewerRecord; photoViewer.close();
  if (record) { document.querySelector("#record-detail-body").replaceChildren(createRecordCard(record)); openDialog(recordDetail); }
});
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
  viewerGeneration++;
  if (viewerUrl) URL.revokeObjectURL(viewerUrl);
  viewerUrl = undefined;
  viewerImage.removeAttribute("src");
  viewerPhotos = [];
  viewerRecord = null;
});
viewerImage.addEventListener("error", () => { viewerImage.hidden = true; viewerError.hidden = false; });

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!storageReady || saving) return;

  const definition = formDefinitions[formKind];
  const values = new FormData(form);
  const operation = accountGeneration;
  saving = true;
  form.inert = true;
  kindPicker.disabled = true;
  form.querySelectorAll("button[type='submit']").forEach(button => { button.disabled = true; });

  try {
    const payload = {};
    for (const field of definition.fields) {
      if (field.type === "generated") continue;
      if (field.type === "file") {
        payload.photos = selectedPhotos.map(photo => photo.cloud ? photo : validatePhotoFile(photo));
      } else {
        payload[field.name] = String(values.get(field.name) ?? "").trim();
      }
    }
    const existing = editingId ? records.find((record) => record.id === editingId) : null;
    const finalPayload = existing ? { ...existing.payload, ...payload } : payload;
    if (formKind === "feeling") finalPayload.journalType = "feeling";
    if (definition.fields.some((field) => field.type === "file")) delete finalPayload.photo;
    if (formKind === "memory") Object.assign(finalPayload, createMemorySummary(records, finalPayload));
    if (formKind === "period") validatePeriodDates(finalPayload);
    if (formKind === "photo" && !selectedPhotos.length) throw new Error("请至少选择一张照片");
    const publishing = cloudMode && canPublishKind(formKind) && visibilitySelect.value === "shared";
    const storedKind = modules.find(module => module.kind === formKind)?.recordKind || formKind;
    const record = existing ? updateRecord({ ...existing, kind: storedKind }, finalPayload) : createRecord(storedKind, finalPayload, { id: draftId });
    if (cloudMode) {
      const cloud = await sync.client();
      await cloud.save(record, publishing ? "shared" : "private", sync.progress);
      const next = await cloud.list();
      if (operation !== accountGeneration) return;
      records = next;
    } else records = await addRecord(record);
    draftId = crypto.randomUUID();
    const wasEditing = Boolean(existing);
    const savedKind = formKind;
    editingId = null;
    draftDirty = false;
    editor.close();
    form.reset();
    renderForm();
    if (publishing) selectModule("feed");
    else if (selectedKind === "feed") selectModule(savedKind);
    else if (selectedKind !== "all" && selectedKind !== savedKind) selectModule(savedKind);
    else renderRecords();
    showStatus(savedKind === "feeling" ? publishing ? "已寄到共同动态，对方打开空间后就能看到。" : "这份心情，已经好好收下。留给自己，慢慢说也可以。" : publishing ? "已发布到共同动态，你们都能看到。" : cloudMode ? "已保存给自己，只有你能看到。" : wasEditing ? "修改已保存，原记录已更新。" : savedKind === "memory" ? "这一段回忆，整理好了。" : "这一刻，已经好好收藏。", false);
  } catch (error) {
    if (operation === accountGeneration) showStatus(error.message || "保存失败。浏览器空间可能已满，请先不要清理或刷新页面。", true);
  } finally {
    saving = false;
    form.inert = false;
    kindPicker.disabled = Boolean(editingId);
    form.querySelectorAll("button[type='submit']").forEach(button => { button.disabled = !storageReady; });
  }
});

cancelEditButton.addEventListener("click", closeEditor);

recordSearch.addEventListener("input", renderRecords);

selectModule(selectedKind);

function selectModule(kind) {
  if (kind === "album" && selectedKind !== "album") albumScope = cloudMode ? "shared" : "private";
  selectedKind = kind;
  albumView = kind === "album";
  feedKind = "all";
  editingId = null;
  recordSearch.value = "";
  for (const card of grid.querySelectorAll(".module-card")) {
    card.setAttribute("aria-pressed", String(card.dataset.kind === kind));
  }
  document.querySelectorAll(".bottom-nav [data-browse]").forEach((button) => {
    const primary = ["home", "feed", "album"].includes(kind) ? kind : "more";
    if (button.dataset.browse === primary) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  document.querySelector("#records-title").textContent = kind === "all" ? "我的手账" : kind === "feed" ? "共同动态" : moduleNames[kind];
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

  const privacy = document.createElement("p");
  privacy.className = "field-wide privacy-note";
  privacy.textContent = !canPublishKind(formKind) ? "关心对方的小事，留给自己记住。这个模块仅自己可见，不支持发布。"
    : !cloudMode ? "当前保存在本机。登录并切换到账号手账后，可选择发布到共同动态。"
    : existing?.visibility === "shared" ? "这条记录已发布。选择保存给自己，会从共同动态中收回。"
    : "保存给自己，只有你能看见；主动发布后，你们都能在共同动态里看到。";
  formFields.append(privacy);
  if (formKind === "feeling") privacy.textContent = !cloudMode ? "先留在本机，只有这个浏览器能查看。切换到账号手账后，可选择寄给对方。"
    : "留给自己时只有你能看见；寄给对方会发布到共同动态。只发送这封信的内容，不会自动带上其他私密记录。寄出后也可以收回。";
  document.querySelector("#visibility-control").hidden = !cloudMode || !canPublishKind(formKind);
  visibilitySelect.value = existing?.visibility === "shared" && canPublishKind(formKind) ? "shared" : "private";
  visibilitySelect.disabled = !cloudMode || !canPublishKind(formKind);
  updateSaveAction();
  cancelEditButton.hidden = !editingId;
  setDefaultDate();
}

function updateSaveAction() {
  const existing = editingId ? records.find(record => record.id === editingId) : null;
  const shared = cloudMode && canPublishKind(formKind) && visibilitySelect.value === "shared";
  const submit = document.querySelector("#save-record");
  submit.textContent = formKind === "feeling" ? shared ? "寄给对方" : existing?.visibility === "shared" ? "收回并留给自己" : "留给自己"
    : shared ? existing?.visibility === "shared" ? "更新共同动态" : "发布到共同动态"
    : existing?.visibility === "shared" ? "收回并保存给自己"
    : editingId ? "保存修改" : formDefinitions[formKind].submitLabel || "保存给自己";
  submit.disabled = !storageReady;
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
    if (photo.cloud) setCloudPhoto(image, photo);
    else { const url = URL.createObjectURL(photo); previewUrls.push(url); image.src = url; }
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
  const isHome = selectedKind === "home";
  const isMore = selectedKind === "more";
  const isAlbum = selectedKind === "album";
  const titles = { home: "把日子，慢慢收藏。", feed: "共同动态", album: "我们的相册", more: "我的角落", all: "我的手账" };
  document.querySelector(".overview").hidden = !isHome;
  document.querySelector("#home-panel").hidden = !isHome;
  morePanel.hidden = !isMore;
  workspace.hidden = isHome || isMore;
  document.body.dataset.page = selectedKind;
  document.querySelector(".page-top h1").textContent = titles[selectedKind] || moduleNames[selectedKind];
  document.querySelector(".subtitle").textContent = isHome ? "平凡的小事，也值得记住。" : selectedKind === "feed" ? "我们愿意分享给彼此的生活。" : isAlbum ? "把画面和那天的故事，放在一起。" : isMore ? "有些故事一起分享，有些关心悄悄记住。" : selectedKind === "all" || canPublishKind(selectedKind) ? "自己的全部记录，都在这一本里。" : "认真记住，悄悄关心。这里只对自己可见。";
  document.querySelector("#feed-filters").hidden = selectedKind !== "feed";
  document.querySelector("#album-scope").hidden = !isAlbum;
  document.querySelector(".journal-toolbar .view-switch").hidden = isAlbum || selectedKind === "feed";
  document.querySelectorAll("[data-feed-kind]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.feedKind === feedKind)));
  document.querySelectorAll("[data-album-scope]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.albumScope === albumScope)));
  const viewOptions = { cloud: cloudMode, userId: cloudUserId };
  const moduleRecords = isAlbum ? getAlbumRecords(records, albumScope, viewOptions) : getRecordsForView(records, selectedKind, viewOptions);
  const query = recordSearch.value;
  const visibleRecords = moduleRecords.filter((record) => matchesRecordSearch(record, query) && (selectedKind !== "feed" || feedKind === "all" || getRecordKind(record) === feedKind))
    .sort((left, right) => selectedKind === "feed" ? right.publishedAt.localeCompare(left.publishedAt) : getRecordDate(right).localeCompare(getRecordDate(left)) || right.createdAt.localeCompare(left.createdAt));
  recordCount.textContent = query.trim() ? `${visibleRecords.length}/${moduleRecords.length} 条` : `${moduleRecords.length} 条`;
  recordList.classList.toggle("album-view", albumView);
  recordList.classList.toggle("shared-feed", selectedKind === "feed");
  document.querySelector("#records-title").textContent = titles[selectedKind] || moduleNames[selectedKind];
  document.querySelector("#view-journal").setAttribute("aria-pressed", String(!albumView));
  document.querySelector("#view-album").setAttribute("aria-pressed", String(albumView));
  for (const button of grid.querySelectorAll(".module-card")) {
    button.querySelector(".module-count").textContent = ["home", "more"].includes(button.dataset.kind) ? "" : button.dataset.kind === "album" ? getAlbumRecords(records, cloudMode ? "shared" : "private", viewOptions).reduce((n, record) => n + getRecordPhotos(record.payload).length, 0) : getRecordsForView(records, button.dataset.kind, viewOptions).length;
  }
  recordList.replaceChildren();
  if (isHome || isMore) return;
  if (selectedKind === "period" && !albumView) {
    const hint = document.createElement("p");
    hint.className = "panel-description";
    hint.textContent = "按开始月份查看，每次记录一条；结束日期可以稍后补充。旧生理期事项也收在这里，请编辑核对开始日期。";
    recordList.append(hint);
    const writeLetter = document.createElement("button");
    writeLetter.type = "button"; writeLetter.className = "secondary-button";
    writeLetter.textContent = "此刻想被关心？写封心情来信";
    writeLetter.addEventListener("click", () => openEditor("feeling"));
    recordList.append(writeLetter);
  }

  const photoRecords = visibleRecords.filter((record) => getRecordPhotos(record.payload).length);
  if (visibleRecords.length === 0 || (albumView && photoRecords.length === 0)) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    const title = document.createElement("h3");
    const filtered = query.trim() || selectedKind === "feed" && feedKind !== "all";
    title.textContent = filtered ? "这个瞬间，还没找到" : selectedKind === "feed" ? "等你们发布第一个瞬间" : albumView ? "等一张值得收藏的照片" : selectedKind === "period" ? "从这一次，开始记下" : "故事，从一件小事开始";
    const text = document.createElement("p");
    text.textContent = filtered ? "换个分类或搜索词，看看其他回忆。" : selectedKind === "feed" ? "在时间轴、照片、每日生活等记录里选择发布，这里就会留下你们的故事。" : isAlbum && albumScope === "shared" ? "主动发布的照片会出现在这里，仅自己保存的照片留在私有相册。" : albumView ? "编辑已有记录或记一笔，把照片也留在故事里。" : selectedKind === "period" ? "记下开始日期、身体感受和注意事项，结束后再来补一笔。" : "一顿晚饭，一次散步，一句想记住的话。简单写下就好。";
    const action = document.createElement("button");
    action.type = "button";
    action.textContent = filtered ? "查看全部" : selectedKind === "feed" && !cloudMode ? "登录查看共同动态" : "＋ 记下这一刻";
    action.addEventListener("click", () => {
      if (filtered) { recordSearch.value = ""; feedKind = "all"; renderRecords(); }
      else if (selectedKind === "feed" && !cloudMode) sync.open();
      else openEditor();
    });
    empty.append(createIcon(albumView ? "photo" : "book"), title, text, action);
    recordList.append(empty);
    return;
  }

  if (albumView) {
    let photoCount = 0;
    let previousMonth;
    for (const record of photoRecords) {
      const month = getRecordDate(record).slice(0, 7);
      if (month !== previousMonth) {
        const heading = document.createElement("div");
        heading.className = "album-month";
        heading.textContent = `${month.slice(0, 4)}年 ${Number(month.slice(5, 7))}月`;
        recordList.append(heading); previousMonth = month;
      }
      getRecordPhotos(record.payload).filter((photo) => photo instanceof Blob || photo.cloud).forEach((photo, index) => {
        const item = document.createElement("article");
        item.className = "album-item";
        const caption = document.createElement("div");
        caption.className = "album-caption";
        const title = document.createElement("strong");
        title.textContent = getRecordTitle(record); title.className = "visually-hidden";
        const date = document.createElement("small");
        date.textContent = `${Number(getRecordDate(record).slice(8, 10))}日`;
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
    const date = selectedKind === "feed" ? record.publishedAt.slice(0, 10) : getRecordDate(record);
    const groupByMonth = ["period", "photo"].includes(selectedKind);
    const group = groupByMonth ? date.slice(0, 7) : date;
    if (group !== previousDate && selectedKind !== "feed") {
      const divider = document.createElement("div");
      divider.className = "date-divider";
      const day = document.createElement("strong");
      day.textContent = groupByMonth ? `${Number(date.slice(5, 7))}月` : String(Number(date.slice(8, 10)));
      const month = document.createElement("span");
      month.textContent = groupByMonth ? `${date.slice(0, 4)}年` : `${Number(date.slice(5, 7))}月 · ${date.slice(0, 4)}`;
      divider.append(day, month);
      recordList.append(divider);
      previousDate = group;
    }
    recordList.append(createRecordCard(record));
  }
}

function renderDashboard() {
  const dashboard = buildDashboard(records.filter(record => !record.deletedAt));
  const personal = getRecordsForView(records, "all", { cloud: cloudMode, userId: cloudUserId });
  const personalDashboard = buildDashboard(personal);
  daysTogether.textContent = dashboard.daysTogether ?? "—";
  daysTogetherNote.textContent = dashboard.startDate ? `从 ${formatDate(dashboard.startDate)} 开始` : "先记录恋爱纪念日或时间轴";
  document.querySelector("#set-start-date").hidden = Boolean(dashboard.startDate);
  monthRecords.textContent = personalDashboard.monthRecords;
  pendingDates.textContent = personalDashboard.pendingDates;
  document.querySelector("#photo-total").textContent = personal.reduce((sum, record) => sum + getRecordPhotos(record.payload).length, 0);
  nextAnniversary.textContent = dashboard.nextAnniversary
    ? dashboard.nextAnniversary.days === 0 ? "今天" : `${dashboard.nextAnniversary.days} 天`
    : "—";
  nextAnniversaryNote.textContent = dashboard.nextAnniversary?.title || "添加一个值得期待的日子";
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
  if (cloudMode) kind.textContent += ` · ${record.ownerId === cloudUserId ? "我" : "对方"} · ${record.visibility === "private" ? "仅自己" : "已发布"}`;
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
      if (cloudMode) {
        const cloud = await sync.client(); await cloud.remove(record); records = await cloud.list();
      } else records = await removeRecord(record.id);
      if (editingId === record.id) {
        editingId = null;
        renderForm();
      }
      renderRecords();
      if (recordDetail.open) recordDetail.close();
      showStatus("记录已删除。", false);
    } catch {
      showStatus("删除失败，请稍后再试。", true);
    }
  });
  actions.append(editButton, removeButton);
  if (cloudMode && record.ownerId !== cloudUserId) actions.hidden = true;
  top.append(heading, actions);

  const photos = getRecordPhotos(record.payload);
  const gallery = document.createElement("div");
  gallery.className = "photo-gallery";
  gallery.dataset.count = String(photos.length);
  for (const [index, photo] of photos.entries()) {
    if (!(photo instanceof Blob) && !photo.cloud) continue;
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
  if (selectedKind === "feed") {
    const byline = document.createElement("div"); byline.className = "feed-byline";
    const avatar = document.createElement("span"); avatar.className = "feed-avatar";
    avatar.textContent = record.ownerId === cloudUserId ? "我" : "对方";
    const author = document.createElement("div");
    const name = document.createElement("strong"); name.textContent = record.ownerId === cloudUserId ? "我发布的生活" : "对方发布的生活";
    const time = document.createElement("small");
    time.textContent = new Date(record.publishedAt).toLocaleString("zh-CN", { dateStyle: "medium", timeStyle: "short" });
    author.append(name, time); byline.append(avatar, author); card.append(byline);
    const eventDate = document.createElement("p"); eventDate.className = "feed-event-date";
    eventDate.textContent = "记录日期 · " + formatDate(getRecordDate(record)); heading.append(eventDate);
  }
  card.append(top);
  if (gallery.childElementCount) card.append(gallery);
  card.append(details, savedAt);
  return card;
}

function startEditing(record) {
  if (recordDetail.open) recordDetail.close();
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
  if (getRecordKind(record) === "feeling") return `此刻${record.payload.mood || "的心情"} · 一封心情来信`;
  if (getRecordKind(record) === "period") return record.payload.item || "这一次生理期";
  if (["timeline", "date", "anniversary", "memory", "photo"].includes(record.kind)) return record.payload.title;
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

function openEditor(kind = selectedKind === "album" ? "photo" : ["all", "feed", "home", "more"].includes(selectedKind) ? "daily" : selectedKind) {
  editingId = null;
  draftId = crypto.randomUUID();
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
  if (photo.cloud) setCloudPhoto(image, photo);
  else { const url = URL.createObjectURL(photo); recordPhotoUrls.push(url); image.src = url; }
  image.addEventListener("error", () => {
    const fallback = document.createElement("span");
    fallback.className = "photo-fallback";
    fallback.textContent = "照片已保存 · 点开查看或下载";
    button.replaceChildren(fallback);
  }, { once: true });
  button.append(image);
  button.addEventListener("click", () => {
    if (recordDetail.open) recordDetail.close();
    viewerRecord = record;
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

async function renderViewer() {
  const generation = ++viewerGeneration;
  if (viewerUrl) URL.revokeObjectURL(viewerUrl);
  const photo = viewerPhotos[viewerIndex];
  try {
    const url = photo.cloud ? await (await sync.client()).photoUrl(photo) : URL.createObjectURL(photo);
    if (generation !== viewerGeneration) { if (!photo.cloud) URL.revokeObjectURL(url); return; }
    viewerUrl = url;
  } catch (error) { viewerImage.hidden = true; viewerError.hidden = false; return; }
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

async function setCloudPhoto(image, photo) {
  try {
    const url = await (await sync.client()).photoUrl(photo);
    if (image.isConnected) image.src = url;
  } catch (error) { image.alt = "照片加载失败，可稍后刷新重试"; }
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

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}

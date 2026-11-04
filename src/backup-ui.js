import { createBackup, restoreBackup } from "./storage.js?v=16";
import { encryptBackup, decryptBackup, isEncryptedBackup } from "./backup-crypto.js?v=16";

export function setupBackup({ getRecords, isCloud, getCloud, onRestore }) {
  const dialog = document.createElement("dialog");
  dialog.className = "editor-dialog secure-backup-dialog";
  dialog.setAttribute("aria-labelledby", "secure-backup-title");
  dialog.innerHTML = '<div class="form-panel"><div class="editor-top"><h2 id="secure-backup-title"></h2><button type="button" class="icon-button" data-close aria-label="关闭备份">×</button></div><p data-description class="panel-description"></p><form class="form-fields"><label class="field field-wide">备份密码<input name="backupPassword" type="password" autocomplete="new-password" required maxlength="256" /></label><label class="field field-wide" data-confirm>再输入一次密码<input name="backupConfirm" type="password" autocomplete="new-password" maxlength="256" /></label><p class="privacy-note field-wide">密码只在本机用于加密或解密，不会上传。请单独保存密码，忘记后无法找回。</p><button class="primary-button field-wide" type="submit" data-submit></button></form><p data-message class="status-message" role="status" aria-live="polite"></p></div>';
  document.body.append(dialog);
  const ready = document.createElement("div"); ready.hidden = true;
  ready.innerHTML = '<p class="panel-description">备份已加密。点击下方按钮，保存到“文件”或其他安全位置。</p><a class="primary-button" data-download>保存加密备份</a>';
  dialog.querySelector(".form-panel").append(ready);
  const download = ready.querySelector("[data-download]");
  const form = dialog.querySelector("form"), password = form.elements.namedItem("backupPassword");
  const confirm = form.elements.namedItem("backupConfirm"), message = dialog.querySelector("[data-message]");
  const output = document.querySelector("#backup-status"), fileInput = document.querySelector("#import-backup");
  let mode = "export", source = null, working = false, generation = 0, downloadUrl = null;
  function status(text, error = false) {
    message.textContent = text; message.classList.toggle("is-error", error);
    output.textContent = text; output.classList.toggle("is-error", error);
  }
  function show(nextMode, contents = null) {
    generation++;
    mode = nextMode; source = contents; form.reset(); form.hidden = false; ready.hidden = true; status("");
    form.inert = false; dialog.querySelectorAll("button").forEach(button => { button.disabled = false; });
    if (downloadUrl) URL.revokeObjectURL(downloadUrl); downloadUrl = null; download.removeAttribute("href");
    const exporting = mode === "export";
    dialog.querySelector("#secure-backup-title").textContent = exporting ? "给备份加一把锁" : "解锁这份备份";
    dialog.querySelector("[data-description]").textContent = exporting ? "设置至少 12 个字符的独立密码，文字和照片都会加密后保存。" : "请输入导出这份备份时设置的密码。解密成功后才会合并记录。";
    dialog.querySelector("[data-confirm]").hidden = !exporting; confirm.required = exporting; confirm.disabled = !exporting;
    password.minLength = exporting ? 12 : 1;
    password.autocomplete = exporting ? "new-password" : "current-password";
    dialog.querySelector("[data-submit]").textContent = exporting ? "生成加密备份" : "解密并恢复";
    dialog.showModal(); document.body.classList.add("modal-open");
  }
  dialog.addEventListener("close", () => {
    generation++; working = false; form.inert = false; form.reset(); source = null;
    dialog.querySelectorAll("button").forEach(button => { button.disabled = false; });
    if (downloadUrl) { const previous = downloadUrl; setTimeout(() => URL.revokeObjectURL(previous), 60000); downloadUrl = null; }
    document.body.classList.toggle("modal-open", Boolean(document.querySelector("dialog[open]")));
  });
  dialog.addEventListener("cancel", event => { if (working) { event.preventDefault(); status("正在处理，请稍候。"); } });
  dialog.querySelector("[data-close]").addEventListener("click", () => { if (!working) dialog.close(); });
  document.querySelector("#export-backup").addEventListener("click", () => { if (!working) show("export"); });
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0]; if (!file) return;
    const operation = generation;
    try {
      if (isCloud()) throw new Error("请先切回本机手账恢复备份，再选择需要上传的记录。");
      const contents = await file.text();
      if (operation !== generation) return;
      if (isEncryptedBackup(contents)) show("import", contents);
      else {
        const result = await restoreBackup(contents);
        if (operation !== generation) return;
        onRestore(result.records); status("旧版备份已恢复，原有记录已保留。之后导出会使用密码加密。");
      }
    } catch (error) { if (operation === generation) status(error.message || "备份恢复失败，原记录没有改动。", true); }
    finally { fileInput.value = ""; }
  });
  form.addEventListener("submit", async event => {
    event.preventDefault(); if (working) return;
    const operation = generation, exporting = mode === "export";
    working = true; form.inert = true;
    dialog.querySelectorAll("button").forEach(button => { button.disabled = true; });
    try {
      if (exporting && password.value !== confirm.value) throw new Error("两次密码不一致，请重新核对。");
      status(exporting ? "正在整理照片并加密，请保持页面打开…" : "正在解密并核对备份…");
      if (exporting) {
        const records = isCloud() ? await (await getCloud()).exportRecords(getRecords()) : getRecords();
        const encrypted = await encryptBackup(await createBackup(records), password.value);
        if (operation !== generation) return;
        downloadUrl = URL.createObjectURL(new Blob([encrypted], { type: "application/json" }));
        download.href = downloadUrl;
        download.download = "love-os-encrypted-backup-" + new Date().toLocaleDateString("sv-SE") + ".json";
        form.reset(); form.hidden = true; ready.hidden = false;
        status("已生成加密备份，请点击保存，并单独保管密码。");
      } else {
        const plain = await decryptBackup(source, password.value);
        if (operation !== generation) return;
        const result = await restoreBackup(plain);
        if (operation !== generation) return;
        onRestore(result.records); status("已解密并恢复 " + result.importedCount + " 条记录，原有记录已保留。");
      }
      if (!exporting) dialog.close();
    } catch (error) { if (operation === generation) status(error.message || "操作失败，原记录没有改动。", true); }
    finally {
      if (operation === generation) {
        working = false; form.inert = false;
        dialog.querySelectorAll("button").forEach(button => { button.disabled = false; });
      }
    }
  });
  return {
    isBusy: () => working || dialog.open,
    lock() {
      generation++; working = false; form.inert = false; form.reset(); source = null;
      if (downloadUrl) URL.revokeObjectURL(downloadUrl); downloadUrl = null;
      download.removeAttribute("href"); ready.hidden = true;
      if (dialog.open) dialog.close();
    },
  };
}

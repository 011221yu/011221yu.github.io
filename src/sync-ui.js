let clientPromise;
const client = () => clientPromise ||= import("./cloud.js?v=16");
import { createIdleGuard, IDLE_TIMEOUT_MS } from "./session-guard.js?v=16";
export function setupSync({ getLocal, onRecords, isBusy, onAccountLock = () => {} }) {
  let active = false;
  let state = { user: null, space: null };
  let refreshing = false;
  let generation = 0, ending = false, watching = false, lastWrite = 0;
  const activityKey = "love-os.session-activity";
  const legacy = location.hostname === "011221yu.github.io";
  const cloudEntry = "https://love-os-eager-sailfish-d4go48ch8078469d0.webapps.tcloudbase.com/love-os/";
  const idle = createIdleGuard({ onExpire: () => { void endSession("闲置 15 分钟，已退出账号。请重新登录。", true); } });
  const bar = document.createElement("section");
  bar.className = "sync-bar";
  bar.setAttribute("aria-label", "记录存放位置");
  bar.innerHTML = '<div class="view-switch"><button type="button" data-mode="local" aria-pressed="true">本机手账</button><button type="button" data-mode="cloud" aria-pressed="false">账号手账</button></div><span class="sync-state" role="status">记录保存在本机</span><button type="button" class="text-button" data-account>连接／管理</button>';
  document.querySelector("#account-controls").append(bar);
  const badge = bar.querySelector(".sync-state");
  const panel = document.createElement("dialog");
  panel.className = "editor-dialog sync-dialog";
  panel.innerHTML = '<div class="form-panel"><div class="editor-top"><h2>我们的两人空间</h2><button type="button" class="icon-button" data-close aria-label="关闭空间设置">×</button></div><p class="panel-description">各自登录，通过邀请码连接；只有空间里的两人能查看共享记录。</p><form data-login class="form-fields"><label class="field">用户名<input name="username" autocomplete="username" required /></label><label class="field">密码<input name="password" type="password" autocomplete="current-password" required /></label><button class="primary-button field-wide" type="submit">登录</button><p class="panel-description field-wide">使用已开通的 CloudBase 用户名账号。需要开通或找回账号时，请由环境所有者在 CloudBase 用户管理中处理。</p></form><section data-connected hidden><p data-identity></p><p data-members></p><button class="secondary-button" data-create-space type="button">创建我们的空间</button><button class="secondary-button" data-invite type="button">生成／更换邀请码</button><p class="panel-description">邀请码有效期 24 小时，只能使用一次。重新生成后旧码失效。</p><textarea data-invite-code readonly hidden aria-label="邀请码" rows="3"></textarea><button class="secondary-button" data-copy type="button" hidden>复制邀请码</button><form data-join class="form-fields"><label class="field field-wide">她发来的邀请码<textarea name="code" required rows="3" autocomplete="off"></textarea></label><button class="secondary-button" type="submit">加入她的空间</button></form><button class="primary-button" data-enter type="button">进入两人空间</button><button class="secondary-button" data-import-open type="button">选择本机旧记录上传</button><button class="text-button" data-logout type="button">退出账号</button><form data-import hidden><p>只上传勾选的记录，原件保留在本机。</p><div data-local-list class="import-list"></div><label class="field">上传后的可见范围<select name="visibility"><option value="private">仅自己（先私藏）</option><option value="shared">发布到共同动态（可发布的模块）</option></select></label><button class="primary-button" type="submit">上传选中记录</button></form></section><p data-message role="status" aria-live="polite"></p></div>';
  document.body.append(panel);
  const message = panel.querySelector("[data-message]");
  const connected = panel.querySelector("[data-connected]");
  const loginForm = panel.querySelector("[data-login]");
  const safetyNote = document.createElement("p");
  safetyNote.className = "privacy-note";
  safetyNote.textContent = "账号保护：闲置 15 分钟自动退出。未保存的云端草稿只在当前页面暂存，重新登录同一账号后可继续；刷新页面会失去未保存草稿。";
  loginForm.before(safetyNote);
  if (legacy) {
    safetyNote.textContent = "双人同步已迁移到腾讯云新入口。这个旧网址保留本机记录，请先导出备份，再到新入口恢复。";
    const link = document.createElement("a"); link.className = "primary-button legacy-cloud-link";
    link.href = cloudEntry; link.textContent = "打开腾讯云同步入口"; loginForm.before(link);
  }
  const setMessage = (text, error = false) => { message.textContent = text; message.classList.toggle("is-error", error); };
  function readActivity() {
    try {
      const value = JSON.parse(localStorage.getItem(activityKey));
      return value?.uid === state.user?.id && Number.isFinite(value.at) && value.at <= Date.now() ? value.at : null;
    } catch { return null; }
  }
  function touchActivity() {
    if (!state.user || ending) return;
    idle.touch();
    if (Date.now() - lastWrite > 5000) {
      lastWrite = Date.now(); localStorage.setItem(activityKey, JSON.stringify({ uid: state.user.id, at: lastWrite }));
    }
  }
  function armIdle() {
    if (!state.user) { idle.stop(); return true; }
    const last = readActivity() ?? Date.now();
    if (Date.now() - last >= IDLE_TIMEOUT_MS) { void endSession("闲置 15 分钟，已退出账号。请重新登录。", true); return false; }
    if (readActivity() === null) localStorage.setItem(activityKey, JSON.stringify({ uid: state.user.id, at: last }));
    idle.start(last); return true;
  }
  async function endSession(reason, remote = false, requireLogin = true) {
    if (ending) return;
    ending = true; generation++;
    const uid = state.user?.id, hadCloud = active;
    active = false; state = { user: null, space: null }; idle.stop();
    if (requireLogin) localStorage.setItem("love-os.require-login", "1");
    localStorage.setItem("love-os.sync-mode", "local");
    loginForm.reset();
    panel.querySelector("[data-invite-code]").value = ""; panel.querySelector("[data-invite-code]").hidden = true;
    panel.querySelector("[data-copy]").hidden = true; panel.querySelector("[data-import]").hidden = true;
    panel.querySelector("[data-local-list]").replaceChildren();
    if (hadCloud) { onAccountLock(uid); await onRecords([], false, null); }
    badge.textContent = reason; setMessage(reason); render();
    try { if (remote) await (await client()).logout(); }
    catch { setMessage(reason + " 本页内容已清除，云端注销请求未完成，请检查网络。", true); }
    finally { ending = false; }
  }
  async function connectedClient() {
    const cloud = await client();
    if (!watching) {
      watching = true;
      try {
        await cloud.observeAuth((event, uid) => {
          if (event === "SIGNED_OUT" && (state.user || active)) void endSession("登录已退出，请重新登录。");
          else if (uid && state.user && uid !== state.user.id) void endSession("账号已切换，请重新进入空间。", false, false);
        });
      } catch (error) { watching = false; throw error; }
    }
    return cloud;
  }
  async function run(action) {
    panel.querySelectorAll("button").forEach(button => { button.disabled = true; });
    try { await action(); } catch (error) { setMessage(error.message || "请求失败，请重试", true); }
    finally { panel.querySelectorAll("button").forEach(button => { button.disabled = false; }); render(); }
  }
  function render() {
    loginForm.hidden = legacy || Boolean(state.user);
    connected.hidden = !state.user;
    panel.querySelector("[data-identity]").textContent = state.user ? "已登录：" + (state.user.user_metadata?.username || state.user.username || state.user.id.slice(-8)) : "";
    panel.querySelector("[data-members]").textContent = state.space ? state.space.partner_id ? "已连接两位成员。保存给自己或主动发布。" : "空间已创建，等待另一位加入。" : "创建空间，或填写对方的邀请码加入。";
    panel.querySelector("[data-create-space]").hidden = Boolean(state.space);
    panel.querySelector("[data-join]").hidden = Boolean(state.space);
    panel.querySelector("[data-invite]").hidden = !state.space || state.space.owner_id !== state.user?.id || Boolean(state.space.partner_id);
    panel.querySelector("[data-enter]").hidden = !state.space;
    panel.querySelector("[data-import-open]").hidden = !state.space;
    const homeState = document.querySelector("#home-account-state");
    if (homeState) homeState.textContent = !state.user ? "登录两人空间" : !active ? "本机手账 · 已登录" : state.space?.partner_id ? "两人空间 · 已连接" : "空间等待对方加入";
    document.querySelector("#more-account-state").textContent = !state.user ? "登录自己的账号，连接彼此的生活" : state.space?.partner_id ? "已连接彼此 · 管理账号与配对" : "已登录 · 创建或加入两人空间";
    document.querySelector(".home-footnote").textContent = active ? "私藏的记录，在对应模块里。发布的生活，在共同动态里。" : "当前记录保存在这个浏览器，登录后可进入两人空间。";
    bar.querySelector('[data-mode="local"]').setAttribute("aria-pressed", String(!active));
    bar.querySelector('[data-mode="cloud"]').setAttribute("aria-pressed", String(active));
  }
  async function refresh() {
    if (refreshing || !active || isBusy()) return;
    refreshing = true;
    const operation = generation;
    try {
      const cloud = await connectedClient();
      const nextState = await cloud.status();
      if (operation !== generation || !active) return;
      state = nextState;
      if (!state.user || !state.space) {
        await endSession("登录已失效，请重新登录。"); return;
      }
      if (!armIdle()) return;
      const next = await cloud.list();
      if (isBusy() || !active || operation !== generation) return;
      await onRecords(next, true, state.user.id);
      badge.textContent = "已同步 · " + new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
    } catch (error) { badge.textContent = "暂未同步，请重试"; setMessage(error.message, true); }
    finally { refreshing = false; render(); }
  }
  async function enter() {
    if (isBusy()) throw new Error("请先保存或关闭正在编辑的记录");
    if (!state.space) throw new Error("请先创建或加入空间");
    if (!armIdle()) return;
    const operation = generation;
    const cloud = await connectedClient();
    const records = await cloud.list();
    if (operation !== generation || !state.user) return;
    active = true;
    localStorage.setItem("love-os.sync-mode", "cloud");
    await onRecords(records, true, state.user.id);
    badge.textContent = "已同步到两人空间"; render(); panel.close();
  }
  async function open() {
    if (isBusy()) { badge.textContent = "请先保存或关闭编辑"; return; }
    panel.showModal(); document.body.classList.add("modal-open");
    if (legacy) { render(); return; }
    const operation = generation;
    await run(async () => {
      const next = await (await connectedClient()).status();
      if (operation !== generation) return;
      state = next; armIdle();
    });
  }
  panel.addEventListener("close", () => document.body.classList.toggle("modal-open", Boolean(document.querySelector("dialog[open]"))));
  panel.querySelector("[data-close]").addEventListener("click", () => panel.close());
  bar.querySelector("[data-account]").addEventListener("click", open);
  bar.querySelector('[data-mode="cloud"]').addEventListener("click", open);
  bar.querySelector('[data-mode="local"]').addEventListener("click", async () => {
    if (isBusy()) { badge.textContent = "请先保存或关闭编辑"; return; }
    active = false; await onRecords(await getLocal(), false, null);
    localStorage.setItem("love-os.sync-mode", "local");
    badge.textContent = "记录保存在本机"; render();
  });
  loginForm.addEventListener("submit", event => {
    event.preventDefault();
    const data = new FormData(loginForm);
    run(async () => {
      state = await (await connectedClient()).login(String(data.get("username")).trim(), String(data.get("password")));
      lastWrite = 0; touchActivity();
      loginForm.reset(); setMessage(state.space ? "登录成功，可以进入你们的空间。" : "登录成功，创建或加入你们的空间吧。");
    });
  });
  panel.querySelector("[data-create-space]").addEventListener("click", () => run(async () => {
    state = await (await client()).createSpace(); setMessage("空间已创建，可以生成邀请码发给她。");
  }));
  panel.querySelector("[data-invite]").addEventListener("click", () => run(async () => {
    const data = await (await client()).invite();
    const input = panel.querySelector("[data-invite-code]"); input.hidden = false; input.value = data.code;
    panel.querySelector("[data-copy]").hidden = false; setMessage("邀请码已生成，请仅分享给她。");
  }));
  panel.querySelector("[data-copy]").addEventListener("click", () => run(async () => {
    await navigator.clipboard.writeText(panel.querySelector("[data-invite-code]").value); setMessage("已复制邀请码");
  }));
  panel.querySelector("[data-join]").addEventListener("submit", event => {
    event.preventDefault();
    const code = new FormData(event.currentTarget).get("code");
    run(async () => { state = await (await client()).join(String(code)); setMessage("已加入，可以进入两人空间。"); });
  });
  panel.querySelector("[data-enter]").addEventListener("click", () => run(enter));
  panel.querySelector("[data-logout]").addEventListener("click", () => run(() => endSession("已退出账号，云端内容已从本页清除。", true)));
  panel.querySelector("[data-import-open]").addEventListener("click", () => run(async () => {
    const local = await getLocal();
    const list = panel.querySelector("[data-local-list]"); list.replaceChildren();
    for (const record of local) {
      const label = document.createElement("label");
      const input = document.createElement("input"); input.type = "checkbox"; input.value = record.id;
      label.append(input, document.createTextNode(" " + (record.payload.title || record.payload.item || record.payload.date || record.createdAt.slice(0, 10))));
      list.append(label);
    }
    panel.querySelector("[data-import]").hidden = false;
    setMessage(local.length ? "勾选要上传的旧记录。特别事项、生理期始终仅自己可见。" : "这个浏览器还没有本机记录。可先回到本机模式恢复旧备份。");
  }));
  panel.querySelector("[data-import]").addEventListener("submit", event => {
    event.preventDefault();
    const form = event.currentTarget;
    const ids = [...form.querySelectorAll('input:checked')].map(input => input.value);
    const visibility = new FormData(form).get("visibility");
    run(async () => {
      if (!ids.length) throw new Error("请先勾选记录");
      const records = (await getLocal()).filter(record => ids.includes(record.id));
      let count = 0;
      for (const [index, record] of records.entries()) {
        setMessage(`正在上传 ${index + 1}/${records.length}，请保持页面打开…`);
        if (await (await client()).importRecord(record, visibility)) count++;
      }
      if (active) await refresh();
      setMessage(`已上传 ${count} 条，已存在的记录自动跳过。本机原件保留。`);
    });
  });
  render();
  const timer = setInterval(() => { if (!document.hidden) refresh(); }, 15000);
  window.addEventListener("pagehide", () => clearInterval(timer), { once: true });
  window.addEventListener("online", refresh);
  for (const event of ["pointerdown", "keydown"]) window.addEventListener(event, e => { if (e.isTrusted) touchActivity(); }, { passive: true });
  window.addEventListener("storage", e => {
    if (e.key === "love-os.require-login" && e.newValue === "1" && (state.user || active)) void endSession("其他页面已退出账号，请重新登录。");
    if (e.key === activityKey && state.user) armIdle();
  });
  document.addEventListener("visibilitychange", () => { if (!document.hidden && state.user) armIdle(); });
  window.addEventListener("pageshow", () => { if (state.user) armIdle(); if (active) refresh(); });
  if (!legacy && localStorage.getItem("love-os.sync-mode") === "cloud") {
    active = true; badge.textContent = "正在连接两人空间…"; refresh();
  }
  return {
    open, refresh, client, isActive: () => active,
    progress: text => { badge.textContent = text; },
    async saved() { if (active) { await refresh(); badge.textContent = "已保存并同步"; } },
  };
}

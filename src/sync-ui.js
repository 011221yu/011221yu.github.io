let clientPromise;
const client = () => clientPromise ||= import("./cloud.js?v=14");
export function setupSync({ getLocal, onRecords, isBusy }) {
  let active = false;
  let state = { user: null, space: null };
  let refreshing = false;
  const bar = document.createElement("section");
  bar.className = "sync-bar";
  bar.setAttribute("aria-label", "记录存放位置");
  bar.innerHTML = '<div class="view-switch"><button type="button" data-mode="local" aria-pressed="true">本机手账</button><button type="button" data-mode="cloud" aria-pressed="false">账号手账</button></div><span class="sync-state" role="status">记录保存在本机</span><button type="button" class="text-button" data-account>连接／管理</button>';
  document.querySelector(".page-top").after(bar);
  const badge = bar.querySelector(".sync-state");
  const panel = document.createElement("dialog");
  panel.className = "editor-dialog sync-dialog";
  panel.innerHTML = '<div class="form-panel"><div class="editor-top"><h2>我们的两人空间</h2><button type="button" class="icon-button" data-close aria-label="关闭空间设置">×</button></div><p class="panel-description">各自登录，通过邀请码连接；只有空间里的两人能查看共享记录。</p><form data-login class="form-fields"><label class="field">用户名<input name="username" autocomplete="username" required /></label><label class="field">密码<input name="password" type="password" autocomplete="current-password" required /></label><button class="primary-button field-wide" type="submit">登录</button><p class="panel-description field-wide">使用已开通的 CloudBase 用户名账号。需要开通或找回账号时，请由环境所有者在 CloudBase 用户管理中处理。</p></form><section data-connected hidden><p data-identity></p><p data-members></p><button class="secondary-button" data-create-space type="button">创建我们的空间</button><button class="secondary-button" data-invite type="button">生成／更换邀请码</button><p class="panel-description">邀请码有效期 24 小时，只能使用一次。重新生成后旧码失效。</p><textarea data-invite-code readonly hidden aria-label="邀请码" rows="3"></textarea><button class="secondary-button" data-copy type="button" hidden>复制邀请码</button><form data-join class="form-fields"><label class="field field-wide">她发来的邀请码<textarea name="code" required rows="3" autocomplete="off"></textarea></label><button class="secondary-button" type="submit">加入她的空间</button></form><button class="primary-button" data-enter type="button">进入两人空间</button><button class="secondary-button" data-import-open type="button">选择本机旧记录上传</button><button class="text-button" data-logout type="button">退出账号</button><form data-import hidden><p>只上传勾选的记录，原件保留在本机。</p><div data-local-list class="import-list"></div><label class="field">上传后的可见范围<select name="visibility"><option value="private">仅自己（先私藏）</option><option value="shared">发布到共同动态（可发布的模块）</option></select></label><button class="primary-button" type="submit">上传选中记录</button></form></section><p data-message role="status" aria-live="polite"></p></div>';
  document.body.append(panel);
  const message = panel.querySelector("[data-message]");
  const connected = panel.querySelector("[data-connected]");
  const loginForm = panel.querySelector("[data-login]");
  const setMessage = (text, error = false) => { message.textContent = text; message.classList.toggle("is-error", error); };
  async function run(action) {
    panel.querySelectorAll("button").forEach(button => { button.disabled = true; });
    try { await action(); } catch (error) { setMessage(error.message || "请求失败，请重试", true); }
    finally { panel.querySelectorAll("button").forEach(button => { button.disabled = false; }); render(); }
  }
  function render() {
    loginForm.hidden = Boolean(state.user);
    connected.hidden = !state.user;
    panel.querySelector("[data-identity]").textContent = state.user ? "已登录：" + (state.user.user_metadata?.username || state.user.username || state.user.id.slice(-8)) : "";
    panel.querySelector("[data-members]").textContent = state.space ? state.space.partner_id ? "已连接两位成员。保存给自己或主动发布。" : "空间已创建，等待另一位加入。" : "创建空间，或填写对方的邀请码加入。";
    panel.querySelector("[data-create-space]").hidden = Boolean(state.space);
    panel.querySelector("[data-join]").hidden = Boolean(state.space);
    panel.querySelector("[data-invite]").hidden = !state.space || state.space.owner_id !== state.user?.id || Boolean(state.space.partner_id);
    panel.querySelector("[data-enter]").hidden = !state.space;
    panel.querySelector("[data-import-open]").hidden = !state.space;
    const homeState = document.querySelector("#home-account-state");
    if (homeState) homeState.textContent = !state.user ? "登录自己的账号，连接彼此的生活。" : state.space?.partner_id ? "你们已连接 · 私藏与发布，由自己决定。" : "已登录，等待连接你们的两人空间。";
    bar.querySelector('[data-mode="local"]').setAttribute("aria-pressed", String(!active));
    bar.querySelector('[data-mode="cloud"]').setAttribute("aria-pressed", String(active));
  }
  async function refresh() {
    if (refreshing || !active || isBusy()) return;
    refreshing = true;
    try {
      const cloud = await client();
      state = await cloud.status();
      if (!state.user || !state.space) {
        active = false; await onRecords(await getLocal(), false, null);
        badge.textContent = "登录已失效，已回到本机手账"; render(); return;
      }
      const next = await cloud.list();
      if (isBusy() || !active) return;
      await onRecords(next, true, state.user.id);
      badge.textContent = "已同步 · " + new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
    } catch (error) { badge.textContent = "暂未同步，请重试"; setMessage(error.message, true); }
    finally { refreshing = false; }
  }
  async function enter() {
    if (isBusy()) throw new Error("请先保存或关闭正在编辑的记录");
    if (!state.space) throw new Error("请先创建或加入空间");
    const cloud = await client();
    const records = await cloud.list();
    active = true;
    localStorage.setItem("love-os.sync-mode", "cloud");
    await onRecords(records, true, state.user.id);
    badge.textContent = "已同步到两人空间"; render(); panel.close();
  }
  async function open() {
    if (isBusy()) { badge.textContent = "请先保存或关闭编辑"; return; }
    panel.showModal(); document.body.classList.add("modal-open");
    await run(async () => { state = await (await client()).status(); });
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
      state = await (await client()).login(String(data.get("username")).trim(), String(data.get("password")));
      loginForm.reset(); setMessage("登录成功，创建或加入你们的空间吧。");
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
  panel.querySelector("[data-logout]").addEventListener("click", () => run(async () => {
    await (await client()).logout(); state = { user: null, space: null }; active = false;
    localStorage.setItem("love-os.sync-mode", "local");
    panel.querySelector("[data-invite-code]").value = ""; panel.querySelector("[data-invite-code]").hidden = true;
    panel.querySelector("[data-copy]").hidden = true; panel.querySelector("[data-import]").hidden = true;
    panel.querySelector("[data-local-list]").replaceChildren();
    await onRecords(await getLocal(), false, null); badge.textContent = "记录保存在本机"; setMessage("已退出账号");
  }));
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
  const timer = setInterval(() => { if (!document.hidden) refresh(); }, 15000);
  window.addEventListener("pagehide", () => clearInterval(timer), { once: true });
  window.addEventListener("online", refresh);
  if (localStorage.getItem("love-os.sync-mode") === "cloud") {
    active = true; badge.textContent = "正在连接两人空间…"; refresh();
  }
  return {
    open, refresh, client, isActive: () => active,
    progress: text => { badge.textContent = text; },
    async saved() { if (active) { await refresh(); badge.textContent = "已保存并同步"; } },
  };
}

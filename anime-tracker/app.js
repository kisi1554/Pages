/* アニメ視聴管理 — 本体 */
"use strict";

/* ====================== 定数 ====================== */
/* 組み込みクール一覧 BUILTIN_COURS は cours.js、効果音 Sound は audio.js */

const STATUSES = [
  { key:"unwatched",  label:"未視聴"   },
  { key:"interested", label:"気になる" },
  { key:"watching",   label:"視聴中"   },
  { key:"completed",  label:"完走"     },
  { key:"dropped",    label:"断念"     },
];
const STATUS_KEYS = STATUSES.map(s => s.key);
const DEFAULT_STATUS = "unwatched";

const $ = id => document.getElementById(id);
const STORAGE_KEY = "anime-tracker-v1";

/* ====================== 保存 ====================== */

function emptyStore(){ return { version:1, cours:[], records:{}, ui:{} }; }

function loadStore(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return emptyStore();
    const s = JSON.parse(raw);
    return {
      version: 1,
      cours:   Array.isArray(s.cours) ? s.cours : [],
      records: (s.records && typeof s.records === "object") ? s.records : {},
      ui:      (s.ui && typeof s.ui === "object") ? s.ui : {},
    };
  }catch(e){
    console.warn("保存データを読めませんでした", e);
    return emptyStore();
  }
}

let store = loadStore();

function save(){
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); }
  catch(e){ alert("保存に失敗しました: " + e.message); }
}

/* ====================== 自動ファイル保存 (File System Access API) ====================== */
/* 対応ブラウザ(Chrome/Edge)でのみ動作。保存先ファイルの handle は IndexedDB に保持し、
   次回起動時も同じファイルへ書き込めるようにする。 */

const FS_SUPPORTED = typeof window.showSaveFilePicker === "function";
const HANDLE_DB_NAME = "anime-tracker-handles", HANDLE_STORE = "handles", HANDLE_KEY = "autosave";

let autoSaveHandle = null;
let autoSaveTimer = null;

function openHandleDB(){
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(HANDLE_DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(HANDLE_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbGet(key){
  const db = await openHandleDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(HANDLE_STORE, "readonly");
    const r = tx.objectStore(HANDLE_STORE).get(key);
    r.onsuccess = () => resolve(r.result || null);
    r.onerror = () => reject(r.error);
  });
}
async function idbSet(key, val){
  const db = await openHandleDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(HANDLE_STORE, "readwrite");
    tx.objectStore(HANDLE_STORE).put(val, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
async function idbDel(key){
  const db = await openHandleDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(HANDLE_STORE, "readwrite");
    tx.objectStore(HANDLE_STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function setAutoSaveStatus(text, cls){
  const el = $("autoSaveStatus");
  el.textContent = text;
  el.className = "msg" + (cls ? " " + cls : "");
}

function updateAutoSaveButtons(){
  const hasHandle = !!autoSaveHandle;
  $("btnAutoSave").textContent = hasHandle ? "保存先を変更…" : "自動保存先を選択…";
  $("btnAutoSaveOff").hidden = !hasHandle;
}

async function ensureWritePermission(handle){
  const opts = { mode: "readwrite" };
  if((await handle.queryPermission(opts)) === "granted") return true;
  return (await handle.requestPermission(opts)) === "granted";
}

async function writeStoreToHandle(handle){
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(store, null, 2));
  await writable.close();
}

function stampNow(){
  const t = new Date();
  return `${String(t.getHours()).padStart(2,"0")}:${String(t.getMinutes()).padStart(2,"0")}:${String(t.getSeconds()).padStart(2,"0")}`;
}

/* データが変わるたびに呼ぶ。debounce してファイルへ書き込む。 */
function scheduleAutoSave(){
  if(!autoSaveHandle) return;
  clearTimeout(autoSaveTimer);
  setAutoSaveStatus(`保存先: ${autoSaveHandle.name}（保存中…）`);
  autoSaveTimer = setTimeout(async () => {
    try{
      if(!(await ensureWritePermission(autoSaveHandle))){
        setAutoSaveStatus(`保存先: ${autoSaveHandle.name}（書き込み許可がありません。「許可して再開」を押してください）`, "ng");
        $("btnAutoSaveResume").hidden = false;
        return;
      }
      await writeStoreToHandle(autoSaveHandle);
      setAutoSaveStatus(`保存先: ${autoSaveHandle.name}（${stampNow()} に自動保存しました）`, "ok");
      $("btnAutoSaveResume").hidden = true;
    }catch(e){
      setAutoSaveStatus(`自動保存に失敗しました: ${e.message}`, "ng");
    }
  }, 600);
}

async function initAutoSave(){
  if(!FS_SUPPORTED){
    $("autoSaveRow").hidden = true;
    $("autoSaveUnsupported").hidden = false;
    return;
  }
  try{
    const saved = await idbGet(HANDLE_KEY);
    if(saved){
      autoSaveHandle = saved;
      const granted = (await saved.queryPermission({ mode: "readwrite" })) === "granted";
      if(granted){
        setAutoSaveStatus(`保存先: ${saved.name}`, "ok");
      }else{
        setAutoSaveStatus(`保存先: ${saved.name}（書き込み許可を失っています。「許可して再開」を押してください）`, "ng");
        $("btnAutoSaveResume").hidden = false;
      }
    }
  }catch(e){
    console.warn("自動保存先の復元に失敗しました", e);
  }
  updateAutoSaveButtons();
}

$("btnAutoSave").onclick = async () => {
  if(!FS_SUPPORTED) return;
  try{
    const handle = await window.showSaveFilePicker({
      suggestedName: "anime-tracker-backup.json",
      types: [{ description: "JSON", accept: { "application/json": [".json"] } }],
    });
    if(!(await ensureWritePermission(handle))) throw new Error("書き込み許可が得られませんでした");
    await writeStoreToHandle(handle);
    autoSaveHandle = handle;
    await idbSet(HANDLE_KEY, handle);
    updateAutoSaveButtons();
    $("btnAutoSaveResume").hidden = true;
    setAutoSaveStatus(`保存先: ${handle.name}（自動保存を開始しました）`, "ok");
  }catch(e){
    if(e.name !== "AbortError") setAutoSaveStatus(`設定できません: ${e.message}`, "ng");
  }
};

$("btnAutoSaveResume").onclick = async () => {
  if(!autoSaveHandle) return;
  try{
    if(!(await ensureWritePermission(autoSaveHandle))) throw new Error("許可が得られませんでした");
    await writeStoreToHandle(autoSaveHandle);
    $("btnAutoSaveResume").hidden = true;
    setAutoSaveStatus(`保存先: ${autoSaveHandle.name}（${stampNow()} に自動保存しました）`, "ok");
  }catch(e){
    setAutoSaveStatus(`再開できません: ${e.message}`, "ng");
  }
};

$("btnAutoSaveOff").onclick = async () => {
  autoSaveHandle = null;
  clearTimeout(autoSaveTimer);
  try{ await idbDel(HANDLE_KEY); }catch(e){ console.warn("自動保存先の削除に失敗しました", e); }
  updateAutoSaveButtons();
  $("btnAutoSaveResume").hidden = true;
  setAutoSaveStatus("自動保存を解除しました。");
};

/* 追加クールは同 id で組み込みプリセットを上書きする */
function allCours(){
  const map = new Map();
  for(const c of BUILTIN_COURS) map.set(c.id, c);
  for(const c of store.cours)   map.set(c.id, c);
  return [...map.values()].sort((a,b) => (b.order||0) - (a.order||0));
}

const ALL_COUR_ID = "__ALL__";

function isAllMode(){ return store.ui.cour === ALL_COUR_ID; }

/* 単一クール表示時に選ばれているクール(横断モードでは呼ばない) */
function singleCour(){
  const list = allCours();
  return list.find(c => c.id === store.ui.cour) || list[0];
}

/* 現在の画面に出すクールの配列。横断モードなら全クール。 */
function activeCours(){
  return isAllMode() ? allCours() : [singleCour()];
}

function recordsOf(courId){
  if(!store.records[courId]) store.records[courId] = {};
  return store.records[courId];
}

/* 読むだけなら保存データを増やさない。変更したときに commitRecord で保存先へ入れる。 */
function recordOf(courId, title){
  const recs = store.records[courId];
  const r = recs && recs[title];
  if(r && typeof r === "object"){
    if(!STATUS_KEYS.includes(r.status)) r.status = DEFAULT_STATUS;
    r.rating = Math.max(0, Math.min(5, Number(r.rating) || 0));
    if(typeof r.memo !== "string") r.memo = "";
    return r;
  }
  return { status:DEFAULT_STATUS, rating:0, memo:"" };
}

function commitRecord(courId, title, rec){
  recordsOf(courId)[title] = rec;
  save(); scheduleAutoSave();
}

/* ====================== 表示 ====================== */

const el = $("list");

function statusLabel(key){
  const s = STATUSES.find(s => s.key === key);
  return s ? s.label : key;
}

/* 絞り込みで隠されている作品も含めた、表示中クール(横断時は全クール)の集計 */
function countByStatus(cours){
  const counts = Object.fromEntries(STATUS_KEYS.map(k => [k, 0]));
  for(const cour of cours){
    for(const t of cour.titles){
      const k = recordOf(cour.id, t).status;
      if(k in counts) counts[k]++;
    }
  }
  return counts;
}

function totalTitleCount(cours){
  return cours.reduce((n, c) => n + c.titles.length, 0);
}

/* クールをまたいだ行の一覧。既定順は「クール順(新しい順) → クール内の掲載順」。 */
function buildRows(cours){
  const rows = [];
  for(const cour of cours){
    cour.titles.forEach((title, i) => {
      rows.push({ cour, title, i, rec: recordOf(cour.id, title) });
    });
  }
  return rows;
}

function visibleRows(){
  const q = (store.ui.q || "").trim().toLowerCase();
  const active = store.ui.filter;               // null なら全ステータス表示
  let rows = buildRows(activeCours());

  if(active) rows = rows.filter(r => r.rec.status === active);
  if(q)      rows = rows.filter(r => r.title.toLowerCase().includes(q));

  const sort = store.ui.sort || "default";
  if(sort === "title")       rows.sort((a,b) => a.title.localeCompare(b.title, "ja"));
  else if(sort === "rating") rows.sort((a,b) => (b.rec.rating - a.rec.rating) || (a.i - b.i));
  else if(sort === "status") rows.sort((a,b) =>
    (STATUS_KEYS.indexOf(a.rec.status) - STATUS_KEYS.indexOf(b.rec.status)) || (a.i - b.i));

  return rows;
}

function renderCourSelect(){
  const list = allCours();
  $("courSelect").innerHTML = "";

  const allOpt = document.createElement("option");
  allOpt.value = ALL_COUR_ID;
  allOpt.textContent = `すべてのクール（横断・${totalTitleCount(list)}本）`;
  if(isAllMode()) allOpt.selected = true;
  $("courSelect").appendChild(allOpt);

  const cur = isAllMode() ? null : singleCour();
  for(const c of list){
    const o = document.createElement("option");
    o.value = c.id;
    o.textContent = `${c.label}（${c.titles.length}本）`;
    if(cur && c.id === cur.id) o.selected = true;
    $("courSelect").appendChild(o);
  }
  $("courNote").textContent = isAllMode() ? "すべてのクールをまとめて表示しています。" : (cur.note || "");
}

function renderStats(){
  const cours = activeCours(), counts = countByStatus(cours), total = totalTitleCount(cours), box = $("stats");
  box.innerHTML = "";

  const mk = (cls, label, n, key) => {
    const b = document.createElement("button");
    b.className = "chip " + cls;
    b.setAttribute("aria-pressed", String(store.ui.filter === key));
    b.innerHTML = `<span>${label}</span><span class="n">${n}</span>`;
    b.onclick = () => {
      store.ui.filter = (store.ui.filter === key) ? null : key;
      Sound.tap(); save(); render();
    };
    box.appendChild(b);
  };

  const all = document.createElement("button");
  all.className = "chip all";
  all.setAttribute("aria-pressed", String(!store.ui.filter));
  all.innerHTML = `<span>すべて</span><span class="n">${total}</span>`;
  all.onclick = () => { store.ui.filter = null; Sound.tap(); save(); render(); };
  box.appendChild(all);

  for(const s of STATUSES) mk("st-" + s.key, s.label, counts[s.key], s.key);

  const pct = n => total ? (n / total * 100) : 0;
  const done = counts.completed, now = counts.watching;
  $("progress").innerHTML =
    `<span>完走 <b>${done}</b> ／ 視聴中 <b>${now}</b> ／ 全 <b>${total}</b> 本</span>` +
    `<span class="track" role="img" aria-label="完走 ${Math.round(pct(done))}%">` +
    `<span class="p-completed" style="width:${pct(done)}%"></span>` +
    `<span class="p-watching" style="width:${pct(now)}%"></span></span>`;
}

/* 一度に出す行数。「すべてのクール」で2000本以上あっても重くならないよう、続きはボタンで出す。 */
const PAGE_SIZE = 150;
let shown = PAGE_SIZE;

function setMemoButton(btn, rec, title){
  btn.className = "memo-btn" + (rec.memo ? " has" : "");
  btn.textContent = rec.memo ? "📝" : "＋";
  btn.title = rec.memo ? "メモを開く" : "メモを書く";
  btn.setAttribute("aria-label", title + " の" + btn.title);
}

function renderRow({ cour, title, i, rec }, cross){
  const item = document.createElement("div");
  item.className = "item";
  if(rec.status === "completed") item.classList.add("done");
  if(rec.status === "dropped")   item.classList.add("dropped");

  const line = document.createElement("div");
  line.className = "line";

  const idx = document.createElement("div");
  idx.className = "idx";
  idx.textContent = i + 1;

  const name = document.createElement("div");
  name.className = "title";
  if(cross){
    const tag = document.createElement("span");
    tag.className = "cour-tag";
    tag.textContent = cour.label;
    name.appendChild(tag);
    name.appendChild(document.createTextNode(title));
    name.title = `${cour.label} ｜ ${title}`;
  }else{
    name.textContent = title;
    name.title = title;
  }

  // ステータス
  const sel = document.createElement("select");
  sel.className = "status st-" + rec.status;
  sel.setAttribute("aria-label", title + " のステータス");
  for(const s of STATUSES){
    const o = document.createElement("option");
    o.value = s.key; o.textContent = s.label;
    if(s.key === rec.status) o.selected = true;
    sel.appendChild(o);
  }
  sel.onchange = () => {
    rec.status = sel.value;
    commitRecord(cour.id, title, rec);
    Sound.status(rec.status);
    render(true);
  };

  // 評価
  const stars = document.createElement("div");
  stars.className = "stars";
  stars.setAttribute("role", "group");
  stars.setAttribute("aria-label", title + " の評価");
  for(let n = 1; n <= 5; n++){
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = "★";
    b.title = n + " / 5" + (rec.rating === n ? "（もう一度押すと解除）" : "");
    b.setAttribute("aria-label", "評価 " + n);
    b.setAttribute("aria-pressed", String(rec.rating === n));
    if(n <= rec.rating) b.className = "on";
    b.onclick = () => {
      rec.rating = (rec.rating === n) ? 0 : n;
      commitRecord(cour.id, title, rec);
      if(rec.rating) Sound.star(n); else Sound.unstar();
      render(true);
    };
    stars.appendChild(b);
  }

  // メモ
  const btn = document.createElement("button");
  btn.type = "button";
  setMemoButton(btn, rec, title);

  const memo = document.createElement("div");
  memo.className = "memo";
  memo.hidden = true;
  const ta = document.createElement("textarea");
  ta.value = rec.memo;
  ta.placeholder = "感想・視聴メモ";
  ta.setAttribute("aria-label", title + " のメモ");
  let timer = null;
  const commitMemo = () => {
    if(rec.memo === ta.value) return;
    rec.memo = ta.value;
    commitRecord(cour.id, title, rec);
    setMemoButton(btn, rec, title);
  };
  ta.oninput = () => { clearTimeout(timer); timer = setTimeout(commitMemo, 350); };
  ta.onblur  = () => { clearTimeout(timer); commitMemo(); };
  memo.appendChild(ta);

  btn.onclick = () => {
    memo.hidden = !memo.hidden;
    btn.setAttribute("aria-expanded", String(!memo.hidden));
    Sound.tap();
    if(!memo.hidden) ta.focus();
  };

  line.append(idx, name, sel, stars, btn);
  item.append(line, memo);
  return item;
}

/* keepPage: 行の操作による再描画のときは、表示件数とスクロール位置をそのまま保つ */
function renderList(keepPage){
  const rows = visibleRows(), cross = isAllMode();
  if(!keepPage) shown = PAGE_SIZE;
  const y = window.scrollY;
  el.innerHTML = "";

  if(!rows.length){
    el.innerHTML = '<div class="empty">該当する作品がありません</div>';
    return;
  }

  const frag = document.createDocumentFragment();
  for(const row of rows.slice(0, shown)) frag.appendChild(renderRow(row, cross));
  el.appendChild(frag);

  if(rows.length > shown){
    const more = document.createElement("button");
    more.type = "button";
    more.className = "more";
    more.textContent = `つづきを表示（のこり ${rows.length - shown} 本）`;
    more.onclick = () => { shown += PAGE_SIZE; Sound.tap(); renderList(true); };
    el.appendChild(more);
  }
  if(keepPage) window.scrollTo(0, y);
}

function render(keepPage){ renderCourSelect(); renderStats(); renderList(keepPage); }

/* ====================== 操作 ====================== */

$("courSelect").onchange = e => { store.ui.cour = e.target.value; store.ui.filter = null; Sound.tap(); save(); render(); window.scrollTo(0, 0); };
$("sort").onchange       = e => { store.ui.sort = e.target.value; save(); renderList(); };

let qTimer = null;
$("q").oninput = e => {
  clearTimeout(qTimer);
  qTimer = setTimeout(() => { store.ui.q = e.target.value; save(); renderList(); }, 150);
};

$("btnData").onclick = () => {
  const open = $("drawer").classList.toggle("open");
  $("btnData").setAttribute("aria-expanded", String(open));
  Sound.tap();
  if(open) $("drawer").scrollIntoView({ behavior:"smooth", block:"start" });
};

function renderSoundButton(){
  const b = $("btnSound"), on = Sound.enabled;
  b.textContent = on ? "🔊" : "🔇";
  b.setAttribute("aria-pressed", String(on));
  b.setAttribute("aria-label", on ? "音 オン" : "音 オフ");
}
$("btnSound").onclick = () => { Sound.setEnabled(!Sound.enabled); renderSoundButton(); };

function say(text, ok){
  const m = $("msg");
  m.textContent = text;
  m.className = "msg " + (ok ? "ok" : "ng");
  if(ok) Sound.ok(); else Sound.ng();
}

/* --- バックアップ --- */
$("btnExport").onclick = () => {
  const d = new Date(), p = n => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}`;
  const blob = new Blob([JSON.stringify(store, null, 2)], { type:"application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `anime-tracker-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  say("書き出しました。", true);
};

$("btnImport").onclick = () => $("file").click();

$("file").onchange = e => {
  const f = e.target.files[0];
  if(!f) return;
  const fr = new FileReader();
  fr.onload = () => {
    try{
      const data = JSON.parse(fr.result);
      if(!data || typeof data !== "object" || !data.records || typeof data.records !== "object") throw new Error("書き出したバックアップ形式ではありません");
      if(!confirm("現在の視聴データを読み込んだ内容で置き換えます。よろしいですか?")) return;
      store = {
        version: 1,
        cours:   Array.isArray(data.cours) ? data.cours : [],
        records: data.records,
        ui:      (data.ui && typeof data.ui === "object") ? data.ui : {},
      };
      save(); scheduleAutoSave(); render(); say("読み込みました。", true);
    }catch(err){
      say("読み込めません: " + err.message, false);
    }
    e.target.value = "";
  };
  fr.readAsText(f);
};

/* --- クール追加 --- */
function validateCour(c){
  if(!c || typeof c !== "object")        throw new Error("オブジェクトではありません");
  if(typeof c.id !== "string" || !c.id)  throw new Error("id が必要です");
  if(typeof c.label !== "string" || !c.label) throw new Error(`${c.id}: label が必要です`);
  if(!Array.isArray(c.titles) || !c.titles.length) throw new Error(`${c.id}: titles(配列) が必要です`);
  const titles = c.titles.map(t => String(t).trim()).filter(Boolean);
  if(!titles.length) throw new Error(`${c.id}: titles が空です`);
  return {
    id: c.id, label: c.label,
    order: Number(c.order) || 0,
    source: typeof c.source === "string" ? c.source : "",
    note: typeof c.note === "string" ? c.note : "",
    titles: [...new Set(titles)],
  };
}

$("btnCour").onclick = () => {
  const raw = $("courJson").value.trim();
  if(!raw) return say("JSON を貼り付けてください。", false);
  try{
    const parsed = JSON.parse(raw);
    const incoming = (Array.isArray(parsed) ? parsed : [parsed]).map(validateCour);
    for(const c of incoming){
      const at = store.cours.findIndex(x => x.id === c.id);
      if(at >= 0) store.cours[at] = c; else store.cours.push(c);
    }
    store.ui.cour = incoming[0].id;
    store.ui.filter = null;
    save(); scheduleAutoSave(); render();
    $("courJson").value = "";
    say(`${incoming.map(c => c.label).join("、")} を取り込みました。`, true);
  }catch(err){
    say("取り込めません: " + err.message, false);
  }
};

$("btnRemoveCour").onclick = () => {
  if(isAllMode()) return say("「すべてのクール」表示中は削除できません。削除したいクールを選んでから実行してください。", false);
  const cur = singleCour();
  const at = store.cours.findIndex(c => c.id === cur.id);
  if(at < 0) return say(`「${cur.label}」は組み込みプリセットのため削除できません。`, false);
  if(!confirm(`「${cur.label}」のクール定義を削除します。視聴データは残ります。よろしいですか?`)) return;
  store.cours.splice(at, 1);
  store.ui.cour = null;
  save(); scheduleAutoSave(); render();
  say("削除しました。", true);
};

/* ====================== 起動 ====================== */

renderSoundButton();
$("q").value    = store.ui.q || "";
$("sort").value = store.ui.sort || "default";
render();
initAutoSave();

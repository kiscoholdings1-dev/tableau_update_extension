// app.js?v=13
if (typeof tableau === "undefined") {
  throw new Error("tableau is not defined");
}

const CONFIG_URL = "https://kiscoholdings1-dev.github.io/tableau_update_extension/updates.json";
const EXT_VER = "13";

function seenKey(dashboardName) {
  return `seenVersion:${dashboardName}`;
}
function storageKey(dashboardName) {
  return `updatePopup_seenVersion_${dashboardName}`;
}

async function fetchJson(url) {
  const res = await fetch(`${url}?cb=${Date.now()}`);
  if (!res.ok) throw new Error(`Config fetch failed: ${res.status}`);
  return res.json();
}

function normalizeItems(items) {
  const arr = Array.isArray(items) ? items : [];
  return arr.map((x) => String(x ?? "").trim()).filter(Boolean);
}

function getSeenVersion(dashboardName) {
  return localStorage.getItem(storageKey(dashboardName)) || null;
}

// 한글/특수문자 안전 Base64
function toB64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

function buildDialogUrl(payloadString) {
  const base = new URL(window.location.href);
  const dialog = new URL("dialog.html", base);

  dialog.searchParams.set("v", EXT_VER);
  dialog.searchParams.set("cb", String(Date.now()));
  dialog.searchParams.set("p64", toB64(payloadString));

  return dialog.toString();
}


function markSeen(dashboardName, version) {
  localStorage.setItem(storageKey(dashboardName), version);
}


(async function main() {
  try {
    await tableau.extensions.initializeAsync();

    const dashboardName = (tableau.extensions.dashboardContent.dashboard.name || "").trim();

    const data = await fetchJson(CONFIG_URL);
    const config = data?.dashboardsByName?.[dashboardName];

    // 1) 버전 없으면 종료
    if (!config?.version) return;

    // 2) 변경사항 없으면 종료
    const items = normalizeItems(config.items);
    if (items.length === 0) return;

    // 3) 이미 본 버전이면 종료
    const seen = getSeenVersion(dashboardName);
    if (seen === config.version) return;

    // 4) payload
    const payload = JSON.stringify({
      dashboardName,
      version: config.version,
      title: config.title || "업데이트 안내",
      items,
      extVer: EXT_VER
    });

    // ✅ 중요: dialog 열기 전에 먼저 seen 저장
    markSeen(dashboardName, config.version);

    // 5) dialog 표시
    const dialogUrl = buildDialogUrl(payload);

    try {
      await tableau.extensions.ui.displayDialogAsync(dialogUrl, payload, {
        width: 600,
        height: 520
      });
    } catch (err) {
      // 사용자가 X/ESC로 닫는 건 정상: 조용히 무시
      const msg = String(err?.message || err);
      if (msg.includes("dialog-closed-by-user")) return;

      console.error(err);
    }
  } catch (e) {
    console.error(e);
  }
})();

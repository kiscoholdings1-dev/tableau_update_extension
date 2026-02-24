// app.js
if (typeof tableau === "undefined") {
  const d = document.getElementById("debug");
  if (d) d.textContent = "tableau undefined (API script not loaded)";
  throw new Error("tableau is not defined");
}

const CONFIG_URL =
  "https://kiscoholdings1-dev.github.io/tableau_update_extension/updates.json";

function storageKey(dashboardName) {
  return `updatePopup_seenVersion_${dashboardName}`;
}

function isEditMode() {
  // Tableau가 제공하는 현재 모드 (authoring / viewing)
  try {
    return tableau?.extensions?.environment?.mode === "authoring";
  } catch {
    return false;
  }
}

/** ✅ 편집모드 UI 적용: overlay는 숨기고, miniLauncher 버튼만 노출 */
function applyEditModeUI(on) {
  document.body.classList.toggle("edit-mode", on);

  const launcher = document.getElementById("miniLauncher");
  if (launcher) launcher.classList.toggle("hidden", !on);

  // 혹시 overlay가 떠있던 상태에서 편집모드로 들어오면 닫아줌
  const overlay = document.getElementById("overlay");
  if (on && overlay) overlay.classList.add("hidden");
}

async function fetchJson(url) {
  const res = await fetch(`${url}?v=${Date.now()}`); // 캐시 방지
  if (!res.ok) throw new Error(`Config fetch failed: ${res.status}`);
  return res.json();
}

(async function main() {
  try {
    await tableau.extensions.initializeAsync();

    // ✅ 현재 페이지가 편집모드인지 먼저 UI 반영
    applyEditModeUI(isEditMode());

    const dashboard = tableau.extensions.dashboardContent.dashboard;
    const dashboardName = (dashboard.name || "").trim();

    const data = await fetchJson(CONFIG_URL);
    const config = data?.dashboardsByName?.[dashboardName];

    // 업데이트 없으면 종료
    if (!config || !config.version) return;

    // 같은 버전 다시보지않기면 종료
    const seen = localStorage.getItem(storageKey(dashboardName));
    if (seen === config.version) return;

    // ✅ 편집모드면 자동팝업 띄우지 않고 "업데이트" 버튼만 세팅
    if (isEditMode()) {
      const openBtn = document.getElementById("openUpdatesBtn");
      if (openBtn) {
        openBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          showPopup(config, dashboardName);
        };
      }
      return;
    }

    // 일반모드: 자동 팝업
    showPopup(config, dashboardName);
  } catch (e) {
    console.error(e);
  }
})();

function showPopup(config, dashboardName) {
  const overlay = document.getElementById("overlay");
  const popup = document.getElementById("popup");
  const closeBtn = document.getElementById("closeBtn");
  const dontBtn = document.getElementById("dontShowBtn");

  const titleEl = document.getElementById("title");
  const versionEl = document.getElementById("version");
  const itemsEl = document.getElementById("items");

  if (
    !overlay ||
    !popup ||
    !closeBtn ||
    !dontBtn ||
    !titleEl ||
    !versionEl ||
    !itemsEl
  ) {
    console.error("Popup DOM elements missing");
    return;
  }

  // ✅ 편집모드여도 버튼 눌렀을 때는 팝업 보여줘야 하니까 강제로 표시
  overlay.classList.remove("hidden");

  titleEl.textContent = config.title || "업데이트 안내";

  if (config.version) {
    const datePart = config.version.split("-").slice(0, 3).join(".");
    versionEl.textContent = `업데이트 일자: ${datePart}`;
  } else {
    versionEl.textContent = "";
  }

  // items 렌더
  itemsEl.innerHTML = "";
  const items = Array.isArray(config.items) ? config.items : [];
  if (items.length === 0) {
    const li = document.createElement("li");
    li.textContent = "변경 사항이 등록되지 않았습니다.";
    itemsEl.appendChild(li);
  } else {
    for (const t of items) {
      const li = document.createElement("li");
      li.textContent = String(t);
      itemsEl.appendChild(li);
    }
  }

  const hideOnly = () => {
    overlay.classList.add("hidden");
  };

  const hideAndSave = () => {
    if (config.version) {
      localStorage.setItem(storageKey(dashboardName), config.version);
    }
    overlay.classList.add("hidden");
  };

  // ✅ 바깥 클릭으로 닫히지 않게
  overlay.onclick = () => {};

  // 팝업 내부 클릭 전파 차단(혹시 모를 이벤트 대비)
  popup.onclick = (e) => e.stopPropagation();

  // X 버튼 = 그냥 닫기(저장 X)
  closeBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    hideOnly();
  };

  // 다시 보지 않기 = 저장 + 닫기
  dontBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    hideAndSave();
  };
}

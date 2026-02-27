// dialog.js?v=15

function fromB64(b64) {
  return decodeURIComponent(escape(atob(b64)));
}

function normalizeItems(items) {
  const arr = Array.isArray(items) ? items : [];
  return arr.map((x) => String(x ?? "").trim()).filter(Boolean);
}

function formatYYMMDDFromVersion(version) {
  if (!version) return "";
  const parts = String(version).split("-").slice(0, 3);
  if (parts.length !== 3) return "";
  return `${parts[0].slice(-2)}.${parts[1]}.${parts[2]}`;
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function renderList(items) {
  const itemsEl = document.getElementById("items");
  if (!itemsEl) return;
  itemsEl.innerHTML = "";
  for (const t of items) {
    const li = document.createElement("li");
    li.textContent = t;
    itemsEl.appendChild(li);
  }
}

function readPayload() {
  const raw = tableau.extensions.ui.dialogPayload;
  if (raw && String(raw).trim().length > 0) {
    try { return JSON.parse(raw); } catch {}
  }
  const qs = new URLSearchParams(window.location.search);
  const p64 = qs.get("p64");
  if (p64) {
    try { return JSON.parse(fromB64(p64)); } catch {}
  }
  return {};
}

/* ✅ "구매 대시보드" -> "구매" */
function badgeTextFromDashboardName(name) {
  if (!name) return "";
  // "대시보드" 단어 제거 + 공백 정리
  const cleaned = String(name)
    .replace(/대시보드/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned;
}

(async function main() {
  try {
    await tableau.extensions.initializeDialogAsync();

    const payload = readPayload();
    const dashboardName = (payload.dashboardName || "").trim();
    const version = payload.version || "";
    const items = normalizeItems(payload.items);

    if (!dashboardName || !version || items.length === 0) {
      tableau.extensions.ui.closeDialog("invalid_payload");
      return;
    }

    // ✅ 뱃지 표시
    const badge = document.getElementById("dashBadge");
    if (badge) {
      const txt = badgeTextFromDashboardName(dashboardName);
      badge.textContent = txt || dashboardName;
      badge.style.display = "inline-flex";
    }

    // 헤더 날짜
    const headerDate = formatYYMMDDFromVersion(version);
    setText("headerDate", headerDate ? `(일자: ${headerDate})` : "");

    renderList(items);
  } catch (e) {
    try { tableau.extensions.ui.closeDialog("error"); } catch (_) {}
    console.error(e);
  }
})();

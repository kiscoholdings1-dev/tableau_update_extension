// dialog.js?v=17

function fromB64(b64) {
  return decodeURIComponent(escape(atob(b64)));
}

function normalizeItems(items) {
  const arr = Array.isArray(items) ? items : [];
  return arr.map((x) => String(x ?? "").trim()).filter(Boolean);
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeContext(context) {
  const source = context && typeof context === "object" ? context : {};
  return {
    purpose: normalizeText(source.purpose),
    usage: normalizeText(source.usage),
    collaboration: normalizeText(source.collaboration)
  };
}

function normalizeDetail(detail) {
  const source = detail && typeof detail === "object" ? detail : {};
  return {
    title: normalizeText(source.title),
    purpose: normalizeText(source.purpose),
    usage: normalizeItems(source.usage),
    collaboration: normalizeText(source.collaboration)
  };
}

function normalizeDetails(details) {
  const arr = Array.isArray(details) ? details : [];
  return arr
    .map(normalizeDetail)
    .filter((detail) =>
      detail.title &&
      (detail.purpose || detail.usage.length > 0 || detail.collaboration)
    );
}

function normalizePayload(payload) {
  const source = payload && typeof payload === "object" ? payload : {};
  return {
    dashboardName: normalizeText(source.dashboardName),
    version: normalizeText(source.version),
    summary: normalizeText(source.summary),
    highlights: normalizeItems(source.highlights ?? source.items),
    context: normalizeContext(source.context),
    details: normalizeDetails(source.details)
  };
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

function setSectionVisible(id, visible) {
  const el = document.getElementById(id);
  if (el) el.style.display = visible ? "" : "none";
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
  const previewPayload = window.__UPDATE_PREVIEW_PAYLOAD__;
  if (previewPayload && typeof previewPayload === "object") {
    return previewPayload;
  }

  const raw = window.tableau?.extensions?.ui?.dialogPayload;
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

function renderSummary(summary) {
  const hasSummary = Boolean(summary);
  setSectionVisible("summarySection", hasSummary);
  if (hasSummary) setText("summaryText", summary);
}

function createMetaRow(label, value) {
  if (!value) return null;

  const row = document.createElement("div");
  row.className = "detail-meta-row";

  const labelEl = document.createElement("div");
  labelEl.className = "detail-meta-label";
  labelEl.textContent = `● ${label}`;

  const textEl = document.createElement("p");
  textEl.className = "detail-meta-text";
  textEl.textContent = value;

  row.appendChild(labelEl);
  row.appendChild(textEl);
  return row;
}

function createMetaListRow(label, values) {
  if (!Array.isArray(values) || values.length === 0) return null;

  const row = document.createElement("div");
  row.className = "detail-meta-row";

  const labelEl = document.createElement("div");
  labelEl.className = "detail-meta-label";
  labelEl.textContent = `● ${label}`;

  const listEl = document.createElement("ul");
  listEl.className = "detail-meta-list";

  for (const value of values) {
    const itemEl = document.createElement("li");
    itemEl.textContent = value;
    listEl.appendChild(itemEl);
  }

  row.appendChild(labelEl);
  row.appendChild(listEl);
  return row;
}

function createRequestDeptText(value) {
  if (!value) return null;

  const textEl = document.createElement("p");
  textEl.className = "detail-request-text";
  textEl.textContent = `(요청 부서: ${value})`;
  return textEl;
}

function renderDetails(details, fallbackContext) {
  const listEl = document.getElementById("detailsList");
  if (!listEl) return;

  listEl.innerHTML = "";

  const normalizedDetails = details.length > 0
    ? details
    : (
        fallbackContext.purpose ||
        fallbackContext.usage ||
        fallbackContext.collaboration
      )
        ? [{
            title: "주요 항목",
            purpose: fallbackContext.purpose,
            usage: fallbackContext.usage ? [fallbackContext.usage] : [],
            collaboration: fallbackContext.collaboration
          }]
        : [];

  setSectionVisible("detailsSection", normalizedDetails.length > 0);

  for (const [index, detail] of normalizedDetails.entries()) {
    const card = document.createElement("article");
    card.className = "detail-card";

    const title = document.createElement("h3");
    title.className = "detail-title";
    title.textContent = `${index + 1}. ${detail.title}`;
    card.appendChild(title);

    const metaRows = [
      createMetaRow("제작 의도", detail.purpose),
      createMetaListRow("활용 목적", detail.usage)
    ].filter(Boolean);

    for (const row of metaRows) {
      card.appendChild(row);
    }

    const requestText = createRequestDeptText(detail.collaboration);
    if (requestText) {
      card.appendChild(requestText);
    }

    listEl.appendChild(card);
  }
}

function closeDialogSafely(reason) {
  try { window.tableau?.extensions?.ui?.closeDialog(reason); } catch (_) {}
}

function badgeTextFromDashboardName(name) {
  if (!name) return "";
  const cleaned = String(name)
    .replace(/대시보드/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned;
}

(async function main() {
  try {
    if (window.tableau?.extensions?.initializeDialogAsync) {
      await tableau.extensions.initializeDialogAsync();
    }

    const payload = normalizePayload(readPayload());
    const { dashboardName, version, summary, highlights, context, details } = payload;

    if (!dashboardName || !version || (!summary && highlights.length === 0 && details.length === 0)) {
      closeDialogSafely("invalid_payload");
      return;
    }

    // ✅ 뱃지 표시
    const badge = document.getElementById("dashBadge");
    if (badge) {
      const txt = badgeTextFromDashboardName(dashboardName);
      badge.textContent = txt || dashboardName;
      badge.style.display = "inline-flex";
    }

    const headerDate = formatYYMMDDFromVersion(version);
    setText("headerDate", headerDate ? `(일자: ${headerDate})` : "");

    renderSummary(summary);
    setSectionVisible("highlightsSection", highlights.length > 0);
    renderList(highlights);
    renderDetails(details, context);
  } catch (e) {
    closeDialogSafely("error");
    console.error(e);
  }
})();

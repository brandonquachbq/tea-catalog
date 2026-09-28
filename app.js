/* Gongfu Tea Catalog — file-backed via serve.py catalog API. */
(() => {
  "use strict";

  /* ---------- Shareable AI prompt ("context script") ----------
     Copyable from the app so anyone you share this folder with can generate
     their own catalog by chatting with an AI, then drag the result back in. */
  const AI_PROMPT = [
    "You are helping me build a gong fu cha tea catalog for a local web app.",
    "I will give you tea names (optionally with type, origin, year, or vendor).",
    "Using your knowledge of each tea, fill in sensible gong fu brewing parameters and notes.",
    "",
    "Reply with ONLY a single JSON array in a code block — no other prose — so I can save it",
    "as a .json file and drag it onto my catalog app to import. One object per tea:",
    "",
    "{",
    '  "name": string               REQUIRED — English/romanized name,',
    '  "nameZh": string             REQUIRED — Chinese characters (e.g. "鐵觀音"). Use best-known characters; never leave blank,',
    '  "keywords": string[4]        REQUIRED — exactly 4 short tasting/aroma words, uppercase, e.g. ["Floral","Bright","Sweet","Crisp"],',
    '  "type": string               REQUIRED — one of: "Green" | "White" | "Yellow" | "Oolong" | "Black" | "Sheng Puerh" | "Shou Puerh" | "Dark/Hei" | "Herbal" | "Other",',
    '  "origin": string             REQUIRED — region/mountain + province/country, e.g. "Wuyi Mountains, Fujian",',
    '  "vendor": string             optional — seller or brand name,',
    '  "year": number               optional — harvest year,',
    '  "season": string             optional — "Spring" | "Summer" | "Autumn" | "Winter",',
    '  "quantityGrams": number      optional,',
    '  "gongfu": {',
    '    "waterTempC": number       REQUIRED — 0-100; lower bound if a range,',
    '    "waterTempMaxC": number    optional — upper bound for a temp range,',
    '    "leafGrams": number        REQUIRED — grams of leaf for the vessel size below,',
    '    "vesselMl": number         REQUIRED — vessel size in ml (default 100),',
    '    "rinse": boolean           REQUIRED — rinse leaves before first steep?,',
    '    "steeps": number[]         REQUIRED — seconds per infusion, usually increasing, e.g. [10,15,20,30,45]',
    '  },',
    '  "tastingNotes": string       REQUIRED — 1-2 sentences on flavour, aroma, finish,',
    '  "steepingInstructions": string  REQUIRED — 2-3 sentences on how to brew: leaf amount, water, timing, tips,',
    '  "foodPairings": string       REQUIRED — 3-5 foods that complement this tea',
    "}",
    "",
    "Gong fu defaults to lean on when unsure:",
    "- Green: 80C, ~4 g/100ml, no rinse, steeps [15,20,25,35,50]",
    "- White: 85-90C, ~5 g/100ml, optional rinse, [20,25,30,40,60]",
    "- Oolong (rolled, e.g. Tie Guan Yin): 95-100C, ~6-7 g/100ml, rinse, [15,20,25,35,50,70]",
    "- Oolong (roasted/Wuyi, e.g. Da Hong Pao): 100C, ~6 g/100ml, rinse, [10,12,15,20,30,45]",
    "- Black/red: 90-95C, ~5 g/100ml, optional rinse, [10,15,20,30,45]",
    "- Sheng puerh: 95C, ~7 g/100ml, rinse, [8,10,12,15,20,30,45]",
    "- Shou puerh: 100C, ~8 g/100ml, rinse, [8,10,12,15,20,30,45,60]",
    "",
    "Example of the expected output for one tea:",
    "[",
    "  {",
    '    "name": "Tie Guan Yin",',
    '    "nameZh": "鐵觀音",',
    '    "keywords": ["Floral","Creamy","Sweet","Smooth"],',
    '    "type": "Oolong",',
    '    "origin": "Anxi, Fujian",',
    '    "vendor": "Wuyi Origin",',
    '    "year": 2024,',
    '    "gongfu": { "waterTempC": 95, "leafGrams": 7, "vesselMl": 100, "rinse": true, "steeps": [15,20,25,35,50,70] },',
    '    "tastingNotes": "Floral orchid aroma, creamy body, lingering honeyed sweetness with a clean finish.",',
    '    "steepingInstructions": "Use 7g in a 100ml gaiwan. Rinse briefly with 95°C water, then steep 15 seconds for the first infusion, adding 5-10 seconds each round. The leaves reward 6+ steeps.",',
    '    "foodPairings": "Steamed fish, light pastries, fresh melon, jasmine rice, white chocolate."',
    "  }",
    "]",
    "",
    "My teas:",
    "- (list your teas here, one per line)"
  ].join("\n");

  /* ---------- Seed data (only used if storage is empty) ---------- */
  const SEED = [
    {
      id: "seed-dhp",
      name: "Da Hong Pao",
      nameZh: "大紅袍",
      keywords: ["Roasted", "Mineral", "Sweet", "Smooth"],
      type: "Oolong",
      origin: "Wuyi Mountains, Fujian",
      vendor: "",
      year: 2023,
      quantityGrams: 50,
      gongfu: { waterTempC: 100, waterTempMaxC: null, leafGrams: 6, vesselMl: 100, rinse: true, steeps: [10, 12, 15, 20, 30, 45] },
      tastingNotes: "Roasted, mineral 'yan yun' rock note, ripe stone fruit, long sweet finish.",
      steepingInstructions: "Rinse the leaves once, then brew with fully boiling water. Start short and add a few seconds each steep to coax out the roast and minerality.",
      foodPairings: "Dark chocolate, roasted nuts, dim sum.",
      image: "",
      dateAdded: "2026-06-22"
    },
    {
      id: "seed-sheng",
      name: "Bulang Sheng Puerh",
      nameZh: "布朗生普",
      keywords: ["Bold", "Floral", "Bitter-sweet", "Thick"],
      type: "Sheng Puerh",
      origin: "Bulang Mountain, Yunnan",
      vendor: "",
      year: 2019,
      quantityGrams: 100,
      gongfu: { waterTempC: 95, waterTempMaxC: null, leafGrams: 7, vesselMl: 100, rinse: true, steeps: [8, 10, 12, 15, 20, 30, 45] },
      tastingNotes: "Bold, bitter-sweet huigan, floral high notes, thick mouthfeel.",
      steepingInstructions: "Rinse briefly to wake the leaves. Use quick early steeps to manage bitterness, lengthening gradually as the tea opens.",
      foodPairings: "Sticky rice, grilled meats, citrus.",
      image: "",
      dateAdded: "2026-06-22"
    }
  ];

  /* ---------- Storage layer (file-backed via /catalog API) ---------- */
  let catalog = [];
  let readOnly = false;

  async function load() {
    try {
      const res = await fetch("/catalog");
      if (res.ok) {
        const parsed = await res.json();
        if (parsed.length > 0) {
          let dirty = false;
          catalog = parsed.map((t) => {
            if (!t.id) { dirty = true; return { ...t, id: uid() }; }
            return t;
          });
          if (dirty) save();
          return;
        }
        // Server file is empty — check localStorage for data to migrate
        const local = localStorage.getItem("teaCatalog");
        if (local) {
          try {
            const migrated = JSON.parse(local);
            if (Array.isArray(migrated) && migrated.length > 0) {
              catalog = migrated.map((t) => ({ ...t, id: t.id || uid() }));
              save();
              localStorage.removeItem("teaCatalog");
              return;
            }
          } catch (_) { /* ignore malformed data */ }
        }
        // Truly empty first run — seed defaults
        catalog = SEED.slice();
        save();
      } else {
        catalog = SEED.slice();
      }
    } catch (e) {
      console.error("Failed to load catalog:", e);
      catalog = SEED.slice();
    }
  }

  function save() {
    fetch("/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(catalog)
    }).then(() => flashSaved()).catch((e) => console.error("Failed to save catalog:", e));
  }

  function flashSaved() {
    const el = $("#savedindicator");
    if (!el) return;
    el.classList.add("visible");
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove("visible"), 1500);
  }

  // Final flush on page close — sendBeacon is guaranteed to fire even during unload
  window.addEventListener("beforeunload", () => {
    navigator.sendBeacon("/catalog", new Blob([JSON.stringify(catalog)], { type: "application/json" }));
  });

  function uid() {
    return "tea-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
  }

  /* ---------- DOM refs ---------- */
  const $ = (sel) => document.querySelector(sel);
  const grid = $("#grid");
  const emptyState = $("#emptyState");
  const searchInput = $("#searchInput");
  const typeFilter = $("#typeFilter");
  const sortSelect = $("#sortSelect");
  const countLabel = $("#countLabel");

  const formOverlay = $("#formOverlay");
  const detailOverlay = $("#detailOverlay");
  const detailBody = $("#detailBody");
  const teaForm = $("#teaForm");
  const formTitle = $("#formTitle");
  const steepsList = $("#steepsList");
  const deleteBtn = $("#deleteBtn");

  /* ---------- Helpers ---------- */
  function fmtDate(iso) {
    if (!iso) return "";
    const [y, m, d] = iso.split("-").map(Number);
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const thisYear = new Date().getFullYear();
    return months[m - 1] + " " + d + (y !== thisYear ? ", " + y : "");
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function ratioPer100(g) {
    const tea = g;
    if (!tea.gongfu || !tea.gongfu.leafGrams || !tea.gongfu.vesselMl) return null;
    return (tea.gongfu.leafGrams / tea.gongfu.vesselMl) * 100;
  }

  function fmtSeconds(total) {
    const m = Math.floor(total / 60);
    const s = total % 60;
    return (m > 0 ? m + ":" + String(s).padStart(2, "0") : s + "s");
  }

  function clockFmt(total) {
    const m = Math.floor(total / 60);
    const s = total % 60;
    return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }

  /* ---------- Type filter population ---------- */
  function refreshTypeFilter() {
    const current = typeFilter.value;
    const types = Array.from(new Set(catalog.map((t) => t.type).filter(Boolean))).sort();
    typeFilter.innerHTML = '<option value="">All types</option>' +
      types.map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("");
    if (types.includes(current)) typeFilter.value = current;
  }

  /* ---------- Render catalog ---------- */
  function render() {
    const q = searchInput.value.trim().toLowerCase();
    const typeF = typeFilter.value;

    const filtered = catalog.filter((t) => {
      if (typeF && t.type !== typeF) return false;
      if (!q) return true;
      return [t.name, t.origin, t.vendor, t.type, t.tastingNotes, t.foodPairings]
        .some((v) => v && String(v).toLowerCase().includes(q));
    });

    countLabel.textContent = `${filtered.length} of ${catalog.length} tea${catalog.length === 1 ? "" : "s"}`;
    emptyState.hidden = catalog.length !== 0;

    grid.innerHTML = filtered
      .slice()
      .sort((a, b) => {
        const s = sortSelect.value;
        if (s === "qty") {
          const qa = a.quantityGrams ?? Infinity;
          const qb = b.quantityGrams ?? Infinity;
          return qa !== qb ? qa - qb : a.name.localeCompare(b.name);
        }
        if (s === "recent") {
          const da = a.lastEnjoyed || "0";
          const db = b.lastEnjoyed || "0";
          return db.localeCompare(da);
        }
        return a.name.localeCompare(b.name);
      })
      .map((t) => {
        const r = ratioPer100(t);
        const temp = t.gongfu && t.gongfu.waterTempC != null ? t.gongfu.waterTempC + "°C" : "—";
        const ratioStr = r ? r.toFixed(1) + " g/100ml" : "—";
        const steeps = t.gongfu && t.gongfu.steeps ? t.gongfu.steeps.length : 0;
        const yearStr = [t.season, t.year].filter(Boolean).join(" ");
        const metaBits = [t.origin, yearStr].filter(Boolean).join(" · ");
        const isSel = selected.has(t.id);
        const cls = "card" + (selectMode ? " selecting" : "") + (isSel ? " selected" : "");
        const check = selectMode ? `<input type="checkbox" class="card-check" ${isSel ? "checked" : ""} />` : "";
        return `
          <article class="${cls}" data-id="${escapeHtml(t.id)}">
            ${check}
            <div class="card-top">
              <div class="card-name">
                <h3>${escapeHtml(t.name)}</h3>
                ${t.nameZh ? `<span class="card-zh">${escapeHtml(t.nameZh)}</span>` : ""}
              </div>
              <span class="type-pill">${escapeHtml(t.type || "—")}</span>
            </div>
            ${metaBits ? `<div class="card-meta">${escapeHtml(metaBits)}</div>` : ""}
            <div class="card-brew">
              <span><b>${temp}</b></span>
              <span><b>${ratioStr}</b></span>
              <span><b>${steeps}</b> steep${steeps === 1 ? "" : "s"}</span>
            </div>
            ${t.quantityGrams != null ? `<div class="card-qty${t.quantityGrams <= 10 ? " low" : ""}">${t.quantityGrams} g left</div>` : ""}
          </article>`;
      })
      .join("");

    if (selectMode) updateSelectionUI();
  }

  /* ---------- Detail view ---------- */
  let activeTimer = null;
  let detailTea = null;

  function openDetail(id) {
    const t = catalog.find((x) => x.id === id);
    if (!t) return;
    detailTea = t;
    stopTimer();

    const r = ratioPer100(t);
    const g = t.gongfu || {};
    const yearStr = [t.season, t.year].filter(Boolean).join(" ");
    const invBits = [
      t.vendor ? `Vendor: ${escapeHtml(t.vendor)}` : "",
      yearStr ? `Harvest: ${escapeHtml(yearStr)}` : "",
      t.sessionCount ? `Enjoyed: ${t.sessionCount}×` : "",
      t.lastEnjoyed ? `Last session: ${fmtDate(t.lastEnjoyed)}` : ""
    ].filter(Boolean).join(" &nbsp;·&nbsp; ");

    const steeps = Array.isArray(g.steeps) ? g.steeps : [];

    detailBody.innerHTML = `
      <div class="detail-head">
        <h2>${escapeHtml(t.name)}</h2>
        <span class="type-pill">${escapeHtml(t.type || "—")}</span>
      </div>
      <p class="detail-sub">${escapeHtml(t.origin || "Unknown origin")}</p>

      <div class="detail-section">
        <h4>Brew parameters</h4>
        <div class="stat-row">
          <div class="stat"><span class="num">${g.waterTempC != null ? g.waterTempC + "°C" : "—"}</span><span class="lbl">Water temp</span></div>
          <div class="stat"><span class="num">${g.leafGrams != null ? g.leafGrams + " g" : "—"}</span><span class="lbl">Leaf</span></div>
          <div class="stat"><span class="num">${g.vesselMl != null ? g.vesselMl + " ml" : "—"}</span><span class="lbl">Vessel</span></div>
          <div class="stat"><span class="num">${r ? r.toFixed(1) : "—"}</span><span class="lbl">g per 100ml</span></div>
          <div class="stat"><span class="num">${g.rinse ? "Yes" : "No"}</span><span class="lbl">Rinse</span></div>
        </div>
      </div>

      <div class="detail-section">
        <h4>Steep timer</h4>
        ${steeps.length ? `
          <div class="timer-steeps" id="timerSteeps">
            ${steeps.map((sec, i) => `<button class="steep-btn" data-step="${i}" data-sec="${sec}">${i + 1}<small>${fmtSeconds(sec)}</small></button>`).join("")}
          </div>
          <div class="timer-display">
            <div class="timer-clock" id="timerClock">00:00</div>
            <div class="timer-meta" id="timerMeta">Tap a steep to start.</div>
            <div class="timer-controls">
              <button class="btn btn-small" id="timerStop">Stop</button>
            </div>
          </div>
        ` : `<p class="hint">No steep schedule set for this tea.</p>`}
      </div>

      <div class="detail-section">
        <h4>Inventory</h4>
        ${invBits ? `<div class="notes-text" style="margin-bottom:8px">${invBits}</div>` : ""}
        <div class="inv-qty-row">
          <span>Remaining</span>
          ${!readOnly
            ? `<input type="number" id="detailQtyInput" class="qty-inline" value="${t.quantityGrams != null ? t.quantityGrams : ""}" min="0" step="1" placeholder="—" />`
            : `<strong>${t.quantityGrams != null ? t.quantityGrams + " g" : "—"}</strong>`}
          ${!readOnly ? `<span>g</span>` : ""}
        </div>
      </div>

      ${t.tastingNotes ? `<div class="detail-section"><h4>Tasting notes</h4><div class="notes-text">${escapeHtml(t.tastingNotes)}</div></div>` : ""}

      ${t.foodPairings ? `<div class="detail-section"><h4>Food pairings</h4><div class="notes-text">${escapeHtml(t.foodPairings)}</div></div>` : ""}

      ${(t.sessionLog && t.sessionLog.length) ? `
        <div class="detail-section">
          <h4>Session log</h4>
          <div class="session-log">
            ${t.sessionLog.slice().reverse().slice(0, 5).map((entry) =>
              `<div class="log-entry">
                <span class="log-meta">${fmtDate(entry.date)}${entry.grams ? ` &nbsp;·&nbsp; ${entry.grams}g` : ""}</span>
                ${entry.note ? `<p class="log-note">${escapeHtml(entry.note)}</p>` : ""}
              </div>`
            ).join("")}
          </div>
        </div>
      ` : ""}

      <div class="detail-actions">
        ${!readOnly ? `<button class="btn btn-primary" id="enjoyBtn">Enjoy</button>` : ""}
        <button class="btn btn-ghost" id="createCardBtn">Create card</button>
        ${!readOnly ? `<button class="btn btn-ghost" id="editFromDetail">Edit</button>` : ""}
        <button class="btn btn-ghost" data-close-detail>Close</button>
      </div>
    `;

    // wire timer
    const stepsEl = detailBody.querySelector("#timerSteeps");
    if (stepsEl) {
      stepsEl.addEventListener("click", (e) => {
        const btn = e.target.closest(".steep-btn");
        if (!btn) return;
        startTimer(steeps, parseInt(btn.dataset.step, 10));
      });
      detailBody.querySelector("#timerStop").addEventListener("click", stopTimer);
    }
    const qtyInput = detailBody.querySelector("#detailQtyInput");
    if (qtyInput) {
      qtyInput.addEventListener("change", () => {
        const idx = catalog.findIndex((x) => x.id === t.id);
        if (idx === -1) return;
        const v = parseFloat(qtyInput.value);
        catalog[idx].quantityGrams = Number.isFinite(v) ? Math.max(0, +v.toFixed(1)) : null;
        save();
        render();
      });
    }

    detailBody.querySelector("#enjoyBtn")?.addEventListener("click", () => openEnjoy(t));
    detailBody.querySelector("#editFromDetail")?.addEventListener("click", () => {
      closeDetail();
      openForm(t);
    });
    detailBody.querySelector("#createCardBtn").addEventListener("click", () => openCard(t));

    detailOverlay.hidden = false;
    document.body.classList.add("detail-open");
  }

  function closeDetail() {
    stopTimer();
    detailTea = null;
    detailOverlay.hidden = true;
    document.body.classList.remove("detail-open");
  }

  /* ---------- Steep timer ---------- */
  function stopTimer() {
    if (activeTimer && activeTimer.interval) clearInterval(activeTimer.interval);
    activeTimer = null;
    const clock = document.querySelector("#timerClock");
    if (clock) clock.classList.remove("ringing");
    document.querySelectorAll(".steep-btn.active").forEach((b) => b.classList.remove("active"));
  }

  function startTimer(steeps, stepIndex) {
    stopTimer();
    const clock = document.querySelector("#timerClock");
    const meta = document.querySelector("#timerMeta");
    if (!clock) return;

    let remaining = steeps[stepIndex];
    activeTimer = { interval: null, remaining, stepIndex };

    const buttons = document.querySelectorAll(".steep-btn");
    buttons.forEach((b, i) => {
      b.classList.toggle("active", i === stepIndex);
      b.classList.toggle("done", i < stepIndex);
    });

    const update = () => {
      clock.textContent = clockFmt(remaining);
      meta.textContent = `Steep ${stepIndex + 1} of ${steeps.length} — ${fmtSeconds(steeps[stepIndex])}`;
    };
    update();

    activeTimer.interval = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(activeTimer.interval);
        clock.textContent = "00:00";
        clock.classList.add("ringing");
        const next = stepIndex + 1 < steeps.length;
        meta.textContent = next
          ? `Done! Tap steep ${stepIndex + 2} for the next infusion.`
          : "Done! That was the last suggested steep.";
        beep();
        // mark current done
        const cur = document.querySelector(`.steep-btn[data-step="${stepIndex}"]`);
        if (cur) { cur.classList.remove("active"); cur.classList.add("done"); }
        return;
      }
      activeTimer.remaining = remaining;
      update();
    }, 1000);
  }

  function beep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const gain = ctx.createGain();
      o.connect(gain); gain.connect(ctx.destination);
      o.type = "sine"; o.frequency.value = 660;
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
      o.start();
      o.stop(ctx.currentTime + 0.95);
    } catch (e) { /* audio not available — ignore */ }
  }

  /* ---------- Form (add / edit) ---------- */
  function steepChip(value, index) {
    const wrap = document.createElement("div");
    wrap.className = "steep-chip";
    wrap.innerHTML = `
      <span class="idx">${index + 1}</span>
      <input type="number" min="1" value="${value}" />
      <button type="button" class="rm" aria-label="Remove steep">×</button>`;
    wrap.querySelector(".rm").addEventListener("click", () => {
      wrap.remove();
      reindexSteeps();
    });
    return wrap;
  }

  function reindexSteeps() {
    steepsList.querySelectorAll(".steep-chip .idx").forEach((el, i) => { el.textContent = i + 1; });
  }

  function setSteeps(arr) {
    steepsList.innerHTML = "";
    (arr && arr.length ? arr : [10, 15, 20, 30]).forEach((v, i) => steepsList.appendChild(steepChip(v, i)));
  }

  function getSteeps() {
    return Array.from(steepsList.querySelectorAll(".steep-chip input"))
      .map((inp) => parseInt(inp.value, 10))
      .filter((n) => Number.isFinite(n) && n > 0);
  }

  /* ---------- Leaf photo (stored as a downscaled data URL) ---------- */
  let formPhoto = "";

  function setFormPhoto(dataUrl) {
    formPhoto = dataUrl || "";
    const prev = $("#photoPreview");
    prev.style.backgroundImage = formPhoto ? `url("${formPhoto}")` : "";
    $("#clearPhotoBtn").hidden = !formPhoto;
  }

  function downscaleImage(file, maxDim) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("read failed"));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("decode failed"));
        img.onload = () => {
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);
          const canvas = document.createElement("canvas");
          canvas.width = w; canvas.height = h;
          canvas.getContext("2d").drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", 0.82));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  $("#f-photo").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setFormPhoto(await downscaleImage(file, 360));
    } catch (err) {
      alert("Could not load that image.");
    }
    e.target.value = "";
  });
  $("#clearPhotoBtn").addEventListener("click", () => setFormPhoto(""));

  function openForm(tea) {
    teaForm.reset();
    const editing = !!tea;
    formTitle.textContent = editing ? "Edit Tea" : "Add Tea";
    deleteBtn.hidden = !editing;

    $("#teaId").value = editing ? tea.id : "";
    $("#f-name").value = editing ? tea.name || "" : "";
    $("#f-nameZh").value = editing ? tea.nameZh || "" : "";
    $("#f-keywords").value = editing && Array.isArray(tea.keywords) ? tea.keywords.join(", ") : "";
    $("#f-type").value = editing ? (tea.type || "Oolong") : "Oolong";
    $("#f-origin").value = editing ? tea.origin || "" : "";
    $("#f-vendor").value = editing ? tea.vendor || "" : "";
    $("#f-season").value = editing ? (tea.season || "") : "";
    $("#f-year").value = editing && tea.year != null ? tea.year : "";
    $("#f-qty").value = editing && tea.quantityGrams != null ? tea.quantityGrams : "";

    const g = (editing && tea.gongfu) ? tea.gongfu : {};
    $("#f-temp").value = g.waterTempC != null ? g.waterTempC : "";
    $("#f-tempMax").value = g.waterTempMaxC != null ? g.waterTempMaxC : "";
    $("#f-leaf").value = g.leafGrams != null ? g.leafGrams : "";
    $("#f-vessel").value = g.vesselMl != null ? g.vesselMl : 100;
    $("#f-rinse").checked = !!g.rinse;
    setSteeps(g.steeps);

    $("#f-notes").value = editing ? tea.tastingNotes || "" : "";
    $("#f-steepInstr").value = editing ? tea.steepingInstructions || "" : "";
    $("#f-food").value = editing ? tea.foodPairings || "" : "";

    setFormPhoto(editing ? (tea.image || "") : "");

    formOverlay.hidden = false;
    $("#f-name").focus();
  }

  function closeForm() { formOverlay.hidden = true; }

  function numOrNull(v) {
    if (v === "" || v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  let submitting = false;
  teaForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (submitting) return;          // ignore rapid double-submits
    submitting = true;
    setTimeout(() => { submitting = false; }, 50);
    const id = $("#teaId").value || uid();
    const existing = catalog.find((t) => t.id === id);

    const keywords = $("#f-keywords").value.split(",").map((s) => s.trim()).filter(Boolean);

    const record = {
      id,
      name: $("#f-name").value.trim(),
      nameZh: $("#f-nameZh").value.trim(),
      keywords,
      type: $("#f-type").value,
      origin: $("#f-origin").value.trim(),
      vendor: $("#f-vendor").value.trim(),
      season: $("#f-season").value || null,
      year: numOrNull($("#f-year").value),
      quantityGrams: numOrNull($("#f-qty").value),
      gongfu: {
        waterTempC: numOrNull($("#f-temp").value),
        waterTempMaxC: numOrNull($("#f-tempMax").value),
        leafGrams: numOrNull($("#f-leaf").value),
        vesselMl: numOrNull($("#f-vessel").value),
        rinse: $("#f-rinse").checked,
        steeps: getSteeps()
      },
      tastingNotes: $("#f-notes").value.trim(),
      steepingInstructions: $("#f-steepInstr").value.trim(),
      foodPairings: $("#f-food").value.trim(),
      image: formPhoto || "",
      dateAdded: existing ? existing.dateAdded : new Date().toISOString().slice(0, 10)
    };

    if (!record.name) return;

    if (existing) {
      Object.assign(existing, record);
    } else {
      catalog.push(record);
    }
    save();
    refreshTypeFilter();
    render();
    closeForm();
  });

  deleteBtn.addEventListener("click", () => {
    const id = $("#teaId").value;
    if (!id) return;
    const t = catalog.find((x) => x.id === id);
    if (!confirm(`Delete "${t ? t.name : "this tea"}" from your catalog?`)) return;
    catalog = catalog.filter((x) => x.id !== id);
    save();
    refreshTypeFilter();
    render();
    closeForm();
  });

  /* ---------- Export / Import ---------- */
  function exportJSON() {
    const blob = new Blob([JSON.stringify(catalog, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tea-catalog.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function normalizeTeas(data) {
    return data.map((t) => ({ ...t, id: t.id || uid() }));
  }

  function applyImport(data) {
    const normalized = normalizeTeas(data);
    const mode = catalog.length
      ? (confirm("Merge with your current catalog?\n\nOK = merge, Cancel = replace everything.") ? "merge" : "replace")
      : "replace";
    if (mode === "replace") {
      catalog = normalized;
    } else {
      const byId = new Map(catalog.map((t) => [t.id, t]));
      normalized.forEach((t) => byId.set(t.id, t));
      catalog = Array.from(byId.values());
    }
    save();
    refreshTypeFilter();
    render();
    return normalized.length;
  }

  /* ---------- Event wiring ---------- */
  // + Add Tea dropdown (Manual / AI / Import)
  const addBtn = $("#addBtn");
  const addDropdown = $("#addDropdown");
  addBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    addDropdown.hidden = !addDropdown.hidden;
  });
  document.addEventListener("click", () => { addDropdown.hidden = true; });

  $("#addManualBtn").addEventListener("click", () => { addDropdown.hidden = true; openForm(null); });
  $("#exportBtn").addEventListener("click", () => { addDropdown.hidden = true; exportJSON(); });

  // Unified AI modal (prompt + paste)
  const aiOverlay = $("#aiOverlay");
  const promptText = $("#promptText");
  promptText.value = AI_PROMPT;

  $("#promptBtn").addEventListener("click", () => {
    addDropdown.hidden = true;
    aiOverlay.hidden = false;
    promptText.scrollTop = 0;
  });
  aiOverlay.addEventListener("click", (e) => {
    if (e.target === aiOverlay || e.target.closest("[data-close-ai]")) {
      aiOverlay.hidden = true;
    }
  });

  $("#copyPromptBtn").addEventListener("click", async () => {
    const btn = $("#copyPromptBtn");
    try {
      await navigator.clipboard.writeText(AI_PROMPT);
    } catch (e) {
      promptText.select();
      document.execCommand("copy");
    }
    const old = btn.textContent;
    btn.textContent = "Copied ✓";
    setTimeout(() => { btn.textContent = old; }, 1500);
  });

  $("#pasteImportBtn").addEventListener("click", () => {
    let raw = $("#pasteInput").value.trim();
    raw = raw.replace(/^```[a-z]*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
    try {
      const data = JSON.parse(raw);
      if (!Array.isArray(data)) throw new Error("Expected a JSON array of teas.");
      const n = applyImport(data);
      aiOverlay.hidden = true;
      $("#pasteInput").value = "";
      alert(`Imported ${n} tea(s). Catalog now has ${catalog.length}.`);
    } catch (err) {
      alert("Could not parse that JSON.\n\n" + err.message + "\n\nMake sure you copied the full reply including the [ ] brackets.");
    }
  });

  $("#addSteepBtn").addEventListener("click", () => {
    const inputs = steepsList.querySelectorAll(".steep-chip input");
    const last = inputs.length ? parseInt(inputs[inputs.length - 1].value, 10) || 20 : 20;
    steepsList.appendChild(steepChip(last + 10, steepsList.children.length));
  });

  searchInput.addEventListener("input", render);
  typeFilter.addEventListener("change", render);
  sortSelect.addEventListener("change", render);

  grid.addEventListener("click", (e) => {
    const pill = e.target.closest(".type-pill");
    if (pill && pill.closest(".card")) {
      typeFilter.value = pill.textContent.trim();
      render();
      return;
    }
    const card = e.target.closest(".card");
    if (!card) return;
    const id = card.dataset.id;
    if (selectMode) {
      if (selected.has(id)) selected.delete(id);
      else selected.add(id);
      card.classList.toggle("selected", selected.has(id));
      const cb = card.querySelector(".card-check");
      if (cb) cb.checked = selected.has(id);
      updateSelectionUI();
    } else {
      openDetail(id);
    }
  });

  // overlay close handlers (backdrop click + × + buttons)
  formOverlay.addEventListener("click", (e) => {
    if (e.target === formOverlay || e.target.closest("[data-close-form]")) closeForm();
  });
  detailOverlay.addEventListener("click", (e) => {
    if (e.target === detailOverlay || e.target.closest("[data-close-detail]")) closeDetail();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === " " && !detailOverlay.hidden && detailTea && enjoyOverlay.hidden && formOverlay.hidden) {
      e.preventDefault();
      const steeps = detailTea.gongfu && Array.isArray(detailTea.gongfu.steeps) ? detailTea.gongfu.steeps : [];
      if (!steeps.length) return;
      if (activeTimer) {
        stopTimer();
      } else {
        const done = document.querySelectorAll(".steep-btn.done").length;
        startTimer(steeps, Math.min(done, steeps.length - 1));
      }
      return;
    }
    if (e.key === "Escape") {
      if (!cardOverlay.hidden) cardOverlay.hidden = true;
      else if (!aiOverlay.hidden) aiOverlay.hidden = true;
      else if (!enjoyOverlay.hidden) closeEnjoy();
      else if (!formOverlay.hidden) closeForm();
      else if (!detailOverlay.hidden) closeDetail();
    }
  });

  /* ---------- Enjoy modal ---------- */
  const enjoyOverlay = $("#enjoyOverlay");
  let enjoyTea = null;
  let enjoyMult = 1;

  function openEnjoy(t) {
    enjoyTea = t;
    enjoyMult = 1;
    renderEnjoyBody();
    enjoyOverlay.hidden = false;
  }

  function closeEnjoy() { enjoyOverlay.hidden = true; }

  function renderEnjoyBody() {
    const t = enjoyTea;
    const g = t.gongfu || {};
    const baseLeaf = g.leafGrams != null ? +g.leafGrams : null;
    const leaf = baseLeaf != null ? +(baseLeaf * enjoyMult).toFixed(1) : null;
    const remaining = (t.quantityGrams != null && t.quantityGrams !== "") ? +t.quantityGrams : null;
    const afterUse = (remaining != null && leaf != null) ? +(remaining - leaf).toFixed(1) : null;
    const insufficient = afterUse != null && afterUse < 0;

    const multOptions = [
      { v: 0.5, label: "½×", sub: "Half" },
      { v: 1,   label: "1×", sub: "Standard" },
      { v: 1.5, label: "1½×", sub: "Sharing" },
      { v: 2,   label: "2×", sub: "Full pot" },
    ];

    const multBtns = multOptions.map(({ v, label, sub }) =>
      `<button class="mult-btn${v === enjoyMult ? " active" : ""}" data-mult="${v}">
        <span class="mult-label">${label}</span>
        <span class="mult-sub">${sub}</span>
      </button>`
    ).join("");

    document.getElementById("enjoyBody").innerHTML = `
      <div class="enjoy-head">
        <h2>${escapeHtml(t.name)}</h2>
        ${t.nameZh ? `<span class="enjoy-zh">${escapeHtml(t.nameZh)}</span>` : ""}
        <span class="type-pill" style="align-self:center">${escapeHtml(t.type || "—")}</span>
      </div>

      <div class="mult-row">${multBtns}</div>

      <div class="enjoy-params">
        <div class="enjoy-stat"><span class="num">${leaf != null ? leaf + " g" : "—"}</span><span class="lbl">Leaf</span></div>
        ${g.vesselMl != null ? `<div class="enjoy-stat"><span class="num">${g.vesselMl} ml</span><span class="lbl">Vessel</span></div>` : ""}
        ${g.waterTempC != null ? `<div class="enjoy-stat"><span class="num">${g.waterTempC}°C</span><span class="lbl">Temp</span></div>` : ""}
      </div>

      <div class="enjoy-inventory">
        ${remaining != null ? `
          <div class="inv-row"><span>Current stock</span><strong>${remaining} g</strong></div>
          ${leaf != null ? `<div class="inv-row${insufficient ? " inv-low" : " inv-ok"}">
            <span>After this session</span>
            <strong>${insufficient ? "Not enough stock!" : afterUse + " g remaining"}</strong>
          </div>` : ""}
        ` : `<p class="hint" style="margin:0">No inventory tracked — add a quantity in Edit to enable deduction.</p>`}
      </div>

      <div class="enjoy-note">
        <label class="enjoy-note-lbl" for="enjoyNote">Session note (optional)</label>
        <textarea id="enjoyNote" rows="2" placeholder="Water felt a bit hot, added 5s extra…"></textarea>
      </div>

      <div class="form-actions">
        <span class="spacer"></span>
        <button class="btn btn-ghost" data-close-enjoy>Cancel</button>
        <button class="btn btn-primary" id="enjoyDeductBtn"${!leaf || insufficient || remaining == null ? " disabled" : ""}>
          Enjoy${leaf ? " — deduct " + leaf + "g" : ""}
        </button>
      </div>
    `;

    document.getElementById("enjoyBody").querySelectorAll(".mult-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        enjoyMult = parseFloat(btn.dataset.mult);
        renderEnjoyBody();
      });
    });

    const deductBtn = document.getElementById("enjoyDeductBtn");
    if (deductBtn && !deductBtn.disabled) {
      deductBtn.addEventListener("click", () => {
        const idx = catalog.findIndex((x) => x.id === enjoyTea.id);
        if (idx !== -1) {
          const note = (document.getElementById("enjoyNote")?.value || "").trim();
          const today = new Date().toISOString().slice(0, 10);
          catalog[idx].quantityGrams = Math.max(0, +(catalog[idx].quantityGrams - leaf).toFixed(1));
          catalog[idx].sessionCount = (catalog[idx].sessionCount || 0) + 1;
          catalog[idx].lastEnjoyed = today;
          if (!Array.isArray(catalog[idx].sessionLog)) catalog[idx].sessionLog = [];
          catalog[idx].sessionLog.push({ date: today, grams: leaf, note });
          save();
          render();
        }
        closeEnjoy();
        openDetail(enjoyTea.id);
      });
    }
  }

  enjoyOverlay.addEventListener("click", (e) => {
    if (e.target === enjoyOverlay || e.target.closest("[data-close-enjoy]")) closeEnjoy();
  });

  /* ---------- Type illustration placeholders ---------- */
  const TYPE_CHARS = {
    "Green": "绿", "White": "白", "Yellow": "黄", "Oolong": "乌",
    "Black": "红", "Sheng Puerh": "生", "Shou Puerh": "熟",
    "Dark/Hei": "黑", "Herbal": "草", "Other": "茶",
  };
  function typeImageUrl(type) {
    const ch = TYPE_CHARS[type] || "茶";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 150"><rect width="150" height="150" fill="#e8ddd0"/><text x="75" y="97" text-anchor="middle" font-size="58" fill="#c4aa88" font-family="serif">${ch}</text></svg>`;
    return "data:image/svg+xml," + encodeURIComponent(svg);
  }

  /* ---------- Tea card (printable label) ---------- */
  function tempStr(g) {
    if (!g || g.waterTempC == null) return "";
    const c1 = g.waterTempC, f1 = Math.round(c1 * 9 / 5 + 32);
    if (g.waterTempMaxC != null && g.waterTempMaxC !== c1) {
      const c2 = g.waterTempMaxC, f2 = Math.round(c2 * 9 / 5 + 32);
      return `${c1}-${c2}°C / ${f1}-${f2}°F`;
    }
    return `${c1}°C / ${f1}°F`;
  }

  function buildCardHTML(t) {
    const g = t.gongfu || {};
    const steeps = Array.isArray(g.steeps) ? g.steeps : [];
    const vessel = g.vesselMl || 100;
    const leaf = g.leafGrams;

    const kw = (t.keywords || []).slice(0, 4)
      .map((k) => `<span>${escapeHtml(k)}</span>`).join("");

    const rows = [];
    if (t.type) rows.push(["🍃", escapeHtml(t.type)]);
    const harvestStr = [t.season, t.year].filter(Boolean).join(" ");
    if (harvestStr) rows.push(["📅", escapeHtml(harvestStr)]);
    if (t.origin) rows.push(["📍", escapeHtml(t.origin)]);
    if (t.vendor) rows.push(["🏪", escapeHtml(t.vendor)]);
    const temp = tempStr(g);
    if (temp) rows.push(["🌡️", temp]);

    if (steeps.length) {
      const lo = Math.min(...steeps), hi = Math.max(...steeps);
      const leafStr = leaf != null ? ` (${leaf}g of tea)` : "";
      const timeLines = [];
      if (g.rinse) timeLines.push("1<sup>st</sup> Steep (Wash): brief rinse, optional");
      timeLines.push(`Gaiwan (${vessel}ml): ${lo}-${hi} seconds${leafStr}`);
      rows.push(["⏱️", timeLines.join("<br>")]);
    }
    if (steeps.length) rows.push(["🍵", `${steeps.length} steeps in ${vessel}ml gaiwan`]);

    const rowsHtml = rows.map(([ico, txt]) =>
      `<div class="tc-row"><span class="tc-ico">${ico}</span><span>${txt}</span></div>`).join("");

    const instr = t.steepingInstructions || t.tastingNotes || "";

    const photo = `<div class="tc-photo" style="background-image:url('${t.image || typeImageUrl(t.type)}')"></div>`;

    return `
      <div class="tea-card">
        <div class="tc-grid">
          <div class="tc-left">
            <div class="tc-rule"></div>
            ${kw ? `<div class="tc-keywords">${kw}</div>` : ""}
            ${photo}
          </div>
          <div class="tc-title">
            <div class="tc-zh">${escapeHtml(t.nameZh || t.name)}</div>
            ${t.name ? `<div class="tc-en">${escapeHtml(t.name)}</div>` : ""}
          </div>
        </div>
        <div class="tc-rows">${rowsHtml}</div>
        ${instr ? `<div class="tc-instr"><h4>Steeping instructions:</h4><p>${escapeHtml(instr)}</p></div>` : ""}
        ${t.foodPairings ? `<div class="tc-pairings"><span>Pairs with:</span> ${escapeHtml(t.foodPairings)}</div>` : ""}
        <div class="tc-watermark">茶</div>
      </div>`;
  }

  const cardOverlay = $("#cardOverlay");
  function openCard(t) {
    closeDetail();
    closeEnjoy();
    $("#cardRender").innerHTML = buildCardHTML(t);
    cardOverlay.hidden = false;
  }
  cardOverlay.addEventListener("click", (e) => {
    if (e.target === cardOverlay || e.target.closest("[data-close-card]")) cardOverlay.hidden = true;
  });
  $("#printCardBtn").addEventListener("click", () => window.print());

  /* ---------- Selection mode (bulk delete) ---------- */
  let selectMode = false;
  const selected = new Set();
  const selectionBar = $("#selectionBar");

  function enterSelect() {
    selectMode = true;
    selected.clear();
    selectionBar.hidden = false;
    $("#selectBtn").textContent = "Selecting…";
    render();
  }
  function exitSelect() {
    selectMode = false;
    selected.clear();
    selectionBar.hidden = true;
    $("#selectBtn").textContent = "Select";
    render();
  }
  function updateSelectionUI() {
    const n = selected.size;
    $("#selCount").textContent = `${n} selected`;
    $("#deleteSelectedBtn").disabled = n === 0;
    const visibleIds = Array.from(grid.querySelectorAll(".card")).map((c) => c.dataset.id);
    $("#selectAll").checked = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  }

  $("#selectBtn").addEventListener("click", () => (selectMode ? exitSelect() : enterSelect()));
  $("#cancelSelectBtn").addEventListener("click", exitSelect);
  $("#selectAll").addEventListener("change", (e) => {
    const visibleIds = Array.from(grid.querySelectorAll(".card")).map((c) => c.dataset.id);
    if (e.target.checked) visibleIds.forEach((id) => selected.add(id));
    else visibleIds.forEach((id) => selected.delete(id));
    render();
  });
  $("#deleteSelectedBtn").addEventListener("click", () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} tea(s) from your catalog?`)) return;
    catalog = catalog.filter((t) => !selected.has(t.id));
    save();
    refreshTypeFilter();
    exitSelect();
  });

  /* ---------- Init ---------- */
  (async () => {
    const [modeRes] = await Promise.all([fetch("/mode").catch(() => null), load()]);
    if (modeRes && modeRes.ok) {
      const m = await modeRes.json();
      readOnly = !!m.readOnly;
    }
    if (readOnly) applyReadOnly();
    refreshTypeFilter();
    render();
  })();

  function applyReadOnly() {
    // Hide all edit controls
    $("#addBtn").hidden = true;
    $("#selectBtn").hidden = true;
    // Banner so the viewer knows why
    const banner = document.createElement("div");
    banner.className = "readonly-banner";
    banner.textContent = "Viewing in read-only mode";
    document.querySelector(".controls").prepend(banner);
  }
})();

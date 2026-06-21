/***********************
 * CONFIG
 ***********************/
const DAYS_FULL = ["Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi","Pazar"];
const DAY_ORDER = new Map(DAYS_FULL.map((d,i)=>[d,i]));
const PX_PER_MIN = 1.4;
const FALLBACK_START = "08:00";
const FALLBACK_END   = "18:00";

/***********************
 * STATE
 ***********************/
let sectionsA = [];
let sectionsB = [];
let coursesData = {};              // rootCode -> { name, sections[] }
let selectedSections = new Set();  // seçili şubeler
let showWeekend = false;
let hideEmpty = true;
let timelineStartMin = hhmmToMin(FALLBACK_START);
let timelineEndMin   = hhmmToMin(FALLBACK_END);
let timeBoundaries = [];
let searchQuery = "";

/***********************
 * ELEMENTS
 ***********************/
const listEl = document.getElementById("course-list");
const statusText = document.getElementById("statusText");
const fileA = document.getElementById("csvA");
const fileB = document.getElementById("csvB");
const weekendToggle = document.getElementById("weekendToggle");
const hideEmptyToggle = document.getElementById("hideEmptyToggle");
const headbarEl = document.getElementById("headbar");
const calBodyEl = document.getElementById("calBody");
const calBodyWrapEl = document.querySelector(".cal-body-wrap");
const searchInput = document.getElementById("searchInput");
const clearSearchBtn = document.getElementById("clearSearch");
const exportBtn = document.getElementById("exportBtn");
const stepSelect = document.getElementById("stepSelect");

updateStatus();
buildCalendarScaffold();
setupCalendarScrollSync();

/***********************
 * UI EVENTS
 ***********************/
searchInput.addEventListener("input", () => { searchQuery = normalizeText(searchInput.value); renderList(); });
clearSearchBtn.addEventListener("click", () => { searchInput.value=""; searchQuery=""; renderList(); searchInput.focus(); });

weekendToggle.addEventListener("change", (e) => {
  showWeekend = e.target.checked;
  buildCalendarScaffold();
  recomputeTimeline();
  renderEvents();
});

hideEmptyToggle.addEventListener("change", (e) => {
  hideEmpty = e.target.checked;
  renderList();
  recomputeTimeline();
  renderEvents();
});

fileA.addEventListener("change", async (e) => {
  const f = e.target.files && e.target.files[0]; if(!f) return;
  const rows = await parseCsvFile(f);
  sectionsA = normalizeRowsToSections(rows, "Bölüm-1");
  rebuildMergedData();
});

fileB.addEventListener("change", async (e) => {
  const f = e.target.files && e.target.files[0]; if(!f) return;
  const rows = await parseCsvFile(f);
  sectionsB = normalizeRowsToSections(rows, "Bölüm-2");
  rebuildMergedData();
});

exportBtn.addEventListener("click", () => exportCalendarLikeXlsxSideBySideConflicts());

function refreshExportButton(){ exportBtn.disabled = selectedSections.size === 0; }

function setupCalendarScrollSync() {
  if (!calBodyWrapEl || !headbarEl) return;
  const sync = () => {
    headbarEl.style.transform = `translateX(${-calBodyWrapEl.scrollLeft}px)`;
  };
  calBodyWrapEl.addEventListener("scroll", sync);
  sync();
}

/***********************
 * CSV PARSE
 ***********************/
function parseCsvFile(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true, skipEmptyLines: true, encoding: "UTF-8",
      complete: (results) => resolve(results.data),
      error: (err) => reject(err)
    });
  });
}

/***********************
 * NORMALIZE
 ***********************/
function normalizeRowsToSections(rows, sourceTag) {
  const pick = (row, candidates) => {
    for (const key of candidates) {
      if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "") {
        return String(row[key]).trim();
      }
    }
    return "";
  };
  const guessScheduleKey = (row) => Object.keys(row).find(k => k.includes("Gün") && k.includes("Saat")) || "";

  const sections = [];
  for (const row of rows) {
    const code = pick(row, ["Ders Kodu","Code","DersKodu","Ders Kodu "]); if (!code) continue;
    const name = pick(row, ["Ders Adı","Name","DersAdi","Ders Adı "]);
    const instructor = pick(row, ["Öğretim Elemanı","Instructor","Ogretim Elemani","Öğretim Elemanı "]);
    const scheduleKey = guessScheduleKey(row);
    const scheduleStr = scheduleKey ? String(row[scheduleKey] || "") : "";
    const scheduleParsed = parseSchedule(scheduleStr);

    sections.push({ fullCode: code, courseName: name, instructor, schedule: scheduleParsed, source: sourceTag });
  }
  return sections;
}

function parseSchedule(str) {
  const result = [];
  const regex = /(Pazartesi|Salı|Çarşamba|Perşembe|Cuma|Cumartesi|Pazar)\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\s*(?:\[(.*?)\])?/gi;
  let match;
  while ((match = regex.exec(str)) !== null) {
    result.push({ day: capitalize(match[1]), start: match[2], end: match[3], loc: match[4] || "?" });
  }
  return result;
}

/***********************
 * MERGE
 ***********************/
function rebuildMergedData() {
  selectedSections.clear();
  coursesData = {};
  const allSections = [...sectionsA, ...sectionsB];

  for (const sec of allSections) {
    const rootCode = String(sec.fullCode).split(".")[0].trim();
    if (!coursesData[rootCode]) coursesData[rootCode] = { name: (sec.courseName || "").trim(), sections: [] };
    if (!sec.courseName) sec.courseName = coursesData[rootCode].name;
    coursesData[rootCode].sections.push(sec);
  }

  updateStatus();
  renderList();
  buildCalendarScaffold();
  recomputeTimeline();
  renderEvents();
  refreshExportButton();
}

function updateStatus() {
  const aCount = sectionsA.length, bCount = sectionsB.length;
  const courseCount = Object.keys(coursesData).length;
  statusText.innerHTML = `
    <div><strong>Bölüm-1:</strong> ${aCount ? (aCount + " şube") : "yüklenmedi"}</div>
    <div><strong>Bölüm-2:</strong> ${bCount ? (bCount + " şube") : "yüklenmedi"}</div>
    <div style="margin-top:6px;"><strong>Toplam:</strong> ${courseCount} ders / ${aCount+bCount} şube</div>
    <div style="margin-top:6px;"><strong>Seçili şube:</strong> ${selectedSections.size}</div>
  `;
}

/***********************
 * LIST (arama filtreli)
 ***********************/
function renderList() {
  listEl.innerHTML = "";
  const roots = Object.keys(coursesData).sort();
  if (roots.length === 0) {
    listEl.innerHTML = `<div style="padding:20px;text-align:center;color:#999;font-size:0.9rem;">Dersleri görmek için en az 1 dosya yükleyin.</div>`;
    return;
  }

  let renderedAny = false;

  for (const root of roots) {
    const course = coursesData[root];

    if (hideEmpty) {
      const anyHasSchedule = course.sections.some(s => s.schedule && s.schedule.length > 0);
      if (!anyHasSchedule) continue;
    }

    const rootHay = normalizeText(root);
    const nameHay = normalizeText(course.name || "");
    const courseMatches = searchQuery ? (rootHay.includes(searchQuery) || nameHay.includes(searchQuery)) : true;

    const card = document.createElement("div");
    card.className = "course-card";

    const head = document.createElement("div");
    head.className = "course-header";
    head.onclick = () => card.classList.toggle("active");

    const titleWrap = document.createElement("div");
    titleWrap.className = "course-title";
    titleWrap.innerHTML = `
      <div class="code">${escapeHtml(root)}</div>
      <div class="name">${escapeHtml(course.name || "(Ders adı yok)")}</div>
    `;

    const badge = document.createElement("div");
    badge.style.fontWeight = "600";
    badge.style.fontSize = "0.75rem";
    badge.style.color = "#666";
    badge.textContent = `${course.sections.length} şube`;

    head.appendChild(titleWrap);
    head.appendChild(badge);

    const body = document.createElement("div");
    body.className = "course-sections";

    let anySectionRendered = false;

    for (const sec of course.sections) {
      if (hideEmpty && (!sec.schedule || sec.schedule.length === 0)) continue;

      const secHay = normalizeText(`${sec.fullCode} ${sec.courseName} ${sec.instructor} ${sec.source}`);
      const secMatches = searchQuery ? secHay.includes(searchQuery) : true;

      if (!courseMatches && !secMatches) continue;

      const item = document.createElement("div");
      item.className = "section-item";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = selectedSections.has(sec);

      cb.addEventListener("change", (e) => {
        if (e.target.checked) selectedSections.add(sec);
        else selectedSections.delete(sec);

        updateStatus();
        refreshExportButton();
        recomputeTimeline();
        renderEvents();
      });

      const info = document.createElement("div");
      info.className = "section-info";

      const line1 = `${sec.fullCode} — ${sec.courseName || ""}`.trim();
      const schedLine = (sec.schedule && sec.schedule.length)
        ? sec.schedule.map(s => `${s.day} ${s.start}-${s.end} [${s.loc}]`).join(" | ")
        : "Program bilgisi yok";

      info.innerHTML = `
        <strong>${escapeHtml(line1)}</strong>
        <span class="instructor">${escapeHtml(sec.instructor || "Öğretim elemanı yok")}</span>
        <span class="mini">${escapeHtml(schedLine)}</span>
        <span class="tag">Kaynak: ${escapeHtml(sec.source)}</span>
      `;

      item.appendChild(cb);
      item.appendChild(info);
      body.appendChild(item);
      anySectionRendered = true;
    }

    if (!anySectionRendered) continue;

    card.appendChild(head);
    card.appendChild(body);
    listEl.appendChild(card);
    renderedAny = true;
  }

  if (!renderedAny) {
    listEl.innerHTML = `<div style="padding:20px;text-align:center;color:#999;font-size:0.9rem;">Arama sonucu bulunamadı.</div>`;
  }
}

/***********************
 * CALENDAR UI SCAFFOLD
 ***********************/
function buildCalendarScaffold() {
  const activeDays = showWeekend ? DAYS_FULL : DAYS_FULL.slice(0, 5);

  headbarEl.innerHTML = "";
  const timeHead = document.createElement("div");
  timeHead.className = "time-col-head";
  headbarEl.appendChild(timeHead);

  for (const day of activeDays) {
    const d = document.createElement("div");
    d.className = "day-head";
    d.textContent = day;
    headbarEl.appendChild(d);
  }

  calBodyEl.innerHTML = "";
  const timeCol = document.createElement("div");
  timeCol.className = "time-col";
  timeCol.id = "timeCol";

  const daysWrap = document.createElement("div");
  daysWrap.className = "days";
  daysWrap.id = "daysWrap";

  for (const day of activeDays) {
    const col = document.createElement("div");
    col.className = "day-col";
    col.dataset.day = day;
    daysWrap.appendChild(col);
  }

  calBodyEl.appendChild(timeCol);
  calBodyEl.appendChild(daysWrap);
}

/***********************
 * DYNAMIC TIMELINE (UI)
 ***********************/
function recomputeTimeline() {
  const activeDays = showWeekend ? DAYS_FULL : DAYS_FULL.slice(0, 5);
  const sourceSections = (selectedSections.size > 0) ? Array.from(selectedSections) : getAllSections();

  const bounds = new Set();
  let minStart = Infinity, maxEnd = -Infinity;

  for (const sec of sourceSections) {
    for (const slot of (sec.schedule || [])) {
      const day = capitalize(slot.day);
      if (!activeDays.includes(day)) continue;
      const s = hhmmToMin(slot.start), e = hhmmToMin(slot.end);
      if (!(e > s)) continue;
      bounds.add(s); bounds.add(e);
      minStart = Math.min(minStart, s);
      maxEnd = Math.max(maxEnd, e);
    }
  }

  if (!isFinite(minStart) || !isFinite(maxEnd)) {
    minStart = hhmmToMin(FALLBACK_START);
    maxEnd = hhmmToMin(FALLBACK_END);
    bounds.add(minStart); bounds.add(maxEnd);
  }

  minStart = Math.max(0, minStart - 10);
  maxEnd = Math.min(24*60, maxEnd + 10);

  timeBoundaries = Array.from(bounds).sort((a,b)=>a-b);
  if (!timeBoundaries.includes(minStart)) timeBoundaries.unshift(minStart);
  if (!timeBoundaries.includes(maxEnd)) timeBoundaries.push(maxEnd);

  timelineStartMin = minStart;
  timelineEndMin = maxEnd;

  const heightPx = Math.max(300, (timelineEndMin - timelineStartMin) * PX_PER_MIN);
  const timeCol = document.getElementById("timeCol");
  const daysWrap = document.getElementById("daysWrap");
  if (timeCol) timeCol.style.height = heightPx + "px";
  if (daysWrap) daysWrap.style.height = heightPx + "px";
  renderTimeLinesAndLabels();
}

function renderTimeLinesAndLabels() {
  const timeCol = document.getElementById("timeCol");
  const daysWrap = document.getElementById("daysWrap");
  if (!timeCol || !daysWrap) return;

  timeCol.innerHTML = "";
  document.querySelectorAll(".hline").forEach(x => x.remove());

  for (const t of timeBoundaries) {
    if (t < timelineStartMin || t > timelineEndMin) continue;
    const y = (t - timelineStartMin) * PX_PER_MIN;

    const lab = document.createElement("div");
    lab.className = "time-label";
    lab.style.top = y + "px";
    lab.textContent = minToHHMM(t);
    timeCol.appendChild(lab);

    daysWrap.querySelectorAll(".day-col").forEach(col => {
      const line = document.createElement("div");
      line.className = "hline";
      line.style.top = y + "px";
      col.appendChild(line);
    });
  }
}

function getAllSections() {
  const all = [];
  for (const root of Object.keys(coursesData)) all.push(...(coursesData[root].sections || []));
  return all;
}

/***********************
 * EVENTS (UI) + conflict
 ***********************/
function renderEvents() {
  document.querySelectorAll(".event").forEach(e => e.remove());
  const activeDays = showWeekend ? DAYS_FULL : DAYS_FULL.slice(0, 5);

  const eventsByDay = new Map();
  for (const sec of selectedSections) {
    const root = String(sec.fullCode).split(".")[0].trim();
    const colorClass = `c-${Math.abs(hash(root) % 8)}`;
    for (const slot of (sec.schedule || [])) {
      const day = capitalize(slot.day);
      if (!activeDays.includes(day)) continue;
      const s = hhmmToMin(slot.start), e = hhmmToMin(slot.end);
      if (!(e > s)) continue;
      const ev = { sec, slot, day, startMin:s, endMin:e, colorClass };
      if (!eventsByDay.has(day)) eventsByDay.set(day, []);
      eventsByDay.get(day).push(ev);
    }
  }

  for (const [day, dayEvents] of eventsByDay.entries()) {
    dayEvents.sort((a,b) => a.startMin - b.startMin || a.endMin - b.endMin);

    const groups = [];
    for (const ev of dayEvents) {
      let placed = false;
      for (const g of groups) {
        if (g.endMax <= ev.startMin) continue;
        g.items.push(ev);
        g.endMax = Math.max(g.endMax, ev.endMin);
        placed = true; break;
      }
      if (!placed) groups.push({ items:[ev], endMax: ev.endMin });
    }

    const dayCol = document.querySelector(`.day-col[data-day="${day}"]`);
    if (!dayCol) continue;

    for (const g of groups) {
      const isConflict = g.items.length > 1;

      const colEnd = [];
      for (const ev of g.items) {
        let col = 0;
        for (; col < colEnd.length; col++) if (colEnd[col] <= ev.startMin) break;
        if (col === colEnd.length) colEnd.push(ev.endMin);
        else colEnd[col] = ev.endMin;
        ev._col = col;
      }
      const colCount = colEnd.length;

      for (const ev of g.items) {
        const top = (ev.startMin - timelineStartMin) * PX_PER_MIN;
        const height = (ev.endMin - ev.startMin) * PX_PER_MIN;
        if (height <= 1) continue;

        const div = document.createElement("div");
        div.className = `event ${ev.colorClass}` + (isConflict ? " conflict" : "");

        const title = `${ev.sec.fullCode} — ${ev.sec.courseName || ""}`.trim();
        const teacher = (ev.sec.instructor || "Hoca bilgisi yok").trim();
        const timeText = `${ev.slot.start}-${ev.slot.end}`;

        div.innerHTML = `
          <strong>${escapeHtml(title)}</strong>
          <span class="ev-teacher">👤 ${escapeHtml(teacher)}</span>
          <span class="ev-time">🕒 ${escapeHtml(timeText)} • 📍 ${escapeHtml(ev.slot.loc || "?")}</span>
          <span style="display:block; margin-top:4px; font-size:10px; opacity:.9;">${escapeHtml(ev.sec.source)}</span>
          ${isConflict ? `<div class="badge">ÇAKIŞMA</div>` : ""}
        `;

        const gapPx = 3;
        const w = 100 / colCount;
        const leftPct = ev._col * w;

        div.style.top = `${top}px`;
        div.style.height = `${height}px`;
        div.style.width = `calc(${w}% - ${gapPx*2}px)`;
        div.style.left = `calc(${leftPct}% + ${gapPx}px)`;

        dayCol.appendChild(div);
      }
    }
  }
}

/**********************************************************************
 * ✅ EXCEL EXPORT: ÇAKIŞMALAR YAN YANA (BUG FIX)
 * - Her gün için "lane" sayısı (eşzamanlı çakışma max) kadar alt sütun açar
 * - Çakışan dersler aynı güne ait farklı alt sütunlara yerleşir
 * - Böylece çakışan dersler "aktarılamıyor" bug’ı biter ve görünüm web’e benzer
 **********************************************************************/
function exportCalendarLikeXlsxSideBySideConflicts(){
  const step = Number(stepSelect.value || 10); // 5/10/15 dk
  if (selectedSections.size === 0) return;

  const activeDays = showWeekend ? DAYS_FULL : DAYS_FULL.slice(0,5);

  // 1) Export item listesi
  const items = [];
  let minT = Infinity, maxT = -Infinity;

  for (const sec of selectedSections){
    const root = String(sec.fullCode).split(".")[0].trim();
    const colorHex = pickColorHex(root);

    for (const slot of (sec.schedule || [])){
      const day = capitalize(slot.day);
      if (!activeDays.includes(day)) continue;

      const s = hhmmToMin(slot.start);
      const e = hhmmToMin(slot.end);
      if (!(e > s)) continue;

      minT = Math.min(minT, s);
      maxT = Math.max(maxT, e);

      items.push({
        day,
        startMin: s,
        endMin: e,
        title: `${sec.fullCode} — ${sec.courseName || ""}`.trim(),
        teacher: (sec.instructor || "Hoca bilgisi yok").trim(),
        timeText: `${slot.start}-${slot.end}`,
        loc: slot.loc || "?",
        source: sec.source || "",
        colorHex
      });
    }
  }

  if (!isFinite(minT) || !isFinite(maxT)){
    minT = hhmmToMin(FALLBACK_START);
    maxT = hhmmToMin(FALLBACK_END);
  }

  // 2) satırları step’e yuvarla
  const roundDown = (x) => Math.floor(x / step) * step;
  const roundUp   = (x) => Math.ceil(x / step) * step;
  minT = Math.max(0, roundDown(minT));
  maxT = Math.min(24*60, roundUp(maxT));

  // 3) Gün bazlı lane (çakışma kolonları) hesapla
  // lanePlan: day -> { lanes: number, assignments: Map(itemIndex -> laneIndex) }
  const lanePlan = buildLanePlan(items, activeDays);

  // Toplam kolon sayısı:
  // A: Saat
  // Her gün için lanes kadar kolon
  const dayColStart = new Map(); // day -> starting column index
  let colCursor = 1; // 0 is time col
  for (const d of activeDays){
    dayColStart.set(d, colCursor);
    colCursor += Math.max(1, lanePlan.get(d).lanes);
  }
  const totalCols = colCursor; // exclusive

  // 4) Sheet grid boyutu
  const rowCount = ((maxT - minT) / step) + 1; // time labels rows (header excluded)
  const ws = {};
  ws["!ref"] = XLSX.utils.encode_range({ s:{r:0,c:0}, e:{r:rowCount, c:totalCols-1} });

  // Kolon genişlikleri
  // Time col dar, gün kolonları biraz dar (lanes arttıkça sığsın)
  const cols = [{ wch: 8 }];
  for (const d of activeDays){
    const lanes = Math.max(1, lanePlan.get(d).lanes);
    for (let i=0;i<lanes;i++) cols.push({ wch: 22 });
  }
  ws["!cols"] = cols;

  // Satır yükseklikleri
  ws["!rows"] = Array.from({length: rowCount+1}, (_,r)=> (r===0 ? {hpt:22} : {hpt:18}));

  // Stil yardımcıları
  const borderThin = {
    top:{style:"thin", color:{rgb:"D9DEE7"}},
    bottom:{style:"thin", color:{rgb:"D9DEE7"}},
    left:{style:"thin", color:{rgb:"D9DEE7"}},
    right:{style:"thin", color:{rgb:"D9DEE7"}},
  };

  const headerStyle = {
    font:{bold:true, color:{rgb:"111827"}},
    alignment:{horizontal:"center", vertical:"center"},
    fill:{patternType:"solid", fgColor:{rgb:"F3F4F6"}},
    border:borderThin
  };

  const timeStyle = {
    font:{color:{rgb:"6B7280"}},
    alignment:{horizontal:"center", vertical:"center"},
    fill:{patternType:"solid", fgColor:{rgb:"FAFAFA"}},
    border:borderThin
  };

  const blankStyle = {
    alignment:{horizontal:"left", vertical:"top", wrapText:true},
    fill:{patternType:"solid", fgColor:{rgb:"FFFFFF"}},
    border:borderThin
  };

  ws["!merges"] = ws["!merges"] || [];

  // 5) Header: A1 boş + gün isimleri (gün lane sayısı kadar merge)
  setCell(ws, 0, 0, "", headerStyle);

  for (const d of activeDays){
    const startC = dayColStart.get(d);
    const lanes = Math.max(1, lanePlan.get(d).lanes);
    const endC = startC + lanes - 1;

    setCell(ws, 0, startC, d, headerStyle);
    // gün başlığını lane sayısı kadar birleştir
    if (endC > startC) ws["!merges"].push({ s:{r:0,c:startC}, e:{r:0,c:endC} });

    // merge aralığının diğer hücrelerine stil bas (Excel bazen boş bırakınca farklı görünür)
    for (let c=startC+1; c<=endC; c++){
      setCell(ws, 0, c, "", headerStyle);
    }
  }

  // 6) Sol saat kolonu + grid boşluğu
  for (let r=1; r<=rowCount; r++){
    const t = minT + (r-1)*step;
    setCell(ws, r, 0, minToHHMM(t), timeStyle);

    for (let c=1; c<totalCols; c++){
      setCell(ws, r, c, "", blankStyle);
    }
  }

  // 7) Dersleri yerleştir (lane sütununa merge + renk)
  // Not: Aynı hücre aralığına iki ders düşmeyecek (lane plan bunu garantiler)
  for (let idx=0; idx<items.length; idx++){
    const it = items[idx];
    const lanes = Math.max(1, lanePlan.get(it.day).lanes);
    const assignedLane = lanePlan.get(it.day).assignment.get(idx);
    const laneIndex = assignedLane == null ? 0 : assignedLane;

    const col = dayColStart.get(it.day) + Math.min(laneIndex, lanes-1);

    const rStart = 1 + Math.floor((it.startMin - minT)/step);
    const rEndExcl = 1 + Math.floor((it.endMin - minT)/step);
    const rEnd = Math.max(rStart, rEndExcl-1);

    // merge
    if (rEnd > rStart){
      ws["!merges"].push({ s:{r:rStart,c:col}, e:{r:rEnd,c:col} });
    }

    const text =
      `${it.title}\n` +
      `👤 ${it.teacher}\n` +
      `🕒 ${it.timeText}   📍 ${it.loc}\n` +
      `${it.source}`;

    const eventStyle = {
      font:{color:{rgb:"FFFFFF"}},
      alignment:{horizontal:"left", vertical:"top", wrapText:true},
      fill:{patternType:"solid", fgColor:{rgb: it.colorHex}},
      border:borderThin
    };

    setCell(ws, rStart, col, text, eventStyle);

    // merge aralığının alt satırlarını aynı renge boya
    for (let rr=rStart+1; rr<=rEnd; rr++){
      setCell(ws, rr, col, "", eventStyle);
    }
  }

  // 8) Workbook yaz
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Takvim");

  // Ek sayfa: satır bazlı düz liste (istersen kaldırabilirsin)
  const flat = items
    .slice()
    .sort((a,b)=> (DAY_ORDER.get(a.day)-DAY_ORDER.get(b.day)) || (a.startMin-b.startMin))
    .map(x => ({
      "Gün": x.day,
      "Başlangıç": minToHHMM(x.startMin),
      "Bitiş": minToHHMM(x.endMin),
      "Ders": x.title,
      "Hoca": x.teacher,
      "Derslik": x.loc,
      "Kaynak": x.source
    }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(flat), "Program");

  const stamp = new Date().toISOString().slice(0,19).replace(/:/g, "-");
  XLSX.writeFile(wb, `ders_programi_takvim_${stamp}.xlsx`);
}

/***********************
 * Lane plan (interval partitioning)
 * - Aynı gün içindeki çakışmaları farklı lane sütunlarına atar
 ***********************/
function buildLanePlan(items, activeDays){
  const byDay = new Map(activeDays.map(d=>[d, []]));

  // indeksleri koruyalım ki assignment map'e idx basalım
  for (let i=0; i<items.length; i++){
    const it = items[i];
    if (!byDay.has(it.day)) continue;
    byDay.get(it.day).push({ idx:i, ...it });
  }

  const plan = new Map();

  for (const day of activeDays){
    const arr = byDay.get(day) || [];
    arr.sort((a,b)=>a.startMin-b.startMin || a.endMin-b.endMin);

    // lanesEnd[k] = o lane'in en son bitiş zamanı
    const lanesEnd = [];
    const assignment = new Map();

    for (const it of arr){
      let lane = 0;
      for (; lane < lanesEnd.length; lane++){
        if (lanesEnd[lane] <= it.startMin) break;
      }
      if (lane === lanesEnd.length) lanesEnd.push(it.endMin);
      else lanesEnd[lane] = it.endMin;

      assignment.set(it.idx, lane);
    }

    plan.set(day, { lanes: Math.max(1, lanesEnd.length), assignment });
  }

  return plan;
}

/***********************
 * Sheet helpers
 ***********************/
function setCell(ws, r, c, v, style){
  const addr = XLSX.utils.encode_cell({r,c});
  ws[addr] = { t: "s", v: String(v == null ? "" : v) };
  if (style) ws[addr].s = style;
}

/***********************
 * Color mapping for excel (RGB hex without #)
 ***********************/
function pickColorHex(rootCode){
  const palette = ["3498DB","E74C3C","2ECC71","9B59B6","F39C12","34495E","16A085","D35400"];
  const idx = Math.abs(hash(rootCode) % palette.length);
  return palette[idx];
}

/***********************
 * HELPERS
 ***********************/
function hhmmToMin(hhmm) {
  const [h,m] = String(hhmm).split(":").map(Number);
  return (h*60) + (m||0);
}
function minToHHMM(min) {
  const h = Math.floor(min/60), m = min%60;
  return String(h).padStart(2,"0") + ":" + String(m).padStart(2,"0");
}
function capitalize(s) {
  if(!s) return "";
  const str = String(s).trim();
  const map = { i:'İ', ı:'I', ç:'Ç', ş:'Ş', ü:'Ü', ö:'Ö', ğ:'Ğ' };
  let first = str.charAt(0).toLowerCase();
  first = map[first] ? map[first] : first.toUpperCase();
  return first + str.slice(1).toLowerCase();
}
function hash(str) {
  let h = 0;
  const s = String(str || "");
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return h;
}
function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}
function normalizeText(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/ı/g,"i").replace(/İ/g,"i")
    .replace(/ş/g,"s").replace(/ğ/g,"g").replace(/ç/g,"c")
    .replace(/ö/g,"o").replace(/ü/g,"u")
    .trim();
}

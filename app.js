const text = {
  unentered: "\ubbf8\uc785\ub825",
  grade: "\ub4f1\uae09",
  credit: "\ub2e8\uc704",
  needMoreData: "\ub370\uc774\ud130 \ucd94\uac00 \ud544\uc694",
  improving: "\uc0c1\uc2b9\uc138",
  caution: "\uc8fc\uc758",
  stable: "\uc548\uc815",
  noTrendItems: "\ud45c\uc2dc\ud560 \ud56d\ubaa9 \uc5c6\uc74c",
  noTrendData: "\uc120\ud0dd\ud55c \ud56d\ubaa9\uc758 \ud559\uae30\ubcc4 \ub370\uc774\ud130\uac00 \uc5c6\uc2b5\ub2c8\ub2e4.",
  noGroups: "\uacfc\ubaa9\uc744 \ucd94\uac00\ud558\uba74 \uad50\uacfc\uad70\ubcc4 \ubd84\uc11d\uc774 \ud45c\uc2dc\ub429\ub2c8\ub2e4.",
  noRows: "\uc131\uc801 \ub370\uc774\ud130\ub97c \uc785\ub825\ud558\uba74 \uc790\ub3d9\uc73c\ub85c \uc804\ub7b5 \uba54\ubaa8\uac00 \uc0dd\uc131\ub429\ub2c8\ub2e4.",
  targetReached: "\ud604\uc7ac \ubaa9\ud45c \ub2ec\uc131\uad8c",
  targetAllFirst: "\ub0a8\uc740 20\ub2e8\uc704 \uc804\ubd80 1\ub4f1\uae09 \ud544\uc694",
  targetEasy: "\ub0a8\uc740 \ud559\uae30\uc5d0\uc11c \ucda9\ubd84\ud788 \uac00\ub2a5"
};

const sampleRows = [
  { year: "1", semester: "1", category: "\uad6d\uc5b4", subject: "\uad6d\uc5b4", credits: 4, rank: 2, score: 91 },
  { year: "1", semester: "1", category: "\uc218\ud559", subject: "\uc218\ud559", credits: 4, rank: 3, score: 84 },
  { year: "1", semester: "1", category: "\uc601\uc5b4", subject: "\uc601\uc5b4", credits: 4, rank: 2, score: 89 },
  { year: "1", semester: "2", category: "\uad6d\uc5b4", subject: "\uad6d\uc5b4", credits: 4, rank: 2, score: 92 },
  { year: "1", semester: "2", category: "\uc218\ud559", subject: "\uc218\ud559", credits: 4, rank: 2, score: 88 },
  { year: "1", semester: "2", category: "\uc0ac\ud68c", subject: "\ud1b5\ud569\uc0ac\ud68c", credits: 3, rank: 1, score: 95 },
  { year: "2", semester: "1", category: "\uad6d\uc5b4", subject: "\ubb38\ud559", credits: 4, rank: 2, score: 90 },
  { year: "2", semester: "1", category: "\uc218\ud559", subject: "\uc218\ud559 I", credits: 4, rank: 3, score: 82 },
  { year: "2", semester: "1", category: "\uc601\uc5b4", subject: "\uc601\uc5b4 I", credits: 4, rank: 2, score: 91 }
];

const selectors = {
  rows: document.querySelector("#gradeRows"),
  template: document.querySelector("#rowTemplate"),
  addRowButton: document.querySelector("#addRowButton"),
  sampleButton: document.querySelector("#sampleButton"),
  resetButton: document.querySelector("#resetButton"),
  targetGrade: document.querySelector("#targetGrade"),
  weightedAverage: document.querySelector("#weightedAverage"),
  totalCredits: document.querySelector("#totalCredits"),
  bestSubject: document.querySelector("#bestSubject"),
  weakSubject: document.querySelector("#weakSubject"),
  chart: document.querySelector("#semesterChart"),
  trendText: document.querySelector("#trendText"),
  groupList: document.querySelector("#subjectGroupList"),
  insightList: document.querySelector("#insightList"),
  targetResult: document.querySelector("#targetResult"),
  trendMode: document.querySelector("#trendMode"),
  trendItem: document.querySelector("#trendItem"),
  detailTrendChart: document.querySelector("#detailTrendChart"),
  detailTrendSummary: document.querySelector("#detailTrendSummary")
};

function addRow(data = {}) {
  const row = selectors.template.content.firstElementChild.cloneNode(true);
  row.querySelector(".grade-year").value = data.year ?? "1";
  row.querySelector(".semester").value = data.semester ?? "1";
  row.querySelector(".category").value = data.category ?? "\uae30\ud0c0";
  row.querySelector(".subject").value = data.subject ?? "";
  row.querySelector(".credits").value = data.credits ?? 4;
  row.querySelector(".rank").value = data.rank ?? 3;
  row.querySelector(".score").value = data.score ?? "";
  selectors.rows.append(row);
  updateAnalysis();
}

function getRows() {
  return [...selectors.rows.querySelectorAll("tr")]
    .map((row) => ({
      year: row.querySelector(".grade-year").value,
      semester: row.querySelector(".semester").value,
      category: row.querySelector(".category").value,
      subject: row.querySelector(".subject").value.trim() || text.unentered,
      credits: Number(row.querySelector(".credits").value),
      rank: Number(row.querySelector(".rank").value),
      score: Number(row.querySelector(".score").value)
    }))
    .filter((row) => row.credits > 0 && row.rank >= 1 && row.rank <= 9);
}

function weightedAverage(rows) {
  const credits = rows.reduce((sum, row) => sum + row.credits, 0);
  if (!credits) return null;
  const total = rows.reduce((sum, row) => sum + row.rank * row.credits, 0);
  return total / credits;
}

function byWeightedAverage(rows, keyFactory) {
  const groups = new Map();
  rows.forEach((row) => {
    const key = keyFactory(row);
    const existing = groups.get(key) ?? { credits: 0, points: 0, rows: [] };
    existing.credits += row.credits;
    existing.points += row.rank * row.credits;
    existing.rows.push(row);
    groups.set(key, existing);
  });

  return [...groups.entries()].map(([key, value]) => ({
    key,
    average: value.points / value.credits,
    credits: value.credits,
    rows: value.rows
  }));
}

function gradeLabel(value) {
  return Number.isFinite(value) ? `${value.toFixed(2)}${text.grade}` : "-";
}

function updateMetrics(rows, average) {
  const totalCredits = rows.reduce((sum, row) => sum + row.credits, 0);
  const subjectStats = byWeightedAverage(rows, (row) => row.subject);
  const best = [...subjectStats].sort((a, b) => a.average - b.average)[0];
  const weak = [...subjectStats].sort((a, b) => b.average - a.average)[0];

  selectors.weightedAverage.textContent = gradeLabel(average);
  selectors.totalCredits.textContent = totalCredits ? `${totalCredits}${text.credit}` : "-";
  selectors.bestSubject.textContent = best ? best.key : "-";
  selectors.weakSubject.textContent = weak ? weak.key : "-";
}

function updateChart(rows) {
  const semesters = ["1-1", "1-2", "2-1", "2-2", "3-1", "3-2"];
  const stats = byWeightedAverage(rows, (row) => `${row.year}-${row.semester}`);
  const statMap = new Map(stats.map((item) => [item.key, item]));
  selectors.chart.innerHTML = "";

  semesters.forEach((semester) => {
    const stat = statMap.get(semester);
    const value = stat?.average;
    const height = value ? `${Math.max(8, (10 - value) * 10)}%` : "0";
    const bar = document.createElement("div");
    bar.className = "bar";
    bar.innerHTML = `
      <span class="bar-value">${value ? value.toFixed(1) : "-"}</span>
      <span class="bar-fill" style="height: ${height}"></span>
      <span class="bar-label">${semester}</span>
    `;
    selectors.chart.append(bar);
  });

  const ordered = semesters.map((semester) => statMap.get(semester)?.average).filter(Boolean);
  if (ordered.length < 2) {
    selectors.trendText.textContent = text.needMoreData;
    return;
  }

  const diff = ordered.at(-1) - ordered[0];
  selectors.trendText.textContent = diff < -0.15 ? text.improving : diff > 0.15 ? text.caution : text.stable;
}

function updateGroups(rows) {
  const groups = byWeightedAverage(rows, (row) => row.category)
    .sort((a, b) => a.average - b.average);

  selectors.groupList.innerHTML = "";
  if (!groups.length) {
    selectors.groupList.textContent = text.noGroups;
    return;
  }

  groups.forEach((group) => {
    const width = `${Math.max(8, (10 - group.average) * 10)}%`;
    const row = document.createElement("div");
    row.className = "group-row";
    row.innerHTML = `
      <strong>${group.key}</strong>
      <span class="track"><span style="width: ${width}"></span></span>
      <span>${group.average.toFixed(2)}</span>
    `;
    selectors.groupList.append(row);
  });
}

function trendKeyForMode(row, mode) {
  return mode === "category" ? row.category : row.subject;
}

function updateTrendOptions(rows) {
  const mode = selectors.trendMode.value;
  const previous = selectors.trendItem.value;
  const items = [...new Set(rows.map((row) => trendKeyForMode(row, mode)))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  selectors.trendItem.innerHTML = "";
  if (!items.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = text.noTrendItems;
    selectors.trendItem.append(option);
    return;
  }

  items.forEach((item) => {
    const option = document.createElement("option");
    option.value = item;
    option.textContent = item;
    selectors.trendItem.append(option);
  });

  selectors.trendItem.value = items.includes(previous) ? previous : items[0];
}

function updateDetailTrend(rows) {
  const mode = selectors.trendMode.value;
  const item = selectors.trendItem.value;
  const semesters = ["1-1", "1-2", "2-1", "2-2", "3-1", "3-2"];
  const filtered = rows.filter((row) => trendKeyForMode(row, mode) === item);
  const stats = byWeightedAverage(filtered, (row) => `${row.year}-${row.semester}`);
  const statMap = new Map(stats.map((stat) => [stat.key, stat]));
  const values = semesters.map((semester) => ({
    semester,
    value: statMap.get(semester)?.average
  }));
  const existing = values.filter((entry) => Number.isFinite(entry.value));

  selectors.detailTrendChart.innerHTML = "";

  values.forEach((entry) => {
    const height = entry.value ? `${Math.max(8, (10 - entry.value) * 10)}%` : "0";
    const bar = document.createElement("div");
    bar.className = "detail-bar";
    bar.innerHTML = `
      <span class="bar-value">${entry.value ? entry.value.toFixed(2) : "-"}</span>
      <span class="bar-fill" style="height: ${height}"></span>
      <span class="bar-label">${entry.semester}</span>
    `;
    selectors.detailTrendChart.append(bar);
  });

  if (!existing.length) {
    selectors.detailTrendSummary.textContent = text.noTrendData;
    return;
  }

  const first = existing[0];
  const last = existing.at(-1);
  const diff = last.value - first.value;
  const direction = diff < -0.15 ? text.improving : diff > 0.15 ? text.caution : text.stable;
  selectors.detailTrendSummary.textContent =
    `${item}: ${first.semester} ${first.value.toFixed(2)}${text.grade} -> ${last.semester} ${last.value.toFixed(2)}${text.grade} (${direction})`;
}

function updateInsights(rows, average) {
  const insights = [];
  const subjects = byWeightedAverage(rows, (row) => row.subject);
  const categories = byWeightedAverage(rows, (row) => row.category);
  const weak = [...subjects].sort((a, b) => b.average - a.average)[0];
  const best = [...subjects].sort((a, b) => a.average - b.average)[0];
  const weakCategory = [...categories].sort((a, b) => b.average - a.average)[0];
  const bestCategory = [...categories].sort((a, b) => a.average - b.average)[0];
  const recent = byWeightedAverage(rows, (row) => `${row.year}-${row.semester}`)
    .sort((a, b) => a.key.localeCompare(b.key))
    .at(-1);

  if (!rows.length) {
    insights.push(text.noRows);
  } else {
    insights.push(`\ud604\uc7ac \uac00\uc911 \ud3c9\uade0\uc740 ${average.toFixed(2)}${text.grade}\uc785\ub2c8\ub2e4.`);
    if (best && weak && best.key !== weak.key) {
      insights.push(`${best.key}\ub294 \uac15\uc810 \uacfc\ubaa9, ${weak.key}\ub294 \uc6b0\uc120 \uad00\ub9ac \uacfc\ubaa9\uc785\ub2c8\ub2e4.`);
    }
    if (bestCategory && weakCategory && bestCategory.key !== weakCategory.key) {
      insights.push(`\uad50\uacfc\uad70 \uae30\uc900\uc73c\ub85c\ub294 ${bestCategory.key}\uc774 \uac15\uc810, ${weakCategory.key}\uc774 \ubcf4\uc644 \ud544\uc694 \uc601\uc5ed\uc785\ub2c8\ub2e4.`);
    }
    if (recent) {
      insights.push(`\ucd5c\uadfc \ud559\uae30(${recent.key}) \ud3c9\uade0\uc740 ${recent.average.toFixed(2)}${text.grade}\uc785\ub2c8\ub2e4.`);
    }
    if (weak && weak.credits >= 4) {
      insights.push(`${weak.key}\ucc98\ub7fc \ub2e8\uc704\uc218\uac00 \ud070 \uacfc\ubaa9\uc740 \ud3c9\uade0\uc5d0 \uc601\ud5a5\uc774 \ucee4\uc11c \uc218\ud589\ud3c9\uac00\uc640 \uc9c0\ud544\uace0\uc0ac \uad00\ub9ac\uac00 \uc911\uc694\ud569\ub2c8\ub2e4.`);
    }
  }

  selectors.insightList.innerHTML = "";
  insights.forEach((itemText) => {
    const item = document.createElement("li");
    item.textContent = itemText;
    selectors.insightList.append(item);
  });
}

function updateTarget(rows, average) {
  const target = Number(selectors.targetGrade.value);
  if (!rows.length || !Number.isFinite(target)) {
    selectors.targetResult.textContent = "-";
    return;
  }

  const totalCredits = rows.reduce((sum, row) => sum + row.credits, 0);
  const currentPoints = rows.reduce((sum, row) => sum + row.rank * row.credits, 0);
  const futureCredits = 20;
  const required = (target * (totalCredits + futureCredits) - currentPoints) / futureCredits;

  if (average <= target) {
    selectors.targetResult.textContent = text.targetReached;
  } else if (required < 1) {
    selectors.targetResult.textContent = text.targetAllFirst;
  } else if (required > 9) {
    selectors.targetResult.textContent = text.targetEasy;
  } else {
    selectors.targetResult.textContent = `\ub0a8\uc740 20\ub2e8\uc704 \ud3c9\uade0 ${required.toFixed(2)}${text.grade} \ud544\uc694`;
  }
}

function updateAnalysis() {
  const rows = getRows();
  const average = weightedAverage(rows);

  updateMetrics(rows, average);
  updateChart(rows);
  updateGroups(rows);
  updateTrendOptions(rows);
  updateDetailTrend(rows);
  updateInsights(rows, average ?? 0);
  updateTarget(rows, average ?? 0);
}

function loadSample() {
  selectors.rows.innerHTML = "";
  sampleRows.forEach(addRow);
  updateAnalysis();
}

selectors.addRowButton.addEventListener("click", () => addRow());
selectors.sampleButton.addEventListener("click", loadSample);
selectors.resetButton.addEventListener("click", () => {
  selectors.rows.innerHTML = "";
  addRow();
});

selectors.rows.addEventListener("input", updateAnalysis);
selectors.rows.addEventListener("change", updateAnalysis);
selectors.rows.addEventListener("click", (event) => {
  if (!event.target.classList.contains("delete-row")) return;
  event.target.closest("tr").remove();
  if (!selectors.rows.children.length) addRow();
  updateAnalysis();
});

selectors.targetGrade.addEventListener("input", updateAnalysis);
selectors.trendMode.addEventListener("change", updateAnalysis);
selectors.trendItem.addEventListener("change", () => updateDetailTrend(getRows()));

loadSample();

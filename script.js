Chart.register(ChartDataLabels);
let matrixChart = null;
(function () {
  const savedTheme = localStorage.getItem("theme") || "light";
  document.body.setAttribute("data-theme", savedTheme);
})();

const CONFIG_PAGES = [
  { id: "home-page", name: "🏠 سەرەتا", file: "pages/home.html" },
  { id: "file-page", name: "📁 فایلی ئەکسڵ", file: "pages/file.html" },
  { id: "local-page", name: "📊 مێژوو", file: "pages/local.html" },
  { id: "analytics-page", name: "📈 شیکاری", file: "pages/analytics.html" },
  { id: "settings-page", name: "⚙️ ڕێکخستن", file: "pages/settings.html" },
];

window.excelFileData = [];
let currentChart = null;

async function loadPage(pageId) {
  const config = CONFIG_PAGES.find((p) => p.id === pageId);
  const container = document.getElementById("page-container");

  document.querySelector(".sidebar").classList.remove("open");
  document.getElementById("sidebar-overlay").classList.remove("active");

  try {
    const res = await fetch(config.file);
    container.innerHTML = await res.text();

    document
      .getElementById("dynamic-nav")
      .querySelectorAll(".nav-item")
      .forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.id === pageId);
      });

    if (pageId === "home-page") {
      initDynamicForm();
      updateDashboard();
    }
    if (pageId === "file-page")
      renderTable(window.excelFileData, "excel-head", "excel-body", false);
    if (pageId === "local-page")
      renderTable(
        JSON.parse(localStorage.getItem("master_list") || "[]"),
        "local-head",
        "local-body",
        true,
      );
    if (pageId === "analytics-page") initChartBuilder();
    if (pageId === "settings-page") loadSettings();
  } catch (e) {
    console.error("Page failed to load");
  }
}

function toggleSidebar() {
  const sidebar = document.querySelector(".sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  sidebar.classList.toggle("open");
  overlay.classList.toggle("active");
}

async function initDynamicForm() {
  try {
    const res = await fetch("./data.json");
    if (res.ok) {
      const data = await res.json();
      const container = document.getElementById("form-content");
      container.innerHTML = data
        .map(
          (item) => `
                <div class="form-group">
                    <label>${item.title}</label>
                    ${
                      item.type === "text"
                        ? `<input type="text" name="${item.title}" required>`
                        : `<select name="${item.title}" required>${item.options.map((o) => `<option value="${o}">${o}</option>`).join("")}</select>`
                    }
                </div>
            `,
        )
        .join("");
    }
  } catch (e) {}

  document.getElementById("dynamic-form").onsubmit = function (e) {
    e.preventDefault();
    const formData = new FormData(this);
    const entry = {};
    formData.forEach((v, k) => (entry[k] = v));
    const settings = JSON.parse(
      localStorage.getItem("app_settings") || '{"name":"میوان"}',
    );
    entry["تۆمارکەر"] = settings.name;

    const list = JSON.parse(localStorage.getItem("master_list") || "[]");
    list.push(entry);
    localStorage.setItem("master_list", JSON.stringify(list));

    document.getElementById("form-view").style.display = "none";
    document.getElementById("success-view").style.display = "block";
    updateDashboard();
  };
}

function renderTable(data, headId, bodyId, isLocal) {
  const head = document.getElementById(headId);
  const body = document.getElementById(bodyId);
  if (!head || !body) return;
  if (!data || data.length === 0) {
    body.innerHTML = "<tr><td>داتا نییە</td></tr>";
    return;
  }

  const cols = Object.keys(data[0]);
  head.innerHTML = `<tr>${cols.map((c) => `<th>${c}</th>`).join("")} ${isLocal ? "<th>کردار</th>" : ""}</tr>`;
  body.innerHTML = data
    .map(
      (row, i) =>
        `<tr>${cols.map((c) => `<td>${row[c] || ""}</td>`).join("")}${isLocal ? `<td><button class="delete-btn" onclick="deleteRow(${i})">سڕینەوە</button></td>` : ""}</tr>`,
    )
    .join("");
}

function initChartBuilder() {
    // ڕاستەوخۆ داتای ئەکسڵ بەکاربهێنە
    const dataToUse = window.excelFileData || [];
    
    const mainSelect = document.getElementById('chart-column-select');
    const matrixSelect1 = document.getElementById('matrix-col-1');
    const matrixSelect2 = document.getElementById('matrix-col-2');
    
    if (dataToUse.length === 0) return;

    const columns = Object.keys(dataToUse[0]);
    const optionsHTML = columns.map(col => `<option value="${col}">${col}</option>`).join('');
    
    if (mainSelect) mainSelect.innerHTML = optionsHTML;
    if (matrixSelect1) matrixSelect1.innerHTML = optionsHTML;
    if (matrixSelect2) {
        matrixSelect2.innerHTML = optionsHTML;
        matrixSelect2.selectedIndex = columns.length > 1 ? 1 : 0;
    }
    updateChart();
    runMatrixAnalysis();
}


function resetChartZoom() {
    if (currentChart) currentChart.resetZoom();
}



function exportChartAsPNG(canvasId, fileName) {
    const originalCanvas = document.getElementById(canvasId);
    

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = originalCanvas.width;
    tempCanvas.height = originalCanvas.height;
    const ctx = tempCanvas.getContext('2d');


    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);


    ctx.drawImage(originalCanvas, 0, 0);


    const link = document.createElement('a');
    link.download = `${fileName}_${new Date().getTime()}.png`;
    link.href = tempCanvas.toDataURL('image/png', 1.0);
    link.click();
}


function downloadChart() {
    exportChartAsPNG('myChart', 'Main_Graph');
}

function downloadMatrixChart() {
    exportChartAsPNG('matrixChart', 'Matrix_Graph');
}

function updateChart() {
const dataToUse = window.excelFileData || [];
    const col = document.getElementById('chart-column-select').value;
    const type = document.getElementById('chart-type-select').value;

    if (!col || dataToUse.length === 0) return;

    const counts = {};
    dataToUse.forEach(row => {
        let val = row[col] || "Unknown";
        counts[val] = (counts[val] || 0) + 1;
    });

    const labels = Object.keys(counts);
    const values = labels.map(l => counts[l]);
    const total = values.reduce((a, b) => a + b, 0);

    if (currentChart) currentChart.destroy();

    currentChart = new Chart(document.getElementById('myChart').getContext('2d'), {
        type: type,
        data: {
            labels: labels,
            datasets: [{
                label: `کۆی گشتی بەپێی ${col}`,
                data: values,
                backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'],
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                },
                // --- DATALABELS SETTINGS ---
                datalabels: {
                    color: '#fff', // White text
                    anchor: 'end',
                    align: 'start',
                    offset: -10,
                    font: {
                        weight: 'bold',
                        size: 12
                    },
                    formatter: (value) => {
                        let percentage = ((value / total) * 100).toFixed(1) + "%";
                        return `${value} (${percentage})`; // Shows "Count (Percentage)"
                    },
                    // Ensure labels are visible on dark/light bars
                    textShadowColor: 'rgba(0, 0, 0, 0.5)',
                    textShadowBlur: 3,
                    
                },
                zoom: {
            pan: {
                enabled: true,
                mode: 'x', // Allows dragging left/right
            },
            zoom: {
                wheel: { enabled: true }, // Zoom with mouse wheel
                pinch: { enabled: true }, // Zoom with fingers on iPhone
                mode: 'x',
            }
        }
            }
        }
    });
}

function runMatrixAnalysis() {
const data = window.excelFileData || [];
    const col1 = document.getElementById('matrix-col-1').value;
    const col2 = document.getElementById('matrix-col-2').value;
    
    if (!col1 || !col2 || data.length === 0) return;
     const container = document.getElementById('matrix-results');

    const combinations = {};
    let totalEntries = data.length;

    data.forEach(row => {
        const val1 = row[col1] || "Empty";
        const val2 = row[col2] || "Empty";
        const comboKey = `${val1} + ${val2}`;
        combinations[comboKey] = (combinations[comboKey] || 0) + 1;
    });

    const sortedCombos = Object.entries(combinations).sort((a, b) => b[1] - a[1]);

    // 1. Update List View with Percentages
    container.innerHTML = sortedCombos.map(([key, count]) => {
        let percent = ((count / totalEntries) * 100).toFixed(1);
        return `
            <div class="matrix-card">
                <div class="matrix-label">${key}</div>
                <div style="text-align: left;">
                    <span class="matrix-count">${count}</span>
                    <small style="display:block; font-size:0.7rem; color:var(--primary); margin-top:4px;">${percent}%</small>
                </div>
            </div>
        `;
    }).join('');

    // 2. Update Matrix Chart
    const labels = sortedCombos.map(item => item[0]);
    const values = sortedCombos.map(item => item[1]);

    if (matrixChart) matrixChart.destroy();

    const ctx = document.getElementById('matrixChart').getContext('2d');
    matrixChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: `${col1} و ${col2}`,
                data: values,
                backgroundColor: '#8b5cf6', // A different color (Purple) for the matrix
                borderRadius: 8
            }]
        },
        options: {
            indexAxis: 'y', // Makes it a horizontal bar chart for easier reading of long labels
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                datalabels: {
                    color: '#fff',
                    formatter: (value) => {
                        let percent = ((value / totalEntries) * 100).toFixed(1);
                        return `${value} (${percent}%)`;
                    }
                }
            }
        }
    });
}

// Add the download function for the Matrix


function deleteRow(i) {
  if (confirm("دڵنیای لە سڕینەوە؟")) {
    const l = JSON.parse(localStorage.getItem("master_list") || "[]");
    l.splice(i, 1);
    localStorage.setItem("master_list", JSON.stringify(l));
    renderTable(l, "local-head", "local-body", true);
    updateDashboard();
  }
}

function exportMasterFile() {
  const data = JSON.parse(localStorage.getItem("master_list") || "[]");
  const ws = XLSX.utils.json_to_sheet(data);
  ws["!views"] = [{ RTL: true }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Records");
  XLSX.writeFile(wb, `Export_${new Date().toISOString().split("T")[0]}.xlsx`);
}

function updateDashboard() {
  const l = JSON.parse(localStorage.getItem("master_list") || "[]");
  const s = JSON.parse(
    localStorage.getItem("app_settings") || '{"name":"میوان"}',
  );
  if (document.getElementById("dash-local-count"))
    document.getElementById("dash-local-count").textContent = l.length;
  if (document.getElementById("dash-excel-count"))
    document.getElementById("dash-excel-count").textContent =
      window.excelFileData.length;
  if (document.getElementById("side-logo"))
    document.getElementById("side-logo").textContent = s.name;
  if (document.getElementById("collector-badge"))
    document.getElementById("collector-badge").textContent =
      `بەکارهێنەر: ${s.name}`;
}

function saveSettings() {
  localStorage.setItem(
    "app_settings",
    JSON.stringify({
      name: document.getElementById("user-name-input").value,
      size: document.getElementById("font-slider").value,
    }),
  );
  updateDashboard();
}

function loadSettings() {
  const s = JSON.parse(
    localStorage.getItem("app_settings") || '{"name":"میوان","size":"16"}',
  );
  document.getElementById("user-name-input").value = s.name;
  document.getElementById("font-slider").value = s.size;
  document.documentElement.style.setProperty("--dynamic-size", s.size + "px");
  document.body.setAttribute(
    "data-theme",
    localStorage.getItem("theme") || "light",
  );
}

function clearAllData() {
  if (
    confirm(
      "ئایا دڵنیای لە سڕینەوەی هەموو تۆمارە ناوخۆییەکان؟ ئەم کردارە ناگەڕێتەوە.",
    )
  ) {
    localStorage.removeItem("master_list");

    renderTable([], "local-head", "local-body", true);
    updateDashboard();
    alert("هەموو داتاکان سڕانەوە.");
  }
}

function toggleDarkMode() {
  const t =
    document.body.getAttribute("data-theme") === "dark" ? "light" : "dark";
  document.body.setAttribute("data-theme", t);
  localStorage.setItem("theme", t);
}
function checkWelcomeModal() {
  const skipModal = localStorage.getItem("skip_welcome_modal");
  if (!skipModal) {
    document.getElementById("welcome-modal").classList.remove("hidden");
  }
}

function closeWelcomeModal() {
  const isChecked = document.getElementById("dont-show-again").checked;
  if (isChecked) {
    localStorage.setItem("skip_welcome_modal", "true");
  }
  document.getElementById("welcome-modal").classList.add("hidden");
}

window.onload = async () => {
  const nav = document.getElementById("dynamic-nav");
  if (nav) {
    nav.innerHTML = CONFIG_PAGES.map(
      (p) =>
        `<button class="nav-item" data-id="${p.id}" onclick="loadPage('${p.id}')">${p.name}</button>`,
    ).join("");
  }

  try {
    const res = await fetch("./data.xlsx?v=" + Math.random());
    if (res.ok) {
      const buffer = await res.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });

      let targetSheetData = null;

      if (wb.SheetNames.includes("Main Table")) {
        targetSheetData = XLSX.utils.sheet_to_json(wb.Sheets["Main Table"]);
        console.log("✅ داتا وەرگیرا لە شیتی: Main Table");
      } else {
        for (let name of wb.SheetNames) {
          const sheetData = XLSX.utils.sheet_to_json(wb.Sheets[name]);
          if (sheetData.length > 0) {
            targetSheetData = sheetData;
            break;
          }
        }
      }

      if (targetSheetData && targetSheetData.length > 0) {
        window.excelFileData = targetSheetData;

        updateDashboard();
      }
    }
  } catch (e) {
    console.error("❌ هەڵە لە خوێندنەوەی فایلی ئەکسڵ:", e);
  }

  loadPage("home-page");

  checkWelcomeModal();
};

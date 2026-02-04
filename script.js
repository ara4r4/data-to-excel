window.excelFileData = [];
let currentChart = null;

async function init() {
    loadSettings();
    updateDashboard();
    showPage('home-page');
    resetForm();

    // Load Dynamic Form
    try {
        const res = await fetch('./data.json');
        if (res.ok) renderForm(await res.json());
    } catch (e) { console.error("data.json not found"); }

    // Load Excel Source
    try {
        const res = await fetch('./data.xlsx');
        if (res.ok) {
            const buffer = await res.arrayBuffer();
            const wb = XLSX.read(buffer, { type: 'array' });
            
            // Show Author/Date
            const props = wb.Props || {};
            const meta = document.getElementById('file-metadata');
            if(meta) meta.textContent = `Date: ${props.CreatedDate ? new Date(props.CreatedDate).toLocaleDateString() : 'N/A'}`;

            const sheet = wb.SheetNames.find(n => n === "Main Table") || wb.SheetNames[0];
            window.excelFileData = XLSX.utils.sheet_to_json(wb.Sheets[sheet]);
            renderTable(window.excelFileData, 'excel-head', 'excel-body', false);
            updateDashboard();
        }
    } catch (e) { console.error("data.xlsx not found"); }
}

function renderForm(data) {
    const container = document.getElementById('form-content');
    container.innerHTML = data.map(item => `
        <div class="form-group">
            <label>${item.title}</label>
            ${item.type === 'text' ? `<input type="text" name="${item.title}" required>` : 
              `<select name="${item.title}" required><option value="">ھەڵبژێرە...</option>${item.options.map(o => `<option value="${o}">${o}</option>`).join('')}</select>`}
        </div>
    `).join('');
}

function renderTable(data, headId, bodyId, isLocal) {
    const head = document.getElementById(headId);
    const body = document.getElementById(bodyId);
    if (!head || !body) return;
    if (!data || data.length === 0) { body.innerHTML = "<tr><td>No Data</td></tr>"; return; }
    
    const cols = Object.keys(data[0]);
    head.innerHTML = `<tr>${cols.map(c => `<th>${c}</th>`).join('')} ${isLocal ? '<th>Action</th>' : ''}</tr>`;
    body.innerHTML = data.map((row, i) => `<tr>${cols.map(c => `<td>${row[c] || ''}</td>`).join('')}${isLocal ? `<td><button class="delete-btn" onclick="deleteRow(${i})">Delete</button></td>` : ''}</tr>`).join('');
}

// NAVIGATION
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => { p.style.display = 'none'; p.classList.add('hidden'); });
    const target = document.getElementById(pageId);
    if(target) { target.style.display = 'block'; target.classList.remove('hidden'); }
    
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    const btn = Array.from(document.querySelectorAll('.nav-item')).find(b => b.getAttribute('onclick').includes(pageId));
    if(btn) btn.classList.add('active');

    if (window.innerWidth <= 768 && document.querySelector('.sidebar').classList.contains('open')) toggleSidebar();
    
    if (pageId === 'analytics-page') initChartBuilder();
    if (pageId === 'local-page') renderTable(JSON.parse(localStorage.getItem('master_list') || '[]'), 'local-head', 'local-body', true);
}

function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('open');
    document.getElementById('sidebar-overlay').classList.toggle('active');
}

// ANALYTICS ENGINE
// --- UPGRADED ANALYTICS ENGINE ---
function initChartBuilder() {
    const sourceSelect = document.getElementById('chart-source-select');
    const source = sourceSelect ? sourceSelect.value : 'local';
    
    let dataToUse = (source === 'local') 
        ? JSON.parse(localStorage.getItem('master_list') || '[]') 
        : (window.excelFileData || []);

    const mainSelect = document.getElementById('chart-column-select');
    const matrixSelect1 = document.getElementById('matrix-col-1');
    const matrixSelect2 = document.getElementById('matrix-col-2');
    const totalDisplay = document.getElementById('chart-total-count');
    
    // If no data, show a warning and stop
    if (dataToUse.length === 0) {
        if (totalDisplay) totalDisplay.textContent = "Records: 0 (No data found)";
        return;
    }

    if (totalDisplay) totalDisplay.textContent = `Records: ${dataToUse.length}`;

    // Get unique column names
    const columns = Object.keys(dataToUse[0]);
    const optionsHTML = columns.map(col => `<option value="${col}">${col}</option>`).join('');
    
    // Fill all dropdowns
    if (mainSelect) mainSelect.innerHTML = optionsHTML;
    if (matrixSelect1) {
        matrixSelect1.innerHTML = optionsHTML;
        // Default the second dropdown to the next column if available
        if (matrixSelect2) {
            matrixSelect2.innerHTML = optionsHTML;
            matrixSelect2.selectedIndex = columns.length > 1 ? 1 : 0;
        }
    }

    // Refresh the visuals
    updateChart();
    runMatrixAnalysis();
}

// 2. Add this new function
function runMatrixAnalysis() {
    const source = document.getElementById('chart-source-select').value;
    let data = (source === 'local') ? JSON.parse(localStorage.getItem('master_list') || '[]') : window.excelFileData;
    
    const col1 = document.getElementById('matrix-col-1').value;
    const col2 = document.getElementById('matrix-col-2').value;
    const container = document.getElementById('matrix-results');

    if (!col1 || !col2 || data.length === 0) return;

    // The logic to count combinations
    const combinations = {};
    
    data.forEach(row => {
        const val1 = row[col1] || "Empty";
        const val2 = row[col2] || "Empty";
        const comboKey = `${val1} + ${val2}`;
        combinations[comboKey] = (combinations[comboKey] || 0) + 1;
    });

    // Sort by most frequent combination
    const sortedCombos = Object.entries(combinations).sort((a, b) => b[1] - a[1]);

    // Render as UI cards
    container.innerHTML = sortedCombos.map(([key, count]) => `
        <div class="matrix-card">
            <div class="matrix-label">${key}</div>
            <div class="matrix-count">${count}</div>
        </div>
    `).join('');
}

function updateChart() {
    const source = document.getElementById('chart-source-select').value;
    let dataToUse = (source === 'local') ? JSON.parse(localStorage.getItem('master_list') || '[]') : window.excelFileData;
    
    const col = document.getElementById('chart-column-select').value;
    const type = document.getElementById('chart-type-select').value;

    if (!col || dataToUse.length === 0) return;

    // Advanced Data Aggregation
    const counts = {};
    dataToUse.forEach(row => {
        let val = row[col];
        if (val === undefined || val === null || val === "") val = "Unknown/Empty";
        counts[val] = (counts[val] || 0) + 1;
    });

    // Sort data from highest to lowest for better visuals
    const sortedLabels = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    const sortedValues = sortedLabels.map(label => counts[label]);

    if (currentChart) currentChart.destroy();
    
    const ctx = document.getElementById('myChart').getContext('2d');
    currentChart = new Chart(ctx, {
        type: type,
        data: {
            labels: sortedLabels,
            datasets: [{
                label: `Total count by ${col}`,
                data: sortedValues,
                backgroundColor: [
                    '#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'
                ],
                borderColor: 'rgba(0,0,0,0.1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: (type === 'pie' || type === 'doughnut') },
                tooltip: {
                    callbacks: {
                        label: function(c) {
                            const sum = c.dataset.data.reduce((a, b) => a + b, 0);
                            const perc = ((c.raw / sum) * 100).toFixed(1);
                            return `${c.label}: ${c.raw} (${perc}%)`;
                        }
                    }
                }
            },
            scales: type === 'bar' || type === 'line' ? {
                y: { beginAtZero: true, grid: { display: false } },
                x: { grid: { display: false } }
            } : {}
        }
    });
}

// FORM LOGIC
// UPDATED SUBMISSION LOGIC
document.getElementById('dynamic-form').onsubmit = function(e) {
  
    
    try {
        // 1. Collect and Save Data
        const formData = new FormData(this);
        const entry = {};
        formData.forEach((v, k) => entry[k] = v);
        
        const settings = JSON.parse(localStorage.getItem('app_settings') || '{"name":"Guest"}');
        entry["Data Collector"] = settings.name;

        const list = JSON.parse(localStorage.getItem('master_list') || '[]');
        list.push(entry);
        localStorage.setItem('master_list', JSON.stringify(list));

        // 2. IMMEDIATE UI SWITCH (Before any heavy math)
        // We use direct style overrides to ensure it's not blocked by CSS
        document.getElementById('form-view').style.setProperty('display', 'none', 'important');
        
        const successView = document.getElementById('success-view');
        successView.style.setProperty('display', 'block', 'important');
        successView.classList.remove('hidden');

        // 3. Update background stats quietly
        updateDashboard();
        
        // We delay these slightly so they don't "freeze" the UI switch
        setTimeout(() => {
            if (typeof initChartBuilder === "function") initChartBuilder();
        }, 100);

    } catch (err) {
        console.error("Save failed:", err);
        alert("Error saving data. Check the console.");
    }
};

// UPDATED RESET LOGIC
function resetForm() {
    
    // Reset the text inside the form
    const form = document.getElementById('dynamic-form');
    if (form) form.reset();

    // Hide Success, Show Form using !important priority
    const successView = document.getElementById('success-view');
    const formView = document.getElementById('form-view');

    if (successView) {
        successView.style.setProperty('display', 'none', 'important');
        successView.classList.add('hidden');
    }
    
    if (formView) {
        formView.style.setProperty('display', 'block', 'important');
        formView.classList.remove('hidden');
    }
}
function deleteRow(i) {
    if(confirm("Delete?")) {
        const l = JSON.parse(localStorage.getItem('master_list') || '[]');
        l.splice(i,1); localStorage.setItem('master_list', JSON.stringify(l));
        renderTable(l, 'local-head', 'local-body', true); updateDashboard();
    }
}

function clearAllData() {
    if(confirm("Delete EVERYTHING?")) {
        localStorage.removeItem('master_list');
        renderTable([], 'local-head', 'local-body', true); updateDashboard();
    }
}

function exportMasterFile() {
    const data = JSON.parse(localStorage.getItem('master_list') || '[]');
    const s = JSON.parse(localStorage.getItem('app_settings') || '{"name":"Guest"}');
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!views'] = [{ RTL: true }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Records");
    const name = s.name.replace(/\s+/g, '_');
    XLSX.writeFile(wb, `${name}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

function updateDashboard() {
    const l = JSON.parse(localStorage.getItem('master_list') || '[]');
    const s = JSON.parse(localStorage.getItem('app_settings') || '{"name":"Guest"}');
    const set = (id, val) => { if(document.getElementById(id)) document.getElementById(id).textContent = val; };
    set('dash-local-count', l.length);
    set('dash-excel-count', window.excelFileData.length);
    set('side-logo', s.name);
    set('collector-badge', `User: ${s.name}`);
}

function saveSettings() {
    localStorage.setItem('app_settings', JSON.stringify({ name: document.getElementById('user-name-input').value, size: document.getElementById('font-slider').value }));
    updateDashboard();
}

function loadSettings() {
    const s = JSON.parse(localStorage.getItem('app_settings') || '{"name":"Guest","size":"16"}');
    document.getElementById('user-name-input').value = s.name;
    document.getElementById('font-slider').value = s.size;
    applyFontSize(s.size);
    document.body.setAttribute('data-theme', localStorage.getItem('theme') || 'light');
}

function applyFontSize(s) { document.documentElement.style.setProperty('--dynamic-size', s + 'px'); }
function toggleDarkMode() {
    const t = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', t);
    localStorage.setItem('theme', t);
}

init();
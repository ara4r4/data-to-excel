async function init() {
    loadSettings();
const res = await fetch('./data.json');
    const data = await res.json();
    
    const container = document.getElementById('form-content');
    data.forEach(item => {
        const group = document.createElement('div');
        group.className = 'form-group';
        let input = (item.type === "text") 
            ? `<input type="text" name="${item.title}" required>`
            : `<select name="${item.title}" required><option value="" disabled selected>ھەڵبژێرە...</option>${item.options.map(o => `<option value="${o}">${o}</option>`).join('')}</select>`;
        group.innerHTML = `<label>${item.title}</label>${input}`;
        container.appendChild(group);
    });
    renderTable();
}

function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(tabId).classList.remove('hidden');
    event.currentTarget.classList.add('active');
    
    if(tabId === 'data-tab') renderTable();
}

function applyFontSize(size) {
    document.documentElement.style.setProperty('--dynamic-size', size + 'px');
}

function toggleDarkMode() {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const theme = isDark ? 'light' : 'dark';
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
}

function saveSettings() {
    const name = document.getElementById('user-name-input').value;
    const size = document.getElementById('font-slider').value;
    localStorage.setItem('app_settings', JSON.stringify({ name, size }));
    document.getElementById('display-title').textContent = name || "Portal";
}

function loadSettings() {
    const settings = JSON.parse(localStorage.getItem('app_settings') || '{"name": "Collector", "size": "16"}');
    const theme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', theme);
    document.getElementById('user-name-input').value = settings.name;
    document.getElementById('font-slider').value = settings.size;
    document.getElementById('display-title').textContent = settings.name;
    applyFontSize(settings.size);
}

document.getElementById('dynamic-form').onsubmit = function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    const settings = JSON.parse(localStorage.getItem('app_settings') || '{"name": "Guest"}');
    
    const newEntry = {};
    formData.forEach((v, k) => { newEntry[k] = v; });
    newEntry["Data Collector"] = settings.name; // Final Column

    const db = JSON.parse(localStorage.getItem('master_list') || '[]');
    db.push(newEntry);
    localStorage.setItem('master_list', JSON.stringify(db));

    document.getElementById('form-view').classList.add('hidden');
    document.getElementById('success-view').classList.remove('hidden');
};

function renderTable() {
    const db = JSON.parse(localStorage.getItem('master_list') || '[]');
    const head = document.getElementById('table-head');
    const body = document.getElementById('table-body');
    
    if (db.length === 0) {
        body.innerHTML = "<tr><td colspan='100%'>No records found</td></tr>";
        return;
    }

    const keys = Object.keys(db[0]);
    head.innerHTML = keys.map(k => `<th>${k}</th>`).join('');
    body.innerHTML = db.slice().reverse().map(row => 
        `<tr>${keys.map(k => `<td>${row[k] || ''}</td>`).join('')}</tr>`
    ).join('');
}

function exportMasterFile() {
    const data = JSON.parse(localStorage.getItem('master_list') || '[]');
    if(!data.length) return alert("Nothing to export");


    const settings = JSON.parse(localStorage.getItem('app_settings') || '{"name": "Collector"}');
    const collectorName = settings.name || "Collector";

 
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0'); 
    const yyyy = today.getFullYear();
    const dateString = `${dd}-${mm}-${yyyy}`;

    const ws = XLSX.utils.json_to_sheet(data);
    

    ws['!views'] = [{ RTL: true }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Records");

 
    const fileName = `${collectorName}_${dateString}.xlsx`;
    
    XLSX.writeFile(wb, fileName);
}

function resetForm() {
    document.getElementById('dynamic-form').reset();
    document.getElementById('success-view').classList.add('hidden');
    document.getElementById('form-view').classList.remove('hidden');
}

function clearDatabase() {
    if(confirm("Permanently delete ALL records?")) {
        localStorage.removeItem('master_list');
        renderTable();
    }
}

init();
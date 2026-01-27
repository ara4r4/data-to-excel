async function init() {
  updateCount();
  const res = await fetch("data.json");
  const data = await res.json();
  const container = document.getElementById("form-content");

  data.forEach((item) => {
    const group = document.createElement("div");
    group.className = "form-group";
    let inputHtml =
      item.type === "text"
        ? `<input type="text" name="${item.title}" required>`
        : `<select name="${item.title}" required>
                <option value="" disabled selected>ھەڵبژێرە...</option>
                ${item.options.map((opt) => `<option value="${opt}">${opt}</option>`).join("")}
               </select>`;

    group.innerHTML = `<label>${item.title}</label>${inputHtml}`;
    container.appendChild(group);
  });
}

document.getElementById("dynamic-form").addEventListener("submit", function (e) {
  e.preventDefault();
  const formData = new FormData(this);
  const newEntry = {};

  formData.forEach((value, key) => {
    newEntry[key] = value;
  });

  // storagi xomali
  const existingData = JSON.parse(localStorage.getItem("master_list") || "[]");
  existingData.push(newEntry);
  localStorage.setItem("master_list", JSON.stringify(existingData));

  updateCount();
  document.getElementById("form-view").classList.add("hidden");
  document.getElementById("success-view").classList.remove("hidden");
});

function exportMasterFile() {
  const data = JSON.parse(localStorage.getItem("master_list") || "[]");
  if (data.length === 0) return alert("No data to export!");

  const ws = XLSX.utils.json_to_sheet(data);
  ws["!views"] = [{ RTL: true }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "MasterReport");
  XLSX.writeFile(wb, `Master_Collection_${new Date().toLocaleDateString()}.xlsx`);
}

function updateCount() {
  const data = JSON.parse(localStorage.getItem("master_list") || "[]");
  document.getElementById("entry-count").textContent = data.length;
}

function clearDatabase() {
  if (confirm("Are you sure? This deletes all stored entries!")) {
    localStorage.removeItem("master_list");
    updateCount();
  }
}

function resetForm() {
  document.getElementById("dynamic-form").reset();
  document.getElementById("success-view").classList.add("hidden");
  document.getElementById("form-view").classList.remove("hidden");
}

init();

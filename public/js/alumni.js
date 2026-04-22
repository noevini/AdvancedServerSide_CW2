// Alumni page — search and multi-filter logic for the alumni table

const searchInput = document.getElementById("searchInput");
const filterProgramme = document.getElementById("filterProgramme");
const filterYear = document.getElementById("filterYear");
const filterIndustry = document.getElementById("filterIndustry");
const clearBtn = document.getElementById("clearFilters");
const table = document.getElementById("alumniTable");
const tbody = table.querySelector("tbody");
const rows = Array.from(tbody.getElementsByTagName("tr"));

// Populate a select dropdown with unique values from a row data attribute
function populateSelect(select, attribute) {
  const values = new Set();
  rows.forEach((row) => {
    const val = row.getAttribute(attribute);
    if (val) values.add(val);
  });
  Array.from(values).sort().forEach((val) => {
    const option = document.createElement("option");
    option.value = val;
    option.textContent = val;
    select.appendChild(option);
  });
}

populateSelect(filterProgramme, "data-degree");
populateSelect(filterYear, "data-year");
populateSelect(filterIndustry, "data-industry");

// Keep export links in sync with the current filter state
function updateExportLinks() {
  const params = new URLSearchParams();
  if (searchInput.value) params.set("search", searchInput.value);
  if (filterProgramme.value) params.set("programme", filterProgramme.value);
  if (filterYear.value) params.set("year", filterYear.value);
  if (filterIndustry.value) params.set("industry", filterIndustry.value);
  const qs = params.toString();
  const suffix = qs ? "?" + qs : "";
  document.getElementById("exportCsv").href = "/export/csv" + suffix;
  document.getElementById("exportPdf").href = "/export/pdf" + suffix;
}

// Apply all active filters and the search term to the table rows
function applyFilters() {
  const search = searchInput.value.toLowerCase();
  const programme = filterProgramme.value;
  const year = filterYear.value;
  const industry = filterIndustry.value;

  rows.forEach((row) => {
    const text = row.textContent.toLowerCase();
    const matchSearch = !search || text.includes(search);
    const matchProgramme = !programme || row.getAttribute("data-degree") === programme;
    const matchYear = !year || row.getAttribute("data-year") === year;
    const matchIndustry = !industry || row.getAttribute("data-industry") === industry;

    row.style.display = matchSearch && matchProgramme && matchYear && matchIndustry ? "" : "none";
  });
  updateExportLinks();
}

searchInput.addEventListener("input", applyFilters);
filterProgramme.addEventListener("change", applyFilters);
filterYear.addEventListener("change", applyFilters);
filterIndustry.addEventListener("change", applyFilters);

// Reset all filters, show all rows, and reset export links
clearBtn.addEventListener("click", () => {
  searchInput.value = "";
  filterProgramme.value = "";
  filterYear.value = "";
  filterIndustry.value = "";
  applyFilters();
});

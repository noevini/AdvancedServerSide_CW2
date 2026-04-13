// Alumni page — filters the table rows based on the search input

const searchInput = document.getElementById("searchInput");
const table = document.getElementById("alumniTable");
const rows = table.getElementsByTagName("tr");

// Listen for input events on the search box
searchInput.addEventListener("input", function () {
  const filter = searchInput.value.toLowerCase();

  // Loop through all table rows (skip the header row at index 0)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const text = row.textContent.toLowerCase();

    // Show the row if it matches the search, hide it if not
    if (text.includes(filter)) {
      row.style.display = "";
    } else {
      row.style.display = "none";
    }
  }
});

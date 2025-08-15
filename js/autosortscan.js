(function () {
    var csInterface = new CSInterface();

    // Load ExtendScript scan file
    csInterface.evalScript('$.evalFile("' + csInterface.getSystemPath(SystemPath.EXTENSION) + '/jsx/autosortscan.jsx")');

    var sorterModal = document.getElementById("sorterModal");
    var btnAutoSort = document.getElementById("btnAutoSort");
    var closeSorterModal = document.getElementById("closeSorterModal");
    var runAutoSortBtn = document.getElementById("runAutoSort");


    // Open modal & run scan
    btnAutoSort.addEventListener("click", function () {
        sorterModal.style.display = "block";
        sorterResults.innerHTML = "<p>Scanning project...</p>";

        csInterface.evalScript("scanProjectItems()", function (res) {
            alert("Raw scan result:", res);
            try {
                var data = JSON.parse(res);
                if (data.error) {
                    sorterResults.innerHTML = "<p style='color:red'>" + data.error + "</p>";
                } else {
                    let html = `<ul class="sorter-list">`;
                    Object.keys(data).forEach(function (key) {
                        html += `
                            <li class="sorter-item" data-type="${key}">
                                <span class="item-name">${capitalizeFirstLetter(key)}</span>
                                <span class="item-count">${data[key]}</span>
                            </li>
                        `;
                    });
                    html += `</ul>`;
                    sorterResults.innerHTML = html;
                }
            } catch (e) {
                sorterResults.innerHTML = "<p style='color:red'>Failed to parse scan results</p>";
                console.error("Parse error:", e, "Raw result:", res);
            }
        });
    });

    // Close modal
    closeSorterModal.addEventListener("click", function () {
        sorterModal.style.display = "none";
    });

    // Close when clicking outside modal
    window.addEventListener("click", function (event) {
        if (event.target === sorterModal) {
            sorterModal.style.display = "none";
        }
    });

    function capitalizeFirstLetter(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // ====== SORTER MODAL ======
    btnAutoSort.addEventListener("click", function () {
        sorterModal.style.display = "block";
    });

    // Close modal
    closeSorterModal.addEventListener("click", function () {
        sorterModal.style.display = "none";
    });

    // Close modal when clicking outside content
    window.addEventListener("click", function (event) {
        if (event.target === sorterModal) {
            sorterModal.style.display = "none";
        }
    });

    // Run Auto Sort
    runAutoSortBtn.addEventListener("click", function () {
        sorterModal.style.display = "none";
        alert("Auto Sort will be executed!");
        // Later here we will call csInterface.evalScript("autoSortResources()");
    });
})();

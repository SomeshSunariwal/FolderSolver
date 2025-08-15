(function () {
    var csInterface = new CSInterface();

    // ensure JSX is loaded
    csInterface.evalScript('$.evalFile("' + csInterface.getSystemPath(SystemPath.EXTENSION) + '/jsx/autosortscan.jsx")');

    var btnAutoSort = document.getElementById("btnAutoSort");
    var sorterModal = document.getElementById("sorterModal");
    var closeSorterModal = document.getElementById("closeSorterModal");
    var sorterResults = document.getElementById("sorterResults");

    var rootBinsCache = null;                 // [{name, index}, ...]
    var selectedTargets = {};                 // { images: {name,index}, videos: {...}, ... }

    function loadRootBins(cb) {
        if (rootBinsCache) { cb(rootBinsCache); return; }
        csInterface.evalScript("getRootBins()", function (res) {
            try {
                var data = JSON.parse(res);
                if (data && data.bins) { rootBinsCache = data.bins; cb(rootBinsCache); }
                else { cb([]); }
            } catch (e) {
                console.error("Failed to parse getRootBins:", e, res);
                cb([]);
            }
        });
    }

    function renderList(counts) {
        let html = `
        <table class="sorter-table">
            <thead>
                <tr>
                    <th style="width:60px; text-align:center;">Count</th>
                    <th style="text-align:left;">Type</th>
                    <th style="text-align:left;">Selected Folder</th>
                </tr>
            </thead>
            <tbody>
    `;

        Object.keys(counts).forEach(function (key) {
            const label = counts[key].label || key;
            const count = (typeof counts[key].count === "number") ? counts[key].count : 0;
            const selectedName = (selectedTargets[key] && selectedTargets[key].name) ? selectedTargets[key].name : "None";

            html += `
                <tr class="sorter-item" data-type="${key}">
                    <td class="item-count">${count}</td>
                    <td class="item-name">${label}</td>
                    <td class="selected-cell">
                        <div class="selected-line"><strong class="selected-name">${selectedName}</strong></div>
                        <div class="picker hidden">
                            <div class="picker-title">Select a root folder</div>
                            <ul class="folder-list"></ul>
                        </div>
                    </td>
                </tr>
                `;
        });

        html += `</tbody></table>`;
        sorterResults.innerHTML = html;

        // Click anywhere on row to expand/collapse picker
        sorterResults.addEventListener("click", function (e) {
            const row = e.target.closest(".sorter-item");
            if (!row) return;

            const picker = row.querySelector(".picker");
            const folderUl = row.querySelector(".folder-list");
            const typeKey = row.getAttribute("data-type");

            // Collapse all others
            sorterResults.querySelectorAll(".picker").forEach(p => {
                if (p !== picker) p.classList.add("hidden");
            });

            // Toggle current
            const willOpen = picker.classList.contains("hidden");
            if (willOpen) picker.classList.remove("hidden");
            else picker.classList.add("hidden");

            // Lazy-load folders if opening for first time
            if (willOpen && folderUl.getAttribute("data-loaded") !== "1") {
                loadRootBins(function (bins) {
                    let liHtml = "";
                    for (let b = 0; b < bins.length; b++) {
                        const sel = (selectedTargets[typeKey] && selectedTargets[typeKey].index === bins[b].index) ? " folder-item--selected" : "";
                        liHtml += `
                    <li class="folder-item${sel}" data-bin-index="${bins[b].index}">
                        <span class="folder-name">${bins[b].name}</span>
                    </li>`;
                    }
                    if (!bins.length) {
                        liHtml = `<li class="folder-item disabled"><span class="folder-name">No folders found</span></li>`;
                    }
                    folderUl.innerHTML = liHtml;
                    folderUl.setAttribute("data-loaded", "1");
                });
            }
        });

        // Folder selection
        sorterResults.addEventListener("click", function (e) {
            const item = e.target.closest(".folder-item");
            if (!item || item.classList.contains("disabled")) return;

            const row = item.closest(".sorter-item");
            const ul = item.closest(".folder-list");
            const typeKey = row.getAttribute("data-type");

            // Clear selection in this list
            ul.querySelectorAll(".folder-item").forEach(x => x.classList.remove("folder-item--selected"));
            item.classList.add("folder-item--selected");

            // Save selection
            const idx = parseInt(item.getAttribute("data-bin-index"), 10);
            const name = item.querySelector(".folder-name").textContent;
            selectedTargets[typeKey] = { index: idx, name: name };

            // Update visible text in Selected column
            row.querySelector(".selected-name").textContent = name;
        });

    }


    function attachItemHandlers(itemEl) {
        var row = itemEl.querySelector(".sorter-row");
        var picker = itemEl.querySelector(".picker");
        var folderUl = itemEl.querySelector(".folder-list");
        var typeKey = itemEl.getAttribute("data-type");

        row.addEventListener("click", function () {
            var isHidden = picker.classList.contains("hidden");

            // close all pickers
            var allPickers = sorterResults.querySelectorAll(".picker");
            for (var j = 0; j < allPickers.length; j++) {
                allPickers[j].classList.add("hidden");
            }

            // open only this one if it was hidden
            if (isHidden) picker.classList.remove("hidden");

            if (folderUl.getAttribute("data-loaded") === "1") return;

            loadRootBins(function (bins) {
                var liHtml = "";
                for (var b = 0; b < bins.length; b++) {
                    var sel = (selectedTargets[typeKey] && selectedTargets[typeKey].index === bins[b].index) ? " folder-item--selected" : "";
                    liHtml += ''
                        + '<li class="folder-item' + sel + '" data-bin-index="' + bins[b].index + '">'
                        + '<span class="folder-name">' + bins[b].name + '</span>'
                        + '</li>';
                }
                if (!bins.length) {
                    liHtml = '<li class="folder-item disabled"><span class="folder-name">No root folders found</span></li>';
                }
                folderUl.innerHTML = liHtml;
                folderUl.setAttribute("data-loaded", "1");

                var folderItems = folderUl.querySelectorAll(".folder-item");
                for (var k = 0; k < folderItems.length; k++) {
                    if (folderItems[k].classList.contains("disabled")) continue;
                    folderItems[k].addEventListener("click", function () {
                        var sib = folderUl.querySelectorAll(".folder-item");
                        for (var s = 0; s < sib.length; s++) { sib[s].classList.remove("folder-item--selected"); }
                        this.classList.add("folder-item--selected");

                        var idx = parseInt(this.getAttribute("data-bin-index"), 10);
                        var name = this.querySelector(".folder-name").textContent;

                        selectedTargets[typeKey] = { index: idx, name: name };

                        var selNameEl = itemEl.querySelector(".selected-name");
                        selNameEl.textContent = name;
                    });
                }
            });
        });
    }

    // Open modal & run scan
    btnAutoSort.addEventListener("click", function () {
        selectedTargets = {};         // ✅ reset selections
        rootBinsCache = null;         // ✅ force fresh bin fetch
        sorterResults.innerHTML = "<p>Scanning project...</p>";

        sorterModal.style.display = "block";

        loadRootBins(function () { });

        csInterface.evalScript("scanProjectItems()", function (res) {
            try {
                var data = JSON.parse(res);
                if (data && !data.error) {
                    renderList(data);
                } else {
                    sorterResults.innerHTML = `<p style='color:red'>${(data && data.error) ? data.error : "Scan failed"}</p>`;
                }
            } catch (e) {
                console.error("scan parse error:", e, res);
                sorterResults.innerHTML = "<p style='color:red'>Failed to parse scan results</p>";
            }
        });
    });

    closeSorterModal.addEventListener("click", function () {
        sorterModal.style.display = "none";
    });

    window.addEventListener("click", function (evt) {
        if (evt.target === sorterModal) sorterModal.style.display = "none";
    });


    // Handle Transfer button click
    document.getElementById("btnExecuteTransfer").addEventListener("click", function () {
        // Do your transfer here
        alert("Transferring:", selectedTargets);

        alert("Selected targets:\n" + JSON.stringify(selectedTargets, null, 2));

        // === RESET EVERYTHING ===
        selectedTargets = [];

        // Uncheck all checkboxes
        document.querySelectorAll("#sorterResults input[type='checkbox']").forEach(cb => cb.checked = false);

        // If you want to clear the list completely:
        // document.getElementById("sorterResults").innerHTML = "";

        // Close the modal
        document.getElementById("sorterModal").style.display = "none";
    });

    document.getElementById("closeSorterModal").addEventListener("click", function () {
        selectedTargets = [];
        document.querySelectorAll("#sorterResults input[type='checkbox']").forEach(cb => cb.checked = false);
        document.getElementById("sorterModal").style.display = "none";
    });


    // (Optional) expose selections for next step (moving)
    window.__autoSortSelections = function () { return JSON.parse(JSON.stringify(selectedTargets)); };
})();

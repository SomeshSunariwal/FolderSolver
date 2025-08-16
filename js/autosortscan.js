(function () {
    var csInterface = new CSInterface();

    // Load JSX
    csInterface.evalScript('$.evalFile("' + csInterface.getSystemPath(SystemPath.EXTENSION) + '/jsx/autosortscan.jsx")');

    var btnAutoSort = document.getElementById("btnAutoSort");
    var sorterModal = document.getElementById("sorterModal");
    var closeSorterModal = document.getElementById("closeSorterModal");
    var sorterResults = document.getElementById("sorterResults");
    var btnExecuteTransfer = document.getElementById("btnExecuteTransfer");

    var rootBinsCache = null;       // [{name, index}, ...]
    var selectedTargets = {};       // { images: {name,index}, videos: {...} }

    // Load root bins from After Effects
    function loadRootBins(cb) {
        if (rootBinsCache) {
            cb(rootBinsCache); return;
        }
        csInterface.evalScript("getRootBins()", function (res) {
            try {
                var data = JSON.parse(res);
                if (data && data.bins) { rootBinsCache = data.bins; cb(rootBinsCache); }
                else { cb([]); }
            } catch (e) {
                alert("Failed to parse getRootBins:", e, res);
                cb([]);
            }
        });
    }

    // Render the table
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
            if (count <= 0) {
                return;
            }
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
    }

    window.__adobe_cep__.addEventListener("progressUpdate", function (e) {
        updateProgress(parseInt(e.data, 10));
    });

    function updateProgress(percent) {
        var container = document.getElementById("progressContainer");
        var bar = document.getElementById("progressBar");
        var text = document.getElementById("progressText");

        container.style.display = "block";
        bar.style.width = percent + "%";
        text.textContent = percent + "%";

        if (percent >= 100) {
            setTimeout(() => {
                container.style.display = "none";
                bar.style.width = "0%";
                text.textContent = "0%";
            }, 500); // hide automatically after 0.5s
        }
    }

    // Handle all clicks inside the table
    sorterResults.addEventListener("click", function (e) {
        const row = e.target.closest(".sorter-item");
        const folderItem = e.target.closest(".folder-item");

        // === Folder selection ===
        if (folderItem && !folderItem.classList.contains("disabled")) {
            const ul = folderItem.closest(".folder-list");
            const typeKey = folderItem.closest(".sorter-item").getAttribute("data-type");

            // Clear previous selection
            ul.querySelectorAll(".folder-item").forEach(x => x.classList.remove("folder-item--selected"));
            folderItem.classList.add("folder-item--selected");

            // Save selection
            const idx = parseInt(folderItem.getAttribute("data-bin-index"), 10);
            const name = folderItem.querySelector(".folder-name").textContent;
            selectedTargets[typeKey] = { index: idx, name: name };

            // Update visible text
            folderItem.closest(".sorter-item").querySelector(".selected-name").textContent = name;

            return; // stop here if a folder was clicked
        }

        // === Row click (toggle picker) ===
        if (row) {
            const picker = row.querySelector(".picker");
            const folderUl = row.querySelector(".folder-list");

            // Collapse other pickers
            sorterResults.querySelectorAll(".picker").forEach(p => {
                if (p !== picker) p.classList.add("hidden");
            });

            // Toggle current picker
            const willOpen = picker.classList.contains("hidden");
            picker.classList.toggle("hidden", !willOpen);

            // Lazy load folders if opening first time
            if (willOpen && folderUl.getAttribute("data-loaded") !== "1") {
                loadRootBins(function (bins) {
                    let liHtml = "";
                    const typeKey = row.getAttribute("data-type");
                    for (let b = 0; b < bins.length; b++) {
                        const sel = (selectedTargets[typeKey] && selectedTargets[typeKey].index === bins[b].index) ? " folder-item--selected" : "";
                        liHtml += `<li class="folder-item${sel}" data-bin-index="${bins[b].index}" style="cursor:pointer;"><span class="folder-name">${bins[b].name}</span></li>`;
                    }
                    if (!bins.length) liHtml = `<li class="folder-item disabled"><span class="folder-name">No folders found</span></li>`;
                    folderUl.innerHTML = liHtml;
                    folderUl.setAttribute("data-loaded", "1");
                });
            }
        }
    });

    // Open modal & run scan
    btnAutoSort.addEventListener("click", function () {
        selectedTargets = {};  // reset selections
        rootBinsCache = null;  // force fresh fetch
        sorterResults.innerHTML = "<p>Scanning project...</p>";
        sorterModal.style.display = "block";

        csInterface.evalScript("scanProjectItems()", function (res) {
            try {
                var data = JSON.parse(res);
                if (data && !data.error) {
                    renderList(data);
                } else {
                    sorterResults.innerHTML = `<p style='color:red'>${(data && data.error) ? data.error : "Scan failed"}</p>`;
                }
            } catch (e) {
                alert("scan parse error:", e, res);
                sorterResults.innerHTML = "<p style='color:red'>Failed to parse scan results</p>";
            }
        });
    });


    // Execute Transfer
    btnExecuteTransfer.addEventListener("click", function () {
        if (Object.keys(selectedTargets).length === 0) {
            alert("No folders selected!");
            return;
        }

        // Call your JSX function to move items
        csInterface.evalScript(`moveItemsToSelectedBins('${JSON.stringify(selectedTargets)}')`, function (res) {
            try {
                var data = JSON.parse(res);
                if (data.success) {
                    alert("Items moved successfully!");
                } else if (data.error) {
                    alert("Error: " + data.error);
                }
            } catch (e) {
                alert("Unexpected error: " + res);
            }
        });

        // Reset everything
        selectedTargets = {};
        sorterModal.style.display = "none";
    });

    btnCountResources.addEventListener("click", function () {
        resourceResults.innerHTML = "<p>Scanning project...</p>";
        resourceModal.style.display = "block";

        csInterface.evalScript(`scanProjectItemsRecursive()`, function (res) {
            try {
                var data = JSON.parse(res);

                let html = `<table class="sorter-table">
                                <thead>
                                    <tr>
                                        <th style="text-align:left;">Resource Type</th>
                                        <th style="width:60px; text-align:center;">Count</th>
                                    </tr>
                                </thead>
                                <tbody>`;
                Object.keys(data).forEach(function (key) {
                    const label = data[key].label || key;
                    const count = data[key].count || 0;
                    if (count <= 0) {
                        return
                    }; // skip empty counts
                    html += `<tr>
                                <td style="text-align:left;">${label}</td>
                                <td style="text-align:center;">${count}</td>
                             </tr>`;
                });
                html += `</tbody></table>`;

                resourceResults.innerHTML = html;

            } catch (e) {
                resourceResults.innerHTML = "<p style='color:red'>Failed to scan resources</p>";
                alert("Resource scan error:", e, res);
            }
        });
    });

    // Close resource modal
    closeResourceModal.addEventListener("click", function () {
        resourceModal.style.display = "none";
    });

    window.addEventListener("click", function (evt) {
        if (evt.target === resourceModal) resourceModal.style.display = "none";
    });

    // Close modal
    closeSorterModal.addEventListener("click", function () {
        sorterModal.style.display = "none";
    });

    window.addEventListener("click", function (evt) {
        if (evt.target === sorterModal) {
            sorterModal.style.display = "none";
        }
    });

    // Expose selections for other scripts
    window.__autoSortSelections = function () {
        return JSON.parse(JSON.stringify(selectedTargets));
    };

})();

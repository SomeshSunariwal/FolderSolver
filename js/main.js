(function () {

    var csInterface = new CSInterface();
    // Load the ExtendScript file into Premiere
    csInterface.evalScript('$.evalFile("' + csInterface.getSystemPath(SystemPath.EXTENSION) + '/jsx/extendscript.jsx")');

    // === Global Config File Path ===
    var userDataDir = csInterface.getSystemPath(SystemPath.USER_DATA);
    var configFilePath = userDataDir + "/Adobe/CEP/extensions/FolderSolver/config.json";

    var folderListEl = document.getElementById("folderList");
    var btnAddTop = document.getElementById("btnAddTop");
    var btnAddToProject = document.getElementById("btnAddToProject");

    // ====== SAVE / LOAD (GLOBAL) ======
    function collectFolderNames() {
        var names = [];
        var items = folderListEl.querySelectorAll(".list-item");
        items.forEach(function (li) {
            var name =
                li.dataset.folderName ||
                (li.querySelector(".list-item__name") && li.querySelector(".list-item__name").textContent) ||
                (li.querySelector(".list-item__edit") && li.querySelector(".list-item__edit").value) ||
                "";
            name = (name || "").trim();
            if (name) {
                names.push(name);
            }
        });
        return names;
    }


    function ensureConfigDirExists() {
        var dirPath = userDataDir + "/Adobe/CEP/extensions/FolderSolver";
        var dirCheck = window.cep.fs.readdir(dirPath);
        if (dirCheck.err !== 0) {
            // create directory
            var createDirResult = window.cep.fs.makedir(dirPath);
            if (createDirResult.err !== 0) {
                alert("Failed to create config directory", createDirResult);
            }
        }
    }

    function saveFolderList() {
        ensureConfigDirExists();
        const names = collectFolderNames();
        try {
            var json = JSON.stringify(names, null, 4);
            var result = window.cep.fs.writeFile(configFilePath, json);
            if (result.err !== 0) {
                alert("Error saving folder list:", result);
            }
        } catch (e) {
            alert("Error in saveFolderList:", e);
        }
    }

    function ensureConfigDirExists() {
        var dirPath = userDataDir + "/Adobe/CEP/extensions/FolderSolver";
        var dirCheck = window.cep.fs.readdir(dirPath);
        if (dirCheck.err !== 0) {
            // create directory
            var createDirResult = window.cep.fs.makedir(dirPath);
            if (createDirResult.err !== 0) {
                alert("Failed to create config directory", createDirResult);
            }
        }
    }

    // ====== UI CREATION ======

    function createIconButton(title, innerHTML, onClick, extraClass = "") {
        var btn = document.createElement("button");
        btn.className = `icon-btn icon-btn--sm ${extraClass}`;
        btn.title = title;
        btn.setAttribute("aria-label", title);
        if (innerHTML) {
            btn.innerHTML = innerHTML;
        }
        btn.addEventListener("click", onClick);
        return btn;
    }

    function createActionsDiv(li, name, isEditing = false) {
        var div = document.createElement("div");
        div.className = "list-item__actions";

        var renameBtn = createIconButton("Rename", pencilSVG(), function () {
            if (isEditing) {
                li.querySelector("input")?.focus();
            }
            else {
                startRename(li, name);
            }
        });

        var deleteBtn = createIconButton("Delete", "x", function () {
            li.remove();
            saveFolderList();
        }, "icon-btn--danger");

        div.appendChild(renameBtn);
        div.appendChild(deleteBtn);
        return div;
    }

    function commitEdit(li, rawName, options = { save: true }) {
        var name = (rawName || "").trim();
        if (!name) {
            li.remove();
            if (options.save) {
                saveFolderList();
            }
            return;
        }

        li.innerHTML = "";

        var span = document.createElement("span");
        span.className = "list-item__name";
        span.textContent = name;
        span.tabIndex = 0;
        span.addEventListener("dblclick", () => startRename(li, name));

        li.appendChild(span);
        li.appendChild(createActionsDiv(li, name));

        li.dataset.folderName = name;

        if (options.save) {
            saveFolderList();
        }
    }

    function startRename(li, currentName) {
        li.innerHTML = "";

        var input = document.createElement("input");
        input.type = "text";
        input.className = "list-item__edit";
        input.value = currentName || "";

        li.appendChild(input);
        li.appendChild(createActionsDiv(li, currentName, true));

        setTimeout(() => {
            input.focus(); input.select();
        }, 0);

        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                commitEdit(li, input.value);
            } else if (e.key === "Escape") {
                if (!currentName || !currentName.trim()) {
                    li.remove();
                    saveFolderList();
                } else {
                    commitEdit(li, currentName);
                }
            }
        });

        input.addEventListener("blur", () => commitEdit(li, input.value));
    }

    function createEditingRow(initialText) {
        var li = document.createElement("li");
        li.className = "list-item";

        var input = document.createElement("input");
        input.type = "text";
        input.className = "list-item__edit";
        input.placeholder = "Enter folder name";

        if (initialText) {
            input.value = initialText;
        }

        li.appendChild(input);
        li.appendChild(createActionsDiv(li, initialText, true));

        setTimeout(() => {
            input.focus();
        }, 0);

        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                commitEdit(li, input.value);
            } else if (e.key === "Escape") {
                li.remove();
                saveFolderList();
            }
        });

        input.addEventListener("blur", () => commitEdit(li, input.value));

        return li;
    }


    function pencilSVG() {
        return (
            '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M12 20h9" />' +
            '<path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />' +
            "</svg>"
        );
    }

    // ====== BUTTON HANDLERS ======
    btnAddTop.addEventListener("click", function () {
        var baseName = "New Folder";
        var counter = 1;
        var existingNames = collectFolderNames();
        var newName = baseName;

        while (existingNames.includes(newName)) {
            newName = `${baseName} ${counter}`;
            counter++;
        }

        var li = createEditingRow(newName);
        folderListEl.appendChild(li);
        saveFolderList();

        var input = li.querySelector("input");
        if (input) {
            input.focus();
            input.select();
        }
    });

    btnAddToProject.addEventListener("click", function () {
        var active = document.activeElement;
        if (active && active.classList && active.classList.contains("list-item__edit")) {
            active.blur();
        }

        var folderNames = collectFolderNames();
        if (!folderNames.length) {
            try {
                alert("No folders to add.");
            } catch (e) { console.log("No folders to add."); }
            return;
        }

        var proceed = confirm("Are you sure you want to add these folders to the project?");
        if (!proceed) {
            return;
        }

        saveFolderList();

        var json = JSON.stringify(folderNames);
        var escaped = json.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
        try {
            csInterface.evalScript("addFoldersToPremiere('" + escaped + "')", function (res) {
                alert("Folder Added Successfully", res);
            });
        } catch (e) {
            alert("Error calling ExtendScript: " + e);
        }
    });


    // Reset Folders to Default
    document.getElementById("btnReset").addEventListener("click", function () {
        // 1️⃣ Define default folder list
        var defaultFolders = [
            "Adjustment Layers",
            "Audios",
            "Color Matte",
            "Images",
            "Stock Videos",
            "Sequences",
            "Mogrt"
        ];

        // 2️⃣ Clear current UI
        folderListEl.innerHTML = "";

        // 3️⃣ Add default folders to UI
        defaultFolders.forEach(function (name) {
            var li = createEditingRow(name);
            folderListEl.appendChild(li);
        });

        // 4️⃣ Save to config.json
        ensureConfigDirExists();
        try {
            var json = JSON.stringify(defaultFolders, null, 4);
            var result = window.cep.fs.writeFile(configFilePath, json);
            if (result.err !== 0) {
                alert("Error saving default folders:", result);
            } else {
                // Optional: confirmation message
                document.getElementById("sorterResults").innerHTML = "<p style='color:green'>Folders reset to default.</p>";
            }
        } catch (e) {
            alert("Error resetting folders.");
        }
    });

    function loadFolderList() {
        try {
            var result = window.cep.fs.readFile(configFilePath);
            if (result.err === 0 && result.data) {
                const names = JSON.parse(result.data);
                names.forEach(name => {
                    const li = document.createElement("li");
                    li.className = "list-item";
                    commitEdit(li, name, { save: false });  // ✅ Good, commits the folder immediately
                    folderListEl.appendChild(li);
                });
            }
        } catch (e) {
            alert("Failed to load folder list", e);
        }
    }

    // ====== INIT ======
    loadFolderList();

})();

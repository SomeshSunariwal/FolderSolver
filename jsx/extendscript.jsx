function addFoldersToPremiere(jsonStr) {
    try {
        // Parse JSON robustly (older ExtendScript may not have JSON.parse)
        var folderNames;
        if (typeof JSON !== "undefined" && JSON.parse) {
            folderNames = JSON.parse(jsonStr);
        } else {
            folderNames = eval(jsonStr);
        }

        if (!folderNames || folderNames.length === 0) {
            return "No folders provided.";
        }

        if (!app || !app.project) {
            return "No active project found.";
        }

        var root = app.project.rootItem;
        var created = 0;
        for (var i = 0; i < folderNames.length; i++) {
            var raw = folderNames[i];

            // Coerce to string (handles objects/String objects/null/undefined)
            var nameStr = (raw === null || raw === undefined) ? "" : String(raw);

            // Trim using regex (safe in ExtendScript)
            nameStr = nameStr.replace(/^\s+|\s+$/g, "");

            if (!nameStr) {
                continue;
            }

            try {
                root.createBin(nameStr);
                created++;
            } catch (errCreate) {
                $.writeln("createBin failed for '" + nameStr + "': " + errCreate);
            }
        }

        return "OK: " + created + " folder(s) created.";
    } catch (e) {
        // Return error text so the evalScript callback receives meaningful info
        return "ERROR: " + (e && e.toString ? e.toString() : e);
    }
}
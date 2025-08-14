function addFoldersToPremiere(jsonStr) {
    try {
        // Parse JSON safely
        var folderNames = (typeof JSON !== "undefined" && JSON.parse)
            ? JSON.parse(jsonStr)
            : eval(jsonStr);

        if (!folderNames || !folderNames.length) return "No folders provided.";

        if (!app || !app.project) return "No active project found.";

        var root = app.project.rootItem;
        var created = 0, skipped = 0;

        // Check if bin exists in root
        function binExists(name) {
            for (var i = 0; i < root.children.numItems; i++) {
                var item = root.children[i];
                if (item && item.name === name && item.type === ProjectItemType.BIN) {
                    return true;
                }
            }
            return false;
        }

        for (var i = 0; i < folderNames.length; i++) {
            var name = String(folderNames[i] || "").replace(/^\s+|\s+$/g, "");
            if (!name) continue;

            if (binExists(name)) {
                skipped++;
            } else {
                try {
                    root.createBin(name);
                    created++;
                } catch (err) {
                    $.writeln("Failed to create folder '" + name + "': " + err);
                }
            }
        }

        return "OK: " + created + " created, " + skipped + " skipped.";
    } catch (e) {
        return "ERROR: " + (e && e.toString ? e.toString() : e);
    }
}
function scanProjectItems() {
    try {
        alert("Starting scan...");
        if (!app || !app.project) {
            return JSON.stringify({ error: "No active project found" });
        }

        // Helper for old JS engine: check if value is in array
        function inArray(val, arr) {
            for (var i = 0; i < arr.length; i++) {
                if (arr[i] === val) return true;
            }
            return false;
        }

        // --- CONFIG: Add or remove scan categories here ---
        var scanConfig = [
            {
                key: "images",
                label: "Images",
                match: function (item) {
                    var ext = item.name.toLowerCase().split('.').pop();
                    return inArray(ext, ["jpg", "jpeg", "png", "tif", "tiff", "gif", "bmp", "psd"]);
                }
            },
            {
                key: "videos",
                label: "Videos",
                match: function (item) {
                    if (item.type === ProjectItemType.SEQUENCE) return false;
                    var ext = item.name.toLowerCase().split('.').pop();
                    return inArray(ext, ["mp4", "mov", "avi", "mxf", "mkv", "wmv"]);
                }
            },
            {
                key: "sequences",
                label: "Sequences",
                match: function (item) {
                    try {
                        return (item && item.isSequence && item.isSequence() === true);
                    } catch (e) {
                        return false;
                    }
                }
            },
            {
                key: "colorMattes",
                label: "Color Mattes",
                match: function (item) {
                    return item.name.toLowerCase().indexOf("color matte") >= 0;
                }
            }
        ];
        // ----------------------------------------------------

        // Initialize counts dynamically
        var counts = {};
        for (var i = 0; i < scanConfig.length; i++) {
            counts[scanConfig[i].key] = 0;
        }

        // Traverse bins recursively
        function traverse(folder) {
            for (var i = 0; i < folder.children.numItems; i++) {
                var item = folder.children[i];
                if (item.type === ProjectItemType.BIN) {
                    traverse(item);
                } else {
                    for (var j = 0; j < scanConfig.length; j++) {
                        if (scanConfig[j].match(item)) {
                            counts[scanConfig[j].key]++;
                        }
                    }
                }
            }
        }

        traverse(app.project.rootItem);

        return JSON.stringify(counts);
    } catch (e) {
        return JSON.stringify({ error: e.toString() });
    }
}

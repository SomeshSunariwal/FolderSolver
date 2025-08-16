



function getScanConfig() {
    function inArray(val, arr) {
        for (var i = 0; i < arr.length; i++) if (arr[i] === val) return true;
        return false;
    }

    return [
        {
            key: "images",
            label: "Images",
            match: function (item) {
                if (!item || !item.name) return false;
                var ext = item.name.toLowerCase().split('.').pop();
                return inArray(ext, ["jpg", "jpeg", "png", "tif", "tiff", "gif", "bmp", "psd", "webp"]);
            }
        },
        {
            key: "videos",
            label: "Videos",
            match: function (item) {
                if (item && item.isSequence && item.isSequence()) return false;
                if (!item || !item.name) return false;
                var ext = item.name.toLowerCase().split('.').pop();
                return inArray(ext, ["mp4", "mov", "avi", "mxf", "mkv", "wmv"]);
            }
        },
        {
            key: "sequences",
            label: "Sequences",
            match: function (item) {
                try { return (item && item.isSequence && item.isSequence()); }
                catch (e) { return false; }
            }
        },
        {
            key: "colorMattes",
            label: "Color Mattes",
            match: function (item) {
                if (!item || !item.name) return false;
                return item &&
                    item.type === ProjectItemType.CLIP &&
                    item.name && item.name.toLowerCase().indexOf("color matte") >= 0;
            }
        },
        {
            key: "audio",
            label: "Audio Clips",
            match: function (item) {
                if (!item || !item.name) return false;
                var ext = item.name.toLowerCase().split('.').pop();
                return inArray(ext, ["mp3", "wav", "aiff", "m4a"]);
            }
        },
        {
            key: "motionGraphics",
            label: "Motion Graphics",
            match: function (item) {
                if (!item || !item.name) return false;
                var ext = item.name.toLowerCase().split('.').pop();
                return inArray(ext, ["mogrt"]) ||
                    (item.type && item.type === ProjectItemType.CLIP && item.isSequence && item.isSequence() && item.mainTrackType === "Video");
            }
        },
        {
            key: "adjustmentLayers",
            label: "Adjustment Layers",
            match: function (item) {
                if (!item || !item.name) return false;
                return item.name.toLowerCase().indexOf("adjustment layer") >= 0;
            }
        },
        {
            key: "subtitles",
            label: "Subtitles / Captions",
            match: function (item) {
                if (!item || !item.name) return false;
                return item.name.toLowerCase().indexOf("caption") >= 0 ||
                    item.type === ProjectItemType.CAPTION ||
                    item.name.toLowerCase().indexOf("subtitle") >= 0;
            }
        }
    ];
}



function scanProjectItems() {
    try {
        if (!app || !app.project) {
            return JSON.stringify({ error: "No active project found" });
        }

        var scanConfig = getScanConfig();

        // Initialize result counts
        var result = {};
        for (var i = 0; i < scanConfig.length; i++) {
            result[scanConfig[i].key] = { label: scanConfig[i].label, count: 0 };
        }

        var root = app.project.rootItem;
        for (var c = 0; c < root.children.numItems; c++) {
            var it = root.children[c];
            // Only count items that are NOT bins
            if (it && it.type !== ProjectItemType.BIN) {
                for (var s = 0; s < scanConfig.length; s++) {
                    if (scanConfig[s].match(it)) {
                        result[scanConfig[s].key].count++;
                    }
                }
            }
        }

        return JSON.stringify(result);
    } catch (e) {
        return JSON.stringify({ error: e.toString() });
    }
}


function scanProjectItemsRecursive() {
    try {
        if (!app || !app.project) {
            return JSON.stringify({ error: "No active project found" });
        }

        var scanConfig = getScanConfig();
        // Initialize result counts
        var result = {};
        for (var i = 0; i < scanConfig.length; i++) {
            result[scanConfig[i].key] = { label: scanConfig[i].label, count: 0 };
        }

        function traverse(item) {
            if (!item) return;

            // Only count items that are NOT bins
            if (item.type !== ProjectItemType.BIN) {
                for (var s = 0; s < scanConfig.length; s++) {
                    if (scanConfig[s].match(item)) {
                        result[scanConfig[s].key].count++;
                    }
                }
            }

            // Recurse into child bins
            if (item.children && item.children.numItems > 0) {
                for (var c = 0; c < item.children.numItems; c++) {
                    traverse(item.children[c]);
                }
            }
        }

        traverse(app.project.rootItem);

        return JSON.stringify(result);
    } catch (e) {
        return JSON.stringify({ error: e.toString() });
    }
}



function getRootBins() {
    try {
        if (!app || !app.project) {
            return JSON.stringify({ error: "No active project found" });
        }
        var root = app.project.rootItem;
        var out = { bins: [] };
        for (var i = 0; i < root.children.numItems; i++) {
            var child = root.children[i];
            if (child && child.type === ProjectItemType.BIN) {
                out.bins.push({ name: child.name, index: i });
            }
        }
        return JSON.stringify(out);
    } catch (e) {
        return JSON.stringify({ error: e.toString() });
    }
}


function moveItemsToSelectedBins(selectionsJSON) {
    try {
        if (!app || !app.project) {
            return JSON.stringify({ error: "No active project found" });
        }


        var selections = JSON.parse(selectionsJSON);

        var root = app.project.rootItem;

        function getRootBinByIndex(idx) {
            if (idx >= 0 && idx < root.children.numItems) {
                var child = root.children[idx];
                if (child && child.type === ProjectItemType.BIN) return child;
            }
            return null;
        }
        var scanConfig = getScanConfig();
        // Count total items for progress
        var totalItems = 0;
        for (var i = 0; i < scanConfig.length; i++) {
            var cfg = scanConfig[i];
            var sel = selections[cfg.key];
            if (sel && typeof sel.index === "number") {
                for (var c = 0; c < root.children.numItems; c++) {
                    var item = root.children[c];
                    if (item && item.type !== ProjectItemType.BIN && cfg.match(item)) totalItems++;
                }
            }
        }

        var movedItems = 0;

        // Only process items directly under root
        for (var i = 0; i < scanConfig.length; i++) {
            var cfg = scanConfig[i];
            var sel = selections[cfg.key];
            if (sel && typeof sel.index === "number") {
                var targetBin = getRootBinByIndex(sel.index);
                if (targetBin) {
                    // Loop backwards to prevent skipping items
                    for (var c = root.children.numItems - 1; c >= 0; c--) {
                        var item = root.children[c];
                        if (item && item.type !== ProjectItemType.BIN && cfg.match(item)) {
                            try {
                                item.moveBin(targetBin);
                                movedItems++;

                                // update progress in panel
                                var percent = Math.round((movedItems / totalItems) * 100);
                                var e = new CSXSEvent();
                                e.type = "progressUpdate";
                                e.data = percent;
                                e.dispatch();

                                $.sleep(300); // slows down process for stability
                            } catch (err) {
                                $.writeln("Failed to move item: " + item.name + " - " + err);
                            }
                        }
                    }
                }
            }
        }
        return JSON.stringify({ success: true });

    } catch (e) {
        return JSON.stringify({ error: e.toString() });
    }
}

function scanProjectItems() {
    try {
        if (!app || !app.project) {
            return JSON.stringify({ error: "No active project found" });
        }

        function inArray(val, arr) {
            for (var i = 0; i < arr.length; i++) if (arr[i] === val) return true;
            return false;
        }

        var scanConfig = [
            {
                key: "images", label: "Images", match: function (item) {
                    if (!item || !item.name) return false;
                    var ext = item.name.toLowerCase().split('.').pop();
                    return inArray(ext, ["jpg", "jpeg", "png", "tif", "tiff", "gif", "bmp", "psd"]);
                }
            },
            {
                key: "videos", label: "Videos", match: function (item) {
                    if (item && item.isSequence && item.isSequence()) return false;
                    if (!item || !item.name) return false;
                    var ext = item.name.toLowerCase().split('.').pop();
                    return inArray(ext, ["mp4", "mov", "avi", "mxf", "mkv", "wmv"]);
                }
            },
            {
                key: "sequences", label: "Sequences", match: function (item) {
                    try { return (item && item.isSequence && item.isSequence()); }
                    catch (e) { return false; }
                }
            },
            {
                key: "colorMattes", label: "Color Mattes", match: function (item) {
                    if (!item || !item.name) return false;
                    return item.name.toLowerCase().indexOf("color matte") >= 0;
                }
            }
        ];

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

        function inArray(val, arr) {
            for (var i = 0; i < arr.length; i++) if (arr[i] === val) return true;
            return false;
        }

        var scanConfig = [
            {
                key: "images", match: function (item) {
                    if (!item || !item.name) return false;
                    var ext = item.name.toLowerCase().split('.').pop();
                    return inArray(ext, ["jpg", "jpeg", "png", "tif", "tiff", "gif", "bmp", "psd"]);
                }
            },
            {
                key: "videos", match: function (item) {
                    if (item && item.isSequence && item.isSequence()) return false;
                    if (!item || !item.name) return false;
                    var ext = item.name.toLowerCase().split('.').pop();
                    return inArray(ext, ["mp4", "mov", "avi", "mxf", "mkv", "wmv"]);
                }
            },
            {
                key: "sequences", match: function (item) {
                    try { return (item && item.isSequence && item.isSequence()); }
                    catch (e) { return false; }
                }
            },
            {
                key: "colorMattes", match: function (item) {
                    if (!item || !item.name) return false;
                    return item.name.toLowerCase().indexOf("color matte") >= 0;
                }
            }
        ];

        var root = app.project.rootItem;

        function getRootBinByIndex(idx) {
            if (idx >= 0 && idx < root.children.numItems) {
                var child = root.children[idx];
                if (child && child.type === ProjectItemType.BIN) return child;
            }
            return null;
        }

        function traverseAndMove(folder, matchFn, targetBin) {
            for (var c = folder.children.numItems - 1; c >= 0; c--) {
                var it = folder.children[c];
                if (it && it.type === ProjectItemType.BIN) {
                    traverseAndMove(it, matchFn, targetBin);
                } else {
                    if (matchFn(it)) {
                        it.moveBin(targetBin);
                    }
                }
            }
        }

        // Process each type in sequence
        for (var i = 0; i < scanConfig.length; i++) {
            var cfg = scanConfig[i];
            var sel = selections[cfg.key];
            if (sel && typeof sel.index === "number") {
                var targetBin = getRootBinByIndex(sel.index);
                if (targetBin) {
                    traverseAndMove(root, cfg.match, targetBin);
                }
            }
        }

        return JSON.stringify({ success: true });

    } catch (e) {
        return JSON.stringify({ error: e.toString() });
    }
}

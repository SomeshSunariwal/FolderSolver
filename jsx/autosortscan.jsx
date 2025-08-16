function loadScanConfig() {
    var scriptFile = new File($.fileName);
    var configFile = new File(scriptFile.path + "/../config/setting.json");
    if (!configFile.exists) {
        return [];
    }
    configFile.open("r");
    var data = configFile.read();
    configFile.close();
    try {
        return JSON.parse(data);
    }
    catch (e) {
        return [];
    }
}

function inArray(val, arr) {
    for (var i = 0; i < arr.length; i++) {
        if (arr[i] === val) {
            return true
        }
    };
    return false;
}

function matchItem(item, cfg) {
    if (!item) return false;

    // Match by extension
    if (cfg.extensions && item.name) {
        var ext = item.name.toLowerCase().split('.').pop();
        if (inArray(ext, cfg.extensions)) {
            return true
        };
    }

    // Match by sequence
    if (cfg.sequence && item.isSequence && item.isSequence()) {
        return true
    };

    // Match by name substring
    if (cfg.nameContains && item.name) {
        if (typeof cfg.nameContains === "string" && item.name.toLowerCase().indexOf(cfg.nameContains) >= 0) {
            return true
        };
        if (Array.isArray(cfg.nameContains)) {
            for (var i = 0; i < cfg.nameContains.length; i++)
                if (item.name.toLowerCase().indexOf(cfg.nameContains[i]) >= 0) {
                    return true
                };
        }
    }

    // Match by type
    if (cfg.type === "clip" && item.type === ProjectItemType.CLIP) {
        if (cfg.nameContains) return item.name.toLowerCase().indexOf(cfg.nameContains) >= 0; {
            return true
        };
    }
    if (cfg.type === "caption" && item.type === ProjectItemType.CAPTION) {
        return true
    };

    // Video clip check for motion graphics
    if (cfg.videoClipCheck && item.type === ProjectItemType.CLIP && item.isSequence && item.isSequence() && item.mainTrackType === "Video") {
        return true
    };

    return false;
}

function scanProjectItemsRecursive() {
    try {
        if (!app || !app.project) {
            return JSON.stringify({ error: "No active project" })
        };

        var scanConfig = loadScanConfig();
        var result = {};

        for (var i = 0; i < scanConfig.length; i++) {
            result[scanConfig[i].key] = { label: scanConfig[i].label, count: 0 };
        }

        function traverse(item) {
            if (!item) {
                return
            };

            if (item.type !== ProjectItemType.BIN) {
                for (var i = 0; i < scanConfig.length; i++) {
                    if (matchItem(item, scanConfig[i])) {
                        result[scanConfig[i].key].count++
                    };
                }
            }

            if (item.children && item.children.numItems > 0) {
                for (var c = 0; c < item.children.numItems; c++) {
                    traverse(item.children[c])
                };
            }
        }

        traverse(app.project.rootItem);
        return JSON.stringify(result);

    } catch (e) {
        return JSON.stringify({ error: e.toString() });
    }
}


function moveItemsToSelectedBins(selectionsJSON) {
    try {
        if (!app || !app.project) {
            return JSON.stringify({ error: "No active project" })
        };

        var selections = JSON.parse(selectionsJSON);
        var scanConfig = loadScanConfig();
        var root = app.project.rootItem;

        function getRootBinByIndex(idx) {
            if (idx >= 0 && idx < root.children.numItems) {
                var child = root.children[idx];
                if (child && child.type === ProjectItemType.BIN) {
                    return child
                };
            }
            return null;
        }

        var totalItems = 0;
        for (var i = 0; i < scanConfig.length; i++) {
            var sel = selections[scanConfig[i].key];
            if (sel && typeof sel.index === "number") {
                for (var c = 0; c < root.children.numItems; c++) {
                    var item = root.children[c];
                    if (item && item.type !== ProjectItemType.BIN && matchItem(item, scanConfig[i])) {
                        totalItems++
                    };
                }
            }
        }

        var movedItems = 0;

        for (var i = 0; i < scanConfig.length; i++) {
            var cfg = scanConfig[i];
            var sel = selections[cfg.key];
            if (sel && typeof sel.index === "number") {
                var targetBin = getRootBinByIndex(sel.index);
                if (!targetBin) {
                    continue
                };

                for (var c = root.children.numItems - 1; c >= 0; c--) {
                    var item = root.children[c];
                    if (item && item.type !== ProjectItemType.BIN && matchItem(item, cfg)) {
                        try {
                            item.moveBin(targetBin);
                            movedItems++;
                            var percent = Math.round((movedItems / totalItems) * 100);
                            var e = new CSXSEvent();
                            e.type = "progressUpdate";
                            e.data = percent;
                            e.dispatch();
                            $.sleep(300);
                        } catch (err) {
                            $.writeln("Failed to move: " + item.name + " - " + err);
                        }
                    }
                }
            }
        }

        return JSON.stringify({ success: true });

    } catch (e) { return JSON.stringify({ error: e.toString() }); }
}

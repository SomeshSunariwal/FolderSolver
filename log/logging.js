function logMessage(message) {
    console.log("logMessage called with:", message); // Debugging log
    const logBox = document.getElementById("log-box");
    const logSection = document.getElementById("log-section");

    if (!logBox || !logSection) {
        console.error("Log box or log section element not found.");
        return;
    }

    // Only show the log section when a message is logged
    if (message) {
        logSection.style.display = "block";
    }

    const logEntry = document.createElement("p");
    logEntry.textContent = message;
    logBox.appendChild(logEntry);
    logBox.scrollTop = logBox.scrollHeight; // Auto-scroll to the latest log
}

// Hide the log section by default
const logSection = document.getElementById("log-section");
if (logSection) {
    logSection.style.display = "none";
}
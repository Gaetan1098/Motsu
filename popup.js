document.getElementById("saveSettings").addEventListener("click", () => {
    const nativeLanguage = document.getElementById("nativeLanguage").value;
    const learningLanguage = document.getElementById("learningLanguage").value;
    
    // Save settings to chrome storage
    chrome.storage.local.set({
        nativeLanguage: nativeLanguage,
        learningLanguage: learningLanguage
    }, () => {
        console.log("Language settings saved:", nativeLanguage, learningLanguage);
        alert("Settings saved successfully!");
    });
});

// Load saved settings
chrome.storage.local.get(["nativeLanguage", "learningLanguage"], (result) => {
    if (result.nativeLanguage) {
        document.getElementById("nativeLanguage").value = result.nativeLanguage;
    }
    if (result.learningLanguage) {
        document.getElementById("learningLanguage").value = result.learningLanguage;
    }
});

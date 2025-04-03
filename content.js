chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "parseXml") {
        console.log("Received request to extract UUID and language from XML.");
        console.log("Raw XML content:", request.xml);

        const episodeUUID = extractEpisodeUUID(request.xml);
        const language = extractLanguageFromXML(request.xml);

        console.log("Extracted UUID:", episodeUUID);
        console.log("Extracted Language:", language);

        sendResponse({ episodeUUID, language });
    }

    if (request.action === "displaySubtitles") {
        displaySubtitles(request.subtitles);
    }
});

// Function to extract UUID from XML
function extractEpisodeUUID(xmlContent) {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, "text/xml");

        const metadata = xmlDoc.querySelector("metadata");
        if (metadata) {
            const uuid = metadata.getAttribute("nttm:uuid");
            if (uuid) {
                return uuid;
            }
        }
        console.warn("UUID not found in metadata.");
        return "unknown";
    } catch (error) {
        console.error("Error parsing XML to extract UUID:", error);
        return "unknown";
    }
}

// Function to extract language from XML
function extractLanguageFromXML(xmlContent) {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, "text/xml");

        const rootElement = xmlDoc.documentElement;
        return rootElement.getAttribute("xml:lang") || "unknown";
    } catch (error) {
        console.error("Error parsing XML to extract language:", error);
        return "unknown";
    }
}

function displaySubtitles(subtitleXML) {
    console.log("📺 Processing subtitles for display...");

    // Convert XML string into a DOM object
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(subtitleXML, "text/xml");

    // Extract all subtitle <p> elements
    const subtitleNodes = xmlDoc.querySelectorAll("p");

    if (subtitleNodes.length === 0) {
        console.warn("⚠️ No subtitles found in XML.");
        return;
    }

    // Extract text and timing
    const subtitles = Array.from(subtitleNodes).map(node => {
        const textContent = Array.from(node.querySelectorAll("span"))
            .map(span => span.textContent.trim()) // Get subtitle text
            .join(" "); // Join multi-line subtitles

        const beginTime = convertTicksToSeconds(node.getAttribute("begin"));
        const endTime = convertTicksToSeconds(node.getAttribute("end"));

        return { text: textContent, start: beginTime, end: endTime };
    }).filter(sub => sub.text.length > 0); // Remove empty subtitles

    console.log("✅ Extracted subtitles:", subtitles);

    // Synchronize subtitles with video
    syncSubtitles(subtitles);
}

function convertTicksToSeconds(ticks) {
    const tickRate = 10000000; // Netflix uses 10 million ticks per second
    return parseInt(ticks.replace("t", ""), 10) / tickRate;
}

function syncSubtitles(subtitles) {
    const video = document.querySelector("video");

    if (!video) {
        console.warn("⚠️ No video element found.");
        return;
    }

    let subtitleOverlay = createSubtitleOverlay();

    video.addEventListener("timeupdate", () => {
        const currentTime = video.currentTime;
        const activeSubtitle = subtitles.find(sub => currentTime >= sub.start && currentTime <= sub.end);

        if (activeSubtitle) {
            subtitleOverlay.innerText = activeSubtitle.text;
        } else {
            subtitleOverlay.innerText = "";
        }
    });
}

function createSubtitleOverlay() {
    let overlay = document.getElementById("subtitle-overlay");

    if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "subtitle-overlay";
        overlay.style.position = "absolute";
        overlay.style.bottom = "10%";
        overlay.style.left = "50%";
        overlay.style.transform = "translateX(-50%)";
        overlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
        overlay.style.color = "white";
        overlay.style.fontSize = "24px";
        overlay.style.padding = "5px 10px";
        overlay.style.borderRadius = "5px";
        overlay.style.textAlign = "center";
        overlay.style.maxWidth = "80%";
        overlay.style.zIndex = "9999";
        document.body.appendChild(overlay);
    }

    return overlay;
}
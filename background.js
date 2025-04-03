// Import Firebase modules

import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/9.17.1/firebase-firestore.js';
import { signInAnonymously } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCfv2MXVjc4PqZi5KOyIE52wBFbNnCnwys",
  authDomain: "motsu-6c734.firebaseapp.com",
  projectId: "motsu-6c734",
  storageBucket: "motsu-6c734.firebasestorage.app",
  messagingSenderId: "117755786047",

  appId: "1:117755786047:web:fbccbce2175990fd16598a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

console.log("Firebase initialized!");
console.log("Service worker is running!");

signInAnonymously(auth)
    .then(() => {
        console.log("Signed in anonymously");
    })
    .catch((error) => {
        console.error("Authentication error:", error);
    });

// Set to track already intercepted subtitle requests
const interceptedUrls = new Set();

const subtitlePattern = "*://*.nflxvideo.net/*?o=*";

// Function to sanitize the URL for use as a Firestore document ID
function sanitizeUrlForFirestore(url) {
    // Base64-encode the URL and replace invalid Firestore characters
    return btoa(url).replace(/\//g, "_").replace(/\+/g, "-").replace(/=+$/, "");
}

async function saveSubtitleToFirestore(subtitleXML, requestUrl) {
    try {
        console.log("Requesting UUID and language extraction...");

        const { episodeUUID, language } = await new Promise((resolve, reject) => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs.length === 0) {
                    reject("No active tab found.");
                    return;
                }

                chrome.tabs.sendMessage(tabs[0].id, { action: "parseXml", xml: subtitleXML }, (response) => {
                    if (chrome.runtime.lastError) {
                        reject("Error communicating with content script: " + chrome.runtime.lastError.message);
                    } else if (response && response.episodeUUID && response.language) {
                        console.log("Received UUID:", response.episodeUUID);
                        console.log("Received Language:", response.language);
                        resolve(response);
                    } else {
                        console.error("Response from content.js is invalid:", response);
                        reject("Failed to extract episode UUID and language.");
                    }
                });
            });
        });

        if (!episodeUUID || episodeUUID === "unknown") {
            console.error("Failed to extract episode UUID. Aborting Firestore save.");
            return;
        }

        // Firestore reference using episode UUID
        const subtitleDocRef = doc(db, "subtitles", episodeUUID);
        
        // Log before saving to Firestore
        console.log(`Saving subtitles to Firestore for episode: ${episodeUUID}, Language: ${language}`);
        
        await setDoc(subtitleDocRef, { subtitleXML, requestUrl, language });

        console.log(`Subtitles successfully saved to Firestore for episode: ${episodeUUID}`);

    } catch (error) {
        console.error("Error saving subtitles to Firestore:", error);
    }
}
// Function to retrieve subtitles from Firestore
async function getSubtitleFromFirestore(url) {
    try {
        const docId = sanitizeUrlForFirestore(url); // Sanitize the URL
        const docRef = doc(db, "subtitles", docId);
        const docSnapshot = await getDoc(docRef);

        if (docSnapshot.exists()) {
            console.log(`Subtitles retrieved from Firestore for URL: ${url}`);
            return docSnapshot.data().content; // Return the stored subtitles
        } else {
            console.log(`No subtitles found in Firestore for URL: ${url}`);
            return null;
        }
    } catch (error) {
        console.error("Error retrieving subtitles from Firestore:", error);
        return null;
    }
}

async function handleSubtitleRequest(details) {
    try {
        const subtitleXML = await fetch(details.url).then((response) => response.text());

        // Request UUID and Language from content.js
        const { episodeUUID, language } = await new Promise((resolve, reject) => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs.length === 0) {
                    reject("No active tab found.");
                    return;
                }

                chrome.tabs.sendMessage(tabs[0].id, { action: "parseXml", xml: subtitleXML }, (response) => {
                    if (chrome.runtime.lastError) {
                        reject("Error communicating with content script: " + chrome.runtime.lastError.message);
                    } else if (response && response.episodeUUID && response.language) {
                        resolve(response);
                    } else {
                        reject("Failed to extract episode UUID and language.");
                    }
                });
            });
        });

        if (!episodeUUID || episodeUUID === "unknown") {
            console.error("Failed to extract episode UUID. Aborting Firestore check.");
            return;
        }

        // Check if UUID already exists in Firestore
        const subtitleDocRef = doc(db, "subtitles", episodeUUID);
        const existingDoc = await getDoc(subtitleDocRef);

        if (existingDoc.exists()) {
            console.log(`Using cached subtitles for episode UUID: ${episodeUUID}`);

            // Send cached subtitles to content.js for display
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const activeTab = tabs[0];
                if (activeTab) {
                    chrome.tabs.sendMessage(activeTab.id, {
                        action: "displaySubtitles",
                        subtitles: existingDoc.data().subtitleXML,
                    });
                }
            });
        } else {
            console.log(`No cached subtitles found. Saving new subtitles for UUID: ${episodeUUID}`);

            // Save new subtitles to Firestore
            await setDoc(subtitleDocRef, {
                subtitleXML,
                requestUrl: details.url,
                language,
            });

            console.log(`Subtitles successfully saved to Firestore for episode: ${episodeUUID}`);

            // Send newly fetched subtitles to content.js for display
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const activeTab = tabs[0];
                if (activeTab) {
                    chrome.tabs.sendMessage(activeTab.id, {
                        action: "displaySubtitles",
                        subtitles: subtitleXML,
                    });
                }
            });
        }
    } catch (error) {
        console.error("Error handling subtitle request:", error);
    }
}

// Intercept Netflix subtitle requests and process them
chrome.webRequest.onHeadersReceived.addListener(
    async (details) => {
        // Ensure the request is coming from an active Netflix tab
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const activeTab = tabs[0];
            if (!activeTab || !activeTab.url.includes("netflix.com/watch")) {
                console.warn("Not a Netflix tab. Stopping subtitle request interception.");
                return;
            }
            
            const contentTypeHeader = details.responseHeaders.find(
                (header) => header.name.toLowerCase() === "content-type"
            );
    
            if (contentTypeHeader && contentTypeHeader.value.includes("text/xml")) {
                console.log(`Intercepted subtitle request: ${details.url}`);
                handleSubtitleRequest(details);
            }
        });
    },
    { urls: ["*://*.nflxvideo.net/*?o=*"] },
    ["responseHeaders"]
);




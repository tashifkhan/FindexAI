// public/content.js

console.log('YouTube Q&A Extension content script loaded on:', window.location.href);

// Function to create the root element for the React app
function ensureAppRoot() {
  let appRoot = document.getElementById("youtube-qa-app-root");
  if (!appRoot) {
    console.log("Creating youtube-qa-app-root...");
    appRoot = document.createElement("div");
    appRoot.id = "youtube-qa-app-root";
    // Try to inject it in a more specific place if possible, otherwise fallback to body
    const belowPlayer = document.getElementById('below'); // YouTube specific element
    if (belowPlayer) {
        belowPlayer.parentNode.insertBefore(appRoot, belowPlayer);
    } else {
        document.body.appendChild(appRoot);
    }
  }
  return appRoot;
}

// Inject the main React script
function injectReactApp(rootElement) {
    if (rootElement.querySelector('script[src*="assets/index.js"]')) {
        console.log("React app script already injected.");
        return;
    }
    console.log("Injecting React app script...");
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("assets/index.js"); // Vite bundles to assets/index.js
    script.type = "module";
    rootElement.appendChild(script);
    console.log("React app script appended to root.");
}

// --- Logic from prototype/content.js ---

// Extracts video id from url
function getVideoId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('v');
}

// Title video
function getVideoTitle() {
    // Updated selector for YouTube's current layout (as of late 2024/early 2025)
    const titleElement = document.querySelector('h1.style-scope.ytd-watch-metadata .title, h1.title.ytd-video-primary-info-renderer');
    return titleElement ? titleElement.textContent.trim() : "Unknown Title";
}

// Channel name extraction
function getChannelName() {
    // Updated selector
    const channelElement = document.querySelector('#owner #channel-name a, #upload-info #channel-name a, ytd-channel-name a');
    return channelElement ? channelElement.textContent.trim() : "Unknown Channel";
}

// Listener for messages from the React app or background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getContentVideoInfo') {
        console.log("content.js received request for getVideoInfo");
        sendResponse({
            videoId: getVideoId(),
            title: getVideoTitle(),
            channel: getChannelName(),
            url: window.location.href
        });
        return true; // Indicates that the response is sent asynchronously or will be sent.
    }
});

let currentVideoId = getVideoId();

// Function to handle video changes
function handleVideoChange() {
    const newVideoId = getVideoId();
    if (newVideoId && newVideoId !== currentVideoId) {
        console.log('Video changed. Old ID:', currentVideoId, 'New ID:', newVideoId);
        currentVideoId = newVideoId;
        // Notify the React app about the video change so it can re-fetch data
        chrome.runtime.sendMessage({
            type: "VIDEO_ID_CHANGED",
            payload: {
                videoId: newVideoId,
                videoUrl: window.location.href,
                title: getVideoTitle(),
                channel: getChannelName()
            }
        }).catch(err => console.warn("Error sending VIDEO_ID_CHANGED message:", err)); // Catch error if receiver doesn't exist yet
    }
}

// Observe for SPA navigation changes (YouTube uses a lot of dynamic loading)
const observer = new MutationObserver((mutationsList, observer) => {
    // More robust check for URL change, as title/body mutations can be frequent
    if (window.location.href.includes("watch?v=") && window.location.href.split("v=")[1]?.split("&")[0] !== currentVideoId) {
        handleVideoChange();
    }
    // Also, re-ensure the app root exists if it somehow gets removed (less likely but for robustness)
    const appRoot = ensureAppRoot();
    if (!appRoot.querySelector('script[src*="assets/index.js"]')) {
        injectReactApp(appRoot);
    }
});


// Start observing
function initializeExtension() {
    if (window.location.hostname.includes("youtube.com") && window.location.pathname === "/watch") {
        console.log("YouTube watch page detected. Initializing extension content.");
        const appRoot = ensureAppRoot();
        injectReactApp(appRoot);

        // Initial check
        currentVideoId = getVideoId();
        console.log("Initial video ID:", currentVideoId);

        observer.observe(document.documentElement, { // Observe the whole document for more reliability
            childList: true,
            subtree: true,
            attributes: false // Usually don't need attributes for URL changes
        });
    } else {
        console.log("Not a YouTube watch page. Extension content not injected.");
    }
}

// Handle cases where the script is injected after the page is already loaded
if (document.readyState === "complete" || document.readyState === "interactive") {
    initializeExtension();
} else {
    window.addEventListener("DOMContentLoaded", initializeExtension);
}

// The 'index.css' is already injected via the manifest, so no need to link it here.
// However, ensure your Vite build correctly outputs index.css to assets/index.css

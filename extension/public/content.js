const ROOT_ID = "youtube-qa-app-root";

function injectApp() {
	if (document.getElementById(ROOT_ID)) return;

	const appRoot = document.createElement("div");
	appRoot.id = ROOT_ID;
	document.body.appendChild(appRoot);

	const script = document.createElement("script");
	script.src = chrome.runtime.getURL("assets/index.js");
	script.type = "module";
	document.head.appendChild(script); // Inject into head for earlier execution if possible
}

// --- NEW: The Bridge Logic ---

// 1. Listen for messages FROM the React app (Page World)
window.addEventListener("message", (event) => {
	// We only accept messages from ourselves
	if (event.source !== window) return;

	const { type, payload, requestId } = event.data;

	if (type === "YOUTUBE_QA_REQUEST") {
		console.log("Content.js: Received YOUTUBE_QA_REQUEST from page:", payload);
		// 2. Forward the message TO the background script (using privileged API)
		chrome.runtime.sendMessage({ type: payload.type, payload: payload.payload }, (response) => {
			if (chrome.runtime.lastError) {
				console.error("Content.js: Error sending message to background:", chrome.runtime.lastError.message);
				// Send an error response back to the page
				window.postMessage({
					type: "YOUTUBE_QA_RESPONSE",
					response: { error: chrome.runtime.lastError.message },
					requestId: requestId,
				}, "*");
				return;
			}
			console.log("Content.js: Received response from background, sending to page:", response);
			// 3. When the background script responds, send the data BACK to the React app
			window.postMessage({
				type: "YOUTUBE_QA_RESPONSE",
				response: response,
				requestId: requestId, // Include the original requestId
			}, "*");
		});
	}
}, false);

// --- Original DOM manipulation and observation logic ---
// Function to create the root element for the React app (can be simplified as injectApp handles it)
function ensureAppRoot() {
  let appRoot = document.getElementById(ROOT_ID);
  if (!appRoot) {
    console.log("Creating youtube-qa-app-root (ensureAppRoot)..."); // Should ideally be created by injectApp
    appRoot = document.createElement("div");
    appRoot.id = ROOT_ID;
    const belowPlayer = document.getElementById('below');
    if (belowPlayer) {
        belowPlayer.parentNode.insertBefore(appRoot, belowPlayer);
    } else {
        document.body.appendChild(appRoot);
    }
  }
  return appRoot;
}

// Extracts video id from url
function getVideoId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('v');
}

// Title video
function getVideoTitle() {
    const titleElement = document.querySelector('h1.style-scope.ytd-watch-metadata .title, h1.title.ytd-video-primary-info-renderer');
    return titleElement ? titleElement.textContent.trim() : "Unknown Title";
}

// Channel name extraction
function getChannelName() {
    const channelElement = document.querySelector('#owner #channel-name a, #upload-info #channel-name a, ytd-channel-name a');
    return channelElement ? channelElement.textContent.trim() : "Unknown Channel";
}

let currentVideoId = getVideoId();

// Function to handle video changes (SPA navigation)
function handleVideoChange() {
    const newVideoId = getVideoId();
    if (newVideoId && newVideoId !== currentVideoId) {
        console.log('Content.js: Video changed. Old ID:', currentVideoId, 'New ID:', newVideoId);
        currentVideoId = newVideoId;
        // Notify the React app (Page World) about the video change
        // The React app's main.jsx MutationObserver should handle re-initialization or data fetching
        // However, we can also send a direct message if the React app is set up to listen for it.
        // For now, the main.jsx observer should catch the DOM change for the root element.
        // If direct notification to React app is needed:
        window.postMessage({
            type: "VIDEO_ID_CHANGED_FROM_CONTENT", // A distinct type
            payload: {
                videoId: newVideoId,
                videoUrl: window.location.href,
                title: getVideoTitle(),
                channel: getChannelName()
            }
        }, "*");
    }
}

const pageObserver = new MutationObserver((mutationsList, observer) => {
    if (window.location.href.includes("watch?v=") && window.location.href.split("v=")[1]?.split("&")[0] !== currentVideoId) {
        handleVideoChange();
    }
    // Ensure app is injected if it's missing (e.g., after some aggressive DOM manipulation by YouTube)
    if (!document.getElementById(ROOT_ID)) {
        console.log("Content.js: App root missing, re-injecting...");
        injectApp();
    }
});

function initializeContentScript() {
    console.log('YouTube Q&A Extension content script initializing on:', window.location.href);
    if (window.location.hostname.includes("youtube.com") && window.location.pathname === "/watch") {
        console.log("Content.js: YouTube watch page detected. Injecting app.");
        injectApp(); // This creates the root div and injects the React script.
        currentVideoId = getVideoId();
        console.log("Content.js: Initial video ID:", currentVideoId);
        pageObserver.observe(document.documentElement, {
            childList: true,
            subtree: true,
        });
    } else {
        console.log("Content.js: Not a YouTube watch page. App not injected.");
    }
}

// Run initialization
if (document.readyState === "complete" || document.readyState === "interactive") {
    initializeContentScript();
} else {
    window.addEventListener("DOMContentLoaded", initializeContentScript);
}

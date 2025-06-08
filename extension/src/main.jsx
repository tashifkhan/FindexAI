import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

const ROOT_ID = "youtube-qa-app-root";

// --- NEW ROBUST INITIALIZATION LOGIC ---

const initializeReactApp = (element) => {
	console.log(
		"YouTube Q&A: Root element found! Initializing React application."
	);
	createRoot(element).render(
		<StrictMode>
			<App />
		</StrictMode>
	);
};

// 1. Check if the element already exists (for fast-loading pages)
const existingRoot = document.getElementById(ROOT_ID);
if (existingRoot) {
	initializeReactApp(existingRoot);
} else {
	// 2. If not, wait for it to be added to the DOM
	console.log(
		`YouTube Q&A: Root element '${ROOT_ID}' not found. Waiting for it to be injected...`
	);
	const observer = new MutationObserver((mutations, obs) => {
		for (const mutation of mutations) {
			for (const node of mutation.addedNodes) {
				// We're looking for our specific root element
				if (node.id === ROOT_ID) {
					// Found it!
					obs.disconnect(); // Stop observing
					initializeReactApp(node);
					return;
				}
			}
		}
	});

	// Start observing the document's body for new child elements
	observer.observe(document.body, {
		childList: true,
		subtree: true,
	});
}

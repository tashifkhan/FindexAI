const API_BASE_URL = "http://localhost:5454";

// Listener for messages from the content script (your React app)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	// Use a switch statement to handle different types of requests
	switch (request.type) {
		case "ASK_QUESTION":
			handleAskQuestion(request.payload)
				.then(sendResponse)
				.catch((error) =>
					sendResponse({
						error: error.message,
					})
				);
			break;

		case "GET_VIDEO_INFO":
			handleGetVideoInfo(request.payload)
				.then(sendResponse)
				.catch((error) =>
					sendResponse({
						error: error.message,
					})
				);
			break;
	}

	// Return true to indicate that you will be sending a response asynchronously
	return true;
});

async function handleAskQuestion({ videoUrl, question }) {
	try {
		const response = await fetch(`${API_BASE_URL}/ask`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				video_url: videoUrl,
				question: question,
			}),
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
		}

		const data = await response.json();
		return { answer: data.answer };
	} catch (error) {
		console.error("Error in background script asking question:", error);
		return {
			error:
				"Failed to get answer. Is the backend server running at " +
				API_BASE_URL +
				"?",
		};
	}
}

async function handleGetVideoInfo({ videoUrl }) {
	try {
		const response = await fetch(`${API_BASE_URL}/api/video-info`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ video_url: videoUrl }),
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
		}

		const data = await response.json();
		return { videoInfo: data };
	} catch (error) {
		console.error("Error in background script getting video info:", error);
		return {
			error:
				"Failed to get video info. Is the backend server running at " +
				API_BASE_URL +
				"?",
		};
	}
}

console.log("Background service worker started.");

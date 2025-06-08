// src/utils/api.js

// This function now sends a message to the content script bridge
function sendMessageToContentScript(type, payload) {
	return new Promise((resolve, reject) => {
		const requestId = Math.random().toString(36).substring(2, 15);

		const listener = (event) => {
			// Ensure the message is from the window itself (content script) and has the correct type and requestId
			if (
				event.source === window &&
				event.data.type === "YOUTUBE_QA_RESPONSE" &&
				event.data.requestId === requestId
			) {
				window.removeEventListener("message", listener); // Clean up listener
				if (event.data.response?.error) {
					console.error("API.js: Error from background/content script:", event.data.response.error);
					reject(new Error(event.data.response.error));
				} else {
					console.log("API.js: Received response via bridge:", event.data.response);
					resolve(event.data.response);
				}
			}
		};

		window.addEventListener("message", listener);

		console.log("API.js: Posting YOUTUBE_QA_REQUEST to content script:", { type, payload });
		// This is the message that content.js will receive
		window.postMessage(
			{
				type: "YOUTUBE_QA_REQUEST", // Message type for content.js to identify
				payload: { type, payload }, // The actual message for the background script
				requestId: requestId,
			},
			"*" // Target origin: any, as it's window-to-window communication on the same page
		);
	});
}

export const askQuestion = async (videoUrl, question) => {
	console.log("API.js: askQuestion called with", { videoUrl, question });
	const response = await sendMessageToContentScript("ASK_QUESTION", {
		videoUrl,
		question,
	});
	return response.answer || "No answer received";
};

export const getVideoInfo = async (videoUrl) => {
	console.log("API.js: getVideoInfo called with", { videoUrl });
	const response = await sendMessageToContentScript("GET_VIDEO_INFO", {
		videoUrl,
	});
	return response;
};

// Optional: A health check function for the bridge/background
export const healthCheck = async () => {
	console.log("API.js: healthCheck called");
	try {
		const response = await sendMessageToContentScript("HEALTH_CHECK", {});
		return response; // Or a specific property like response.status
	} catch (error) {
		console.error("API.js: Health check failed:", error);
		return { status: "error", error: error.message };
	}
};

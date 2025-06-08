// src/utils/api.js

// This function now sends a message to the background script and returns a promise
const sendMessageToBackground = (type, payload) => {
	return new Promise((resolve, reject) => {
		chrome.runtime.sendMessage({ type, payload }, (response) => {
			if (chrome.runtime.lastError) {
				// Handle errors like the background script not being available
				return reject(chrome.runtime.lastError);
			}
			if (response?.error) {
				// Handle application-specific errors from the background script
				return reject(new Error(response.error));
			}
			resolve(response);
		});
	});
};

export const askQuestion = async (videoUrl, question) => {
	const response = await sendMessageToBackground("ASK_QUESTION", {
		videoUrl,
		question,
	});
	return response.answer || "No answer received";
};

export const getVideoInfo = async (videoUrl) => {
	// You would implement this similarly if you move the logic to the background
	const response = await sendMessageToBackground("GET_VIDEO_INFO", {
		videoUrl,
	});
	return response;
};

// You can create a health check function too
export const healthCheck = async () => {
	try {
		await sendMessageToBackground("HEALTH_CHECK");
		return true;
	} catch (error) {
		console.error("Backend health check failed:", error);
		return false;
	}
};

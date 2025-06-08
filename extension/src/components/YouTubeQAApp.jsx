import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FloatingChatButton from "./FloatingChatButton";
import ChatSidebar from "./ChatSidebar";
import SearchOverlay from "./SearchOverlay";
import { useSearch } from "../hooks/useSearch";
import { useYouTubeData } from "../hooks/useYouTubeData";
import { askQuestion } from "../utils/api";

const YouTubeQAApp = () => {
	const [isChatOpen, setIsChatOpen] = useState(false);
	const [isSearchMode, setIsSearchMode] = useState(false);
	const [messages, setMessages] = useState([]);
	const [isLoading, setIsLoading] = useState(false);

	const {
		searchTerm,
		setSearchTerm,
		searchResults,
		currentIndex,
		nextResult,
		prevResult,
		clearSearch,
	} = useSearch();
	const { videoData, isOnYouTube, extractVideoData } = useYouTubeData();

	// Extract video data when page loads or changes
	useEffect(() => {
		if (isOnYouTube) {
			extractVideoData();
		}
	}, [isOnYouTube, extractVideoData]);

	// Handle keyboard shortcuts
	useEffect(() => {
		const handleKeyDown = (e) => {
			// Ctrl/Cmd + F for search
			if ((e.ctrlKey || e.metaKey) && e.key === "shift" && e.key === "f") {
				e.preventDefault();
				setIsSearchMode(true);
			}

			// Escape to close overlays
			if (e.key === "Escape") {
				setIsSearchMode(false);
				setIsChatOpen(false);
				clearSearch();
			}

			// Search navigation when in search mode
			if (isSearchMode && searchResults.length > 0) {
				if (e.key === "Enter" && !e.shiftKey) {
					e.preventDefault();
					nextResult();
				} else if (e.key === "Enter" && e.shiftKey) {
					e.preventDefault();
					prevResult();
				}
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isSearchMode, searchResults.length, nextResult, prevResult, clearSearch]);

	const handleAskQuestion = async (question) => {
		const isDevelopment =
			window.location.hostname === "localhost" ||
			window.location.hostname === "127.0.0.1";

		// Demo mode responses when not on YouTube
		if (isDevelopment && !isOnYouTube) {
			setMessages((prev) => [...prev, { type: "user", content: question }]);
			setIsLoading(true);

			// Simulate API delay
			setTimeout(() => {
				let response = "";
				const lowerQuestion = question.toLowerCase();

				if (lowerQuestion.includes("how") && lowerQuestion.includes("work")) {
					response =
						"This YouTube Q&A extension works by:\n\n1. **Floating Chat Button**: Appears on YouTube video pages for easy access\n2. **AI-Powered Q&A**: Ask questions about video content and get intelligent responses\n3. **Enhanced Search**: Use Ctrl+F/Cmd+F for powerful text search with highlighting\n4. **Real-time Analysis**: Extracts video transcripts and metadata for accurate answers\n\nThe extension integrates seamlessly with YouTube without disrupting your viewing experience!";
				} else if (lowerQuestion.includes("feature")) {
					response =
						"Key features include:\n\n✨ **Smart Q&A**: Ask questions about video content\n🔍 **Enhanced Search**: Advanced Ctrl+F functionality with result navigation\n💬 **Floating Chat**: Non-intrusive chat interface\n📊 **Video Analysis**: Automatic transcript and metadata extraction\n⚡ **Real-time**: Instant responses and search results\n🎨 **Beautiful UI**: Modern, responsive design with smooth animations";
				} else if (lowerQuestion.includes("search")) {
					response =
						"The search functionality enhances the browser's native Ctrl+F:\n\n🔍 **Enhanced Highlighting**: Better visual indicators for search results\n⬆️⬇️ **Easy Navigation**: Use Enter/Shift+Enter to jump between results\n📊 **Result Counter**: See how many matches were found\n🎯 **Smart Scrolling**: Automatically centers results in view\n✨ **Smooth Animation**: Beautiful transitions and highlighting effects\n\nTry pressing Ctrl+F (or Cmd+F on Mac) to see it in action!";
				} else {
					response = `Thanks for asking! This is a demo of the YouTube Q&A assistant. In a real YouTube video, I would:\n\n• Analyze the video's transcript and content\n• Provide specific answers about the video topics\n• Help you find particular moments or information\n• Search through the video content efficiently\n\nTo see the full functionality, try this extension on an actual YouTube video page!`;
				}

				setMessages((prev) => [...prev, { type: "ai", content: response }]);
				setIsLoading(false);
			}, 1000);
			return;
		}

		if (!videoData?.url) {
			setMessages((prev) => [
				...prev,
				{ type: "user", content: question },
				{
					type: "ai",
					content:
						"Please navigate to a YouTube video to ask questions about it.",
				},
			]);
			return;
		}

		setMessages((prev) => [...prev, { type: "user", content: question }]);
		setIsLoading(true);

		try {
			const response = await askQuestion(videoData.url, question);
			setMessages((prev) => [...prev, { type: "ai", content: response }]);
		} catch (error) {
			setMessages((prev) => [
				...prev,
				{
					type: "ai",
					content:
						"Sorry, I encountered an error while processing your question. Please try again.",
				},
			]);
		} finally {
			setIsLoading(false);
		}
	};

	const toggleChat = () => {
		setIsChatOpen(!isChatOpen);
		if (isSearchMode) {
			setIsSearchMode(false);
			clearSearch();
		}
	};

	// Check if we're in development mode (localhost)
	const isDevelopment =
		window.location.hostname === "localhost" ||
		window.location.hostname === "127.0.0.1";

	return (
		<>
			{/* Development Mode Landing Page */}
			{isDevelopment && !isOnYouTube && !isChatOpen && (
				<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full">
						<div className="text-center">
							<div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
								<svg
									className="w-8 h-8 text-white"
									fill="currentColor"
									viewBox="0 0 24 24"
								>
									<path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136C4.495 20.455 12 20.455 12 20.455s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
								</svg>
							</div>
							<h1 className="text-3xl font-bold text-gray-900 mb-4">
								YouTube Q&A Assistant
							</h1>
							<p className="text-gray-600 mb-6">
								This extension integrates with YouTube to help you ask questions
								about videos and search through content seamlessly.
							</p>
							<div className="space-y-4 text-left">
								<div className="bg-gray-50 rounded-lg p-4">
									<h3 className="font-semibold text-gray-900 mb-2">
										Features:
									</h3>
									<ul className="space-y-2 text-sm text-gray-600">
										<li className="flex items-center">
											<div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
											AI-powered Q&A about video content
										</li>
										<li className="flex items-center">
											<div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
											Native browser search integration (Ctrl+F/Cmd+F)
										</li>
										<li className="flex items-center">
											<div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
											Floating chat interface
										</li>
										<li className="flex items-center">
											<div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
											Real-time transcript analysis
										</li>
									</ul>
								</div>
								<div className="bg-blue-50 rounded-lg p-4">
									<h3 className="font-semibold text-blue-900 mb-2">
										How to use:
									</h3>
									<p className="text-sm text-blue-700">
										Navigate to any YouTube video page to see the floating chat
										button appear. Use Ctrl+F/Cmd+F for enhanced search
										functionality.
									</p>
								</div>
							</div>
							<button
								onClick={() => setIsChatOpen(true)}
								className="mt-6 bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
							>
								Try Demo Chat
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Search Overlay */}
			<AnimatePresence>
				{isSearchMode && (
					<SearchOverlay
						searchTerm={searchTerm}
						setSearchTerm={setSearchTerm}
						searchResults={searchResults}
						currentIndex={currentIndex}
						onClose={() => {
							setIsSearchMode(false);
							clearSearch();
						}}
						onNext={nextResult}
						onPrev={prevResult}
					/>
				)}
			</AnimatePresence>

			{/* Chat Sidebar */}
			<AnimatePresence>
				{isChatOpen && (
					<ChatSidebar
						messages={messages}
						onAskQuestion={handleAskQuestion}
						isLoading={isLoading}
						videoData={videoData}
						isOnYouTube={isOnYouTube}
						onClose={() => setIsChatOpen(false)}
						onSearchMode={() => {
							setIsSearchMode(true);
							setIsChatOpen(false);
						}}
					/>
				)}
			</AnimatePresence>

			{/* Floating Chat Button */}
			{((isOnYouTube && !isChatOpen) ||
				(isDevelopment && !isOnYouTube && !isChatOpen)) && (
				<FloatingChatButton
					onClick={toggleChat}
					hasVideoData={!!videoData}
					isDevelopment={isDevelopment && !isOnYouTube}
				/>
			)}
		</>
	);
};

export default YouTubeQAApp;

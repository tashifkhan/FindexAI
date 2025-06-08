import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
	X,
	Send,
	Search,
	Video,
	Clock,
	Eye,
	ThumbsUp,
	User,
} from "lucide-react";

const ChatSidebar = ({
	messages,
	onAskQuestion,
	isLoading,
	videoData,
	isOnYouTube,
	onClose,
	onSearchMode,
}) => {
	const [inputValue, setInputValue] = useState("");
	const [isMinimized, setIsMinimized] = useState(false);
	const messagesEndRef = useRef(null);
	const inputRef = useRef(null);

	// Check if we're in development mode
	const isDevelopment =
		window.location.hostname === "localhost" ||
		window.location.hostname === "127.0.0.1";
	const canInteract = isOnYouTube || isDevelopment;

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	};

	useEffect(scrollToBottom, [messages]);

	useEffect(() => {
		if (!isMinimized && inputRef.current) {
			inputRef.current.focus();
		}
	}, [isMinimized]);

	const handleSubmit = (e) => {
		e.preventDefault();
		if (inputValue.trim() && !isLoading) {
			onAskQuestion(inputValue.trim());
			setInputValue("");
		}
	};

	const formatDuration = (seconds) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	const formatViews = (count) => {
		if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
		if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
		return count?.toLocaleString() || "0";
	};

	return (
		<motion.div
			className={`fixed right-0 top-0 h-full bg-white shadow-2xl border-l border-gray-200 z-40 flex flex-col ${
				isMinimized ? "w-12" : "w-96"
			}`}
			initial={{ x: "100%" }}
			animate={{ x: 0 }}
			exit={{ x: "100%" }}
			transition={{ type: "spring", stiffness: 300, damping: 30 }}
		>
			{/* Header */}
			<div className="flex items-center justify-between p-4 border-b border-gray-200 bg-blue-50">
				{!isMinimized && (
					<div className="flex items-center space-x-2">
						<div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
							<Video size={16} className="text-white" />
						</div>
						<div>
							<h3 className="font-semibold text-gray-900">YouTube Q&A</h3>
							<p className="text-xs text-gray-500">
								{isOnYouTube
									? "Ready to help"
									: isDevelopment
									? "Demo mode"
									: "Navigate to YouTube"}
							</p>
						</div>
					</div>
				)}

				<div className="flex items-center space-x-1">
					{!isMinimized && (
						<button
							onClick={onSearchMode}
							className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
							title="Search in transcript (Ctrl+F)"
						>
							<Search size={16} className="text-gray-600" />
						</button>
					)}

					<button
						onClick={() => setIsMinimized(!isMinimized)}
						className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
					>
						<div
							className={`w-4 h-4 border-2 border-gray-600 rounded transition-transform ${
								isMinimized ? "rotate-45" : ""
							}`}
						/>
					</button>

					<button
						onClick={onClose}
						className="p-2 hover:bg-red-100 rounded-lg transition-colors"
					>
						<X size={16} className="text-gray-600" />
					</button>
				</div>
			</div>

			{!isMinimized && (
				<>
					{/* Video Info */}
					{videoData && (
						<motion.div
							className="p-4 bg-gray-50 border-b border-gray-200"
							initial={{ opacity: 0, y: -20 }}
							animate={{ opacity: 1, y: 0 }}
						>
							<h4 className="font-medium text-sm text-gray-900 mb-2 line-clamp-2">
								{videoData.title}
							</h4>
							<div className="flex items-center space-x-4 text-xs text-gray-600">
								<div className="flex items-center space-x-1">
									<User size={12} />
									<span>{videoData.uploader}</span>
								</div>
								{videoData.duration > 0 && (
									<div className="flex items-center space-x-1">
										<Clock size={12} />
										<span>{formatDuration(videoData.duration)}</span>
									</div>
								)}
								{videoData.view_count > 0 && (
									<div className="flex items-center space-x-1">
										<Eye size={12} />
										<span>{formatViews(videoData.view_count)}</span>
									</div>
								)}
							</div>
							{videoData.transcript && (
								<div className="mt-2 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
									✓ Transcript available ({videoData.transcript.length} chars)
								</div>
							)}
						</motion.div>
					)}

					{/* Messages */}
					<div className="flex-1 overflow-y-auto p-4 space-y-4">
						{messages.length === 0 && (
							<div className="text-center text-gray-500 mt-8">
								<Video size={48} className="mx-auto mb-4 text-gray-300" />
								<h3 className="font-medium mb-2">
									{isDevelopment && !isOnYouTube
										? "Demo Mode"
										: "Ask about this video"}
								</h3>
								<p className="text-sm">
									{isDevelopment && !isOnYouTube
										? "This is a demo of the YouTube Q&A assistant. Try asking questions to see how it works!"
										: "I can help you understand the content, find specific topics, or answer questions about what's discussed."}
								</p>
								<div className="mt-4 space-y-2 text-xs text-left bg-blue-50 p-3 rounded-lg">
									<p className="font-medium text-blue-900">Try asking:</p>
									<ul className="space-y-1 text-blue-700">
										{isDevelopment && !isOnYouTube ? (
											<>
												<li>• "How does this extension work?"</li>
												<li>• "What features are available?"</li>
												<li>• "Tell me about the search functionality"</li>
											</>
										) : (
											<>
												<li>• "What is this video about?"</li>
												<li>• "Summarize the main points"</li>
												<li>• "What does the speaker say about..."</li>
											</>
										)}
									</ul>
								</div>
							</div>
						)}

						{messages.map((message, index) => (
							<motion.div
								key={index}
								className={`flex ${
									message.type === "user" ? "justify-end" : "justify-start"
								}`}
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: index * 0.1 }}
							>
								<div
									className={`chat-bubble ${
										message.type === "user"
											? "chat-bubble-user"
											: "chat-bubble-ai"
									}`}
								>
									<p className="whitespace-pre-wrap">{message.content}</p>
								</div>
							</motion.div>
						))}

						{isLoading && (
							<motion.div
								className="flex justify-start"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
							>
								<div className="chat-bubble chat-bubble-ai">
									<div className="flex items-center space-x-2">
										<div className="flex space-x-1">
											<div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
											<div
												className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
												style={{ animationDelay: "0.1s" }}
											/>
											<div
												className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
												style={{ animationDelay: "0.2s" }}
											/>
										</div>
										<span className="text-gray-500 text-xs">Thinking...</span>
									</div>
								</div>
							</motion.div>
						)}
						<div ref={messagesEndRef} />
					</div>

					{/* Input */}
					<div className="p-4 border-t border-gray-200 bg-white">
						<form onSubmit={handleSubmit} className="flex space-x-2">
							<input
								ref={inputRef}
								type="text"
								value={inputValue}
								onChange={(e) => setInputValue(e.target.value)}
								placeholder={
									canInteract
										? isDevelopment && !isOnYouTube
											? "Ask about the extension..."
											: "Ask about this video..."
										: "Navigate to a YouTube video first"
								}
								disabled={!canInteract || isLoading}
								className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
							/>
							<button
								type="submit"
								disabled={!inputValue.trim() || !canInteract || isLoading}
								className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
							>
								<Send size={16} />
							</button>
						</form>
					</div>
				</>
			)}
		</motion.div>
	);
};

export default ChatSidebar;

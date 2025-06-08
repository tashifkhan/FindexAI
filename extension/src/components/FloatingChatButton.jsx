import React from "react";
import { motion } from "framer-motion";
import { MessageCircle, Sparkles } from "lucide-react";

const FloatingChatButton = ({
	onClick,
	hasVideoData,
	isDevelopment = false,
}) => {
	return (
		<motion.button
			className="floating-button group"
			onClick={onClick}
			initial={{ scale: 0, opacity: 0 }}
			animate={{ scale: 1, opacity: 1 }}
			exit={{ scale: 0, opacity: 0 }}
			whileHover={{ scale: 1.1 }}
			whileTap={{ scale: 0.95 }}
			transition={{ type: "spring", stiffness: 300, damping: 20 }}
		>
			<div className="relative">
				<MessageCircle
					size={24}
					className="transition-transform group-hover:scale-110"
				/>
				{(hasVideoData || isDevelopment) && (
					<motion.div
						className={`absolute -top-1 -right-1 w-3 h-3 ${
							isDevelopment ? "bg-blue-400" : "bg-green-400"
						} rounded-full`}
						initial={{ scale: 0 }}
						animate={{ scale: 1 }}
						transition={{ delay: 0.2 }}
					>
						<motion.div
							className={`w-full h-full ${
								isDevelopment ? "bg-blue-400" : "bg-green-400"
							} rounded-full`}
							animate={{ scale: [1, 1.2, 1] }}
							transition={{ duration: 2, repeat: Infinity }}
						/>
					</motion.div>
				)}
			</div>

			{/* Tooltip */}
			<motion.div
				className="absolute right-full mr-3 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
				initial={{ opacity: 0, x: 10 }}
				whileHover={{ opacity: 1, x: 0 }}
			>
				Ask about this video
				<div className="absolute left-full top-1/2 -translate-y-1/2 w-0 h-0 border-l-4 border-l-gray-900 border-y-4 border-y-transparent" />
			</motion.div>
		</motion.button>
	);
};

export default FloatingChatButton;

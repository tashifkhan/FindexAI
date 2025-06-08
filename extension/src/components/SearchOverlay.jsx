import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { Search, ChevronUp, ChevronDown, X } from "lucide-react";

const SearchOverlay = ({
	searchTerm,
	setSearchTerm,
	searchResults,
	currentIndex,
	onClose,
	onNext,
	onPrev,
}) => {
	useEffect(() => {
		// Focus the search input when overlay opens
		const searchInput = document.getElementById("search-input");
		if (searchInput) {
			searchInput.focus();
		}
	}, []);

	const handleKeyDown = (e) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			onNext();
		} else if (e.key === "Enter" && e.shiftKey) {
			e.preventDefault();
			onPrev();
		}
	};

	return (
		<motion.div
			className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-20"
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
		>
			<motion.div
				className="bg-white rounded-lg shadow-2xl border border-gray-200 w-full max-w-md mx-4"
				initial={{ opacity: 0, y: -50, scale: 0.95 }}
				animate={{ opacity: 1, y: 0, scale: 1 }}
				exit={{ opacity: 0, y: -50, scale: 0.95 }}
				transition={{ type: "spring", stiffness: 300, damping: 30 }}
			>
				{/* Header */}
				<div className="flex items-center justify-between p-4 border-b border-gray-200">
					<div className="flex items-center space-x-2">
						<Search size={20} className="text-blue-500" />
						<h3 className="font-semibold text-gray-900">Search in Video</h3>
					</div>
					<button
						onClick={onClose}
						className="p-1 hover:bg-gray-100 rounded transition-colors"
					>
						<X size={16} className="text-gray-600" />
					</button>
				</div>

				{/* Search Input */}
				<div className="p-4">
					<div className="relative">
						<input
							id="search-input"
							type="text"
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							onKeyDown={handleKeyDown}
							placeholder="Search in transcript..."
							className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						/>
						<div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1">
							<Search size={16} className="text-gray-400" />
						</div>
					</div>

					{/* Search Results Info */}
					{searchTerm && (
						<div className="mt-3 flex items-center justify-between">
							<div className="text-sm text-gray-600">
								{searchResults.length > 0 ? (
									<>
										<span className="font-medium">{currentIndex + 1}</span> of{" "}
										<span className="font-medium">{searchResults.length}</span>{" "}
										results
									</>
								) : (
									"No results found"
								)}
							</div>

							{searchResults.length > 0 && (
								<div className="flex items-center space-x-1">
									<button
										onClick={onPrev}
										disabled={searchResults.length === 0}
										className="p-1 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
										title="Previous result (Shift+Enter)"
									>
										<ChevronUp size={16} className="text-gray-600" />
									</button>
									<button
										onClick={onNext}
										disabled={searchResults.length === 0}
										className="p-1 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
										title="Next result (Enter)"
									>
										<ChevronDown size={16} className="text-gray-600" />
									</button>
								</div>
							)}
						</div>
					)}

					{/* Instructions */}
					<div className="mt-3 text-xs text-gray-500 space-y-1">
						<div>
							• Press{" "}
							<kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">
								Enter
							</kbd>{" "}
							for next result
						</div>
						<div>
							• Press{" "}
							<kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">
								Shift+Enter
							</kbd>{" "}
							for previous result
						</div>
						<div>
							• Press{" "}
							<kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Esc</kbd>{" "}
							to close
						</div>
					</div>
				</div>
			</motion.div>
		</motion.div>
	);
};

export default SearchOverlay;

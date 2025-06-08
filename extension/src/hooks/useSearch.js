import { useState, useEffect, useCallback, useRef } from "react";

export const useSearch = () => {
	const [searchTerm, setSearchTerm] = useState("");
	const [searchResults, setSearchResults] = useState([]);
	const [currentIndex, setCurrentIndex] = useState(0);
	const originalNodesRef = useRef([]); // To store original state for cleanup

	// Clear all highlights by restoring the original text nodes
	const clearHighlights = useCallback(() => {
		originalNodesRef.current.forEach(({ parent, node }) => {
			if (parent && parent.contains(node)) {
				parent.replaceWith(node); // Restore the original text node
			}
		});
		// After restoring, normalize the parent to merge adjacent text nodes
		originalNodesRef.current.forEach(({ parent }) => {
			parent?.parentNode?.normalize();
		});
		originalNodesRef.current = [];
		setSearchResults([]);
		setCurrentIndex(0);
	}, []);

	// The new, safe highlighting function that avoids innerHTML
	const highlightText = useCallback(
		(term) => {
			clearHighlights();
			if (!term.trim()) return;

			const walker = document.createTreeWalker(
				document.body,
				NodeFilter.SHOW_TEXT,
				{
					acceptNode: (node) => {
						const parent = node.parentElement;
						if (
							!parent ||
							["SCRIPT", "STYLE", "NOSCRIPT", "MARK"].includes(parent.tagName)
						) {
							return NodeFilter.FILTER_REJECT;
						}
						return node.nodeValue.toLowerCase().includes(term.toLowerCase())
							? NodeFilter.FILTER_ACCEPT
							: NodeFilter.FILTER_REJECT;
					},
				}
			);

			const textNodes = [];
			let node;
			while ((node = walker.nextNode())) {
				textNodes.push(node);
			}

			const results = [];
			const originalNodes = [];

			textNodes.forEach((node) => {
				const text = node.nodeValue;
				const regex = new RegExp(
					`(${term.replace(/[.*+?^${"()"}|\[\]\\\\]/g, "\\$&")})`,
					"gi"
				);
				const parts = text.split(regex);

				if (parts.length > 1) {
					const fragment = document.createDocumentFragment();
					parts.forEach((part, index) => {
						if (index % 2 === 1) {
							// This is a match
							const mark = document.createElement("mark");
							mark.className = "search-highlight";
							mark.textContent = part;
							fragment.appendChild(mark);
							results.push({ element: mark, index: results.length });
						} else if (part) {
							fragment.appendChild(document.createTextNode(part));
						}
					});

					const parent = node.parentNode;
					if (parent) {
						originalNodes.push({ parent: parent, node: node.cloneNode() });
						parent.replaceChild(fragment, node);
					}
				}
			});

			originalNodesRef.current = originalNodes;
			setSearchResults(results);
			setCurrentIndex(0);

			if (results.length > 0) {
				scrollToResult(0, results);
			}
		},
		[clearHighlights]
	);

	const scrollToResult = useCallback((index, results) => {
		const resultsToUse = results || searchResults;
		if (resultsToUse.length === 0) return;

		document.querySelectorAll(".search-highlight-current").forEach((el) => {
			el.classList.remove("search-highlight-current");
			el.classList.add("search-highlight");
		});

		const result = resultsToUse[index];
		if (result && result.element) {
			result.element.classList.remove("search-highlight");
			result.element.classList.add("search-highlight-current");
			result.element.scrollIntoView({ behavior: "smooth", block: "center" });
		}
	}, [searchResults]);

	const nextResult = useCallback(() => {
		if (searchResults.length === 0) return;
		const newIndex = (currentIndex + 1) % searchResults.length;
		setCurrentIndex(newIndex);
		scrollToResult(newIndex);
	}, [currentIndex, searchResults, scrollToResult]);

	const prevResult = useCallback(() => {
		if (searchResults.length === 0) return;
		const newIndex =
			currentIndex === 0 ? searchResults.length - 1 : currentIndex - 1;
		setCurrentIndex(newIndex);
		scrollToResult(newIndex);
	}, [currentIndex, searchResults, scrollToResult]);

	const clearSearch = useCallback(() => {
		clearHighlights();
		setSearchTerm("");
	}, [clearHighlights]);

	useEffect(() => {
		const timeoutId = setTimeout(() => {
			highlightText(searchTerm);
		}, 300); // Debounce search

		return () => clearTimeout(timeoutId);
	}, [searchTerm, highlightText]);

	useEffect(() => {
		return () => {
			clearHighlights();
		};
	}, [clearHighlights]);

	return {
		searchTerm,
		setSearchTerm,
		searchResults,
		currentIndex,
		nextResult,
		prevResult,
		clearSearch,
	};
};

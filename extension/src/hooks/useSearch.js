import { useState, useEffect, useCallback, useRef } from 'react'

export const useSearch = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const highlightedElementsRef = useRef([])
  const searchResultsRef = useRef([])

  // Update refs when values change
  useEffect(() => {
    searchResultsRef.current = searchResults
  }, [searchResults])

  // Clear all highlights
  const clearHighlights = useCallback(() => {
    highlightedElementsRef.current.forEach(({ element, originalHTML }) => {
      try {
        element.innerHTML = originalHTML
      } catch (error) {
        // Element might have been removed from DOM
        console.warn('Could not restore element:', error)
      }
    })
    highlightedElementsRef.current = []
    setSearchResults([])
    setCurrentIndex(0)
  }, [])

  // Function to highlight text in the DOM
  const highlightText = useCallback((term) => {
    if (!term.trim()) {
      clearHighlights()
      return
    }

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // Skip script and style elements
          const parent = node.parentElement
          if (!parent || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName)) {
            return NodeFilter.FILTER_REJECT
          }
          
          // Only include text nodes that contain the search term
          return node.textContent.toLowerCase().includes(term.toLowerCase())
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT
        }
      }
    )

    const textNodes = []
    let node
    while (node = walker.nextNode()) {
      textNodes.push(node)
    }

    const results = []
    const elements = []

    textNodes.forEach((textNode) => {
      const text = textNode.textContent
      const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
      const matches = [...text.matchAll(regex)]

      if (matches.length > 0) {
        const parent = textNode.parentElement
        const originalHTML = parent.innerHTML
        
        // Replace text with highlighted version
        const highlightedHTML = text.replace(regex, '<mark class="search-highlight">$1</mark>')
        
        // Only replace if the parent doesn't already contain our highlights
        if (!parent.querySelector('.search-highlight')) {
          parent.innerHTML = parent.innerHTML.replace(text, highlightedHTML)
          elements.push({ element: parent, originalHTML })
          
          // Add results for navigation
          const newHighlights = parent.querySelectorAll('.search-highlight')
          newHighlights.forEach((highlight, index) => {
            results.push({
              element: highlight,
              index: results.length
            })
          })
        }
      }
    })

    highlightedElementsRef.current = elements
    setSearchResults(results)
    setCurrentIndex(0)

    // Scroll to first result
    if (results.length > 0) {
      scrollToResult(0, results)
    }
  }, [])

  // Scroll to a specific result
  const scrollToResult = useCallback((index, results) => {
    const resultsToUse = results || searchResultsRef.current
    if (resultsToUse.length === 0) return

    // Remove current highlight class from all elements
    document.querySelectorAll('.search-highlight-current').forEach(el => {
      el.classList.remove('search-highlight-current')
      el.classList.add('search-highlight')
    })

    // Add current highlight to the new element
    const result = resultsToUse[index]
    if (result && result.element) {
      result.element.classList.remove('search-highlight')
      result.element.classList.add('search-highlight-current')
      result.element.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      })
    }
  }, [])

  // Navigate to next result
  const nextResult = useCallback(() => {
    const results = searchResultsRef.current
    if (results.length === 0) return
    setCurrentIndex(prevIndex => {
      const newIndex = (prevIndex + 1) % results.length
      scrollToResult(newIndex)
      return newIndex
    })
  }, [])

  // Navigate to previous result
  const prevResult = useCallback(() => {
    const results = searchResultsRef.current
    if (results.length === 0) return
    setCurrentIndex(prevIndex => {
      const newIndex = prevIndex === 0 ? results.length - 1 : prevIndex - 1
      scrollToResult(newIndex)
      return newIndex
    })
  }, [])

  // Clear search
  const clearSearch = useCallback(() => {
    clearHighlights()
    setSearchTerm('')
  }, [])

  // Effect to update highlights when search term changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim()) {
        highlightText(searchTerm)
      } else {
        clearHighlights()
      }
    }, 300) // Debounce search

    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearHighlights()
    }
  }, [])

  return {
    searchTerm,
    setSearchTerm,
    searchResults,
    currentIndex,
    nextResult,
    prevResult,
    clearSearch
  }
}

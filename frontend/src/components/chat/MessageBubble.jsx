// components/chat/MessageBubble.jsx
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import ReferenceHighlight from "./ReferenceHighlight";
import PDFViewer from "./PDFViewer";
import { getPdfUrlForDocument } from "../../services/api";
import "../../theme.css";
import "./reference-styles.css";

function formatTimestamp(ts) {
  const date = new Date(ts);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function MessageBubble({ message }) {
  const isUser = message.role === "user";
  const ref = useRef(null);
  const [selectedReference, setSelectedReference] = useState(null);
  
  // Process content to add clickable references
  const processContentWithReferences = (content) => {
    if (isUser || !content || !message.references || message.references.length === 0) return content;
    
    let processedContent = content;
    
    // Standardize all reference formats:
    
    // 1. First convert expanded references to simple format
    // [Reference X - Document: filename.pdf, Page: Y] -> [X]
    const expandedRefRegex = /\[Reference (\d+) - Document: [^,]+, Page: \d+\]/g;
    processedContent = processedContent.replace(expandedRefRegex, (match, refNumber) => {
      return `[${refNumber}]`;
    });
    
    // 2. Now replace simple references [X] with clickable numbered links
    const simpleRefRegex = /\[(\d+)\](?!\s*-)/g;
    processedContent = processedContent.replace(simpleRefRegex, (match, refNumber) => {
      const refNum = parseInt(refNumber, 10);
      
      if (refNum > 0 && refNum <= message.references.length) {
        // Find the reference with matching ID to make sure it exists
        const reference = message.references.find(ref => ref.id === refNum);
        if (reference) {
          // Keep the original [X] format but make it clickable
          return `<a href="#" class="reference-link" data-ref="${refNumber}" style="color: var(--color-primary); text-decoration: underline; cursor: pointer; font-weight: bold;">[${refNumber}]</a>`;
        }
      }
      return match;
    });
    
    return processedContent;
  };

  // Memoize the processed content to avoid unnecessary re-processing
  const processedContent = useMemo(() => {
    return processContentWithReferences(message.content);
  }, [message.content, message.references]);

  // Handle reference link clicks
  const handleReferenceClick = useCallback((refNumber, event) => {
    event.preventDefault();
    
    // Convert refNumber to an integer if it's a string
    const refNum = parseInt(refNumber, 10);
    
    if (message.references && message.references.length > 0) {
      // Find the reference with matching ID
      const reference = message.references.find(ref => ref.id === refNum);
      if (reference) {
        setSelectedReference(reference);
      } else if (message.references.length >= refNum && refNum > 0) {
        // Fallback to index-based if ID matching fails
        setSelectedReference(message.references[refNum - 1]);
      }
    }
  }, [message.references]);
  
  // Handle clicking on reference links with React event delegation
  const handleContentClick = useCallback((e) => {
    // Check if clicked element is a reference link
    if (e.target.classList.contains('reference-link')) {
      e.preventDefault();
      
      // Get the reference number from the data attribute
      const refNumberAttr = e.target.getAttribute('data-ref');
      
      if (refNumberAttr) {
        const refNumber = parseInt(refNumberAttr, 10);
        handleReferenceClick(refNumber, e);
      }
    }
  }, [handleReferenceClick]);
  
  // Use event delegation instead of attaching listeners to each link
  useEffect(() => {
    if (!isUser && ref.current) {
      // Add click listener to the container
      ref.current.addEventListener('click', handleContentClick);
      
      // Cleanup
      return () => {
        if (ref.current) {
          ref.current.removeEventListener('click', handleContentClick);
        }
      };
    }
  }, [isUser, handleContentClick, processedContent]); // Use processedContent instead of raw message properties

  // Function to get the PDF file path
  const getPdfFilePath = (reference) => {
    if (!reference || !reference.source || typeof reference.source !== 'string') {
      return null;
    }
    
    return getPdfUrlForDocument(reference.source);
  };

  return (
    <div className="flex w-full gap-4 animate-fade-in">
      <div className={`flex flex-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
        <div
          ref={ref}
          className={`message-bubble px-6 py-5 rounded-2xl max-w-[85%] shadow-lg transition-all duration-300 hover:shadow-xl ${
            isUser
              ? 'message-bubble-user text-white ml-auto'
              : 'message-bubble-ai text-white/90'
          }`}
          data-testid={isUser ? 'user-message' : 'ai-message'}
          data-message-type={isUser ? 'user' : 'ai'}
        >
          <div className="whitespace-pre-line leading-relaxed text-base font-normal" style={{ color: isUser ? 'white' : 'rgba(248, 250, 252, 0.95)' }}>
            {isUser ? (
              <div className="prose prose-invert max-w-none prose-p:mb-2 prose-p:leading-relaxed">
                <ReactMarkdown>
                  {message.content}
                </ReactMarkdown>
              </div>
            ) : (
              <div 
                key={`${message.id}-${message.references?.length || 0}`}
                className="ai-message-content prose prose-invert max-w-none prose-p:mb-2 prose-p:leading-relaxed" 
                dangerouslySetInnerHTML={{ 
                  __html: processedContent 
                }} 
              />
            )}
          </div>
          
          <div className="text-xs mt-4 text-white/50 text-right select-none font-mono">
            {formatTimestamp(message.timestamp)}
          </div>
        </div>
      </div>
      
      {/* PDF Viewer panel */}
      {!isUser && selectedReference && (
        <div className="ml-4 w-[400px] rounded-2xl overflow-hidden animate-slide-in-right shadow-2xl border border-white/20"
             style={{
               background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
               backdropFilter: 'blur(20px)',
               WebkitBackdropFilter: 'blur(20px)'
             }}>
          <div className="p-4 border-b border-white/20 flex justify-between items-center bg-gradient-to-r from-white/10 to-white/5">
            <div className="flex-1 overflow-hidden">
              <span className="text-sm font-semibold text-white/90 truncate block">
                {selectedReference.source}
              </span>
              <span className="text-xs text-white/60">Page {selectedReference.page}</span>
            </div>
            <button 
              onClick={() => setSelectedReference(null)}
              className="text-white/60 hover:text-white/90 p-2 rounded-full hover:bg-white/10 transition-all interactive"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="h-[500px]">
            <PDFViewer 
              filePath={getPdfFilePath(selectedReference)} 
              pageNumber={selectedReference.page} 
              highlightText={selectedReference.text?.substring(0, 40)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
// components/chat/ReferenceHighlight.jsx
import React, { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon, DocumentTextIcon, DocumentMagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Button } from '../ui/button';

// Base API URL for document previews
const API_BASE_URL = '/api';

export default function ReferenceHighlight({ references = [], context = [], isVisible = true, onViewDocument }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // First try to use the new references format, fall back to context for backward compatibility
  const hasReferences = references && references.length > 0;
  const refCount = hasReferences ? references.length : (context ? context.length : 0);
  
  if ((!hasReferences && (!context || context.length === 0)) || !isVisible) {
    return null;
  }

  const handleViewDocument = (reference) => {
    if (onViewDocument) {
      onViewDocument(reference);
    }
  };

  return (
    <div className="mt-3 border-t border-[var(--color-border)] pt-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] transition-colors"
      >
        {isExpanded ? (
          <ChevronDownIcon className="w-4 h-4" />
        ) : (
          <ChevronRightIcon className="w-4 h-4" />
        )}
        <DocumentTextIcon className="w-4 h-4" />
        <span>View {refCount} reference{refCount > 1 ? 's' : ''}</span>
      </button>
      
      {isExpanded && (
        <div className="mt-2 space-y-2">
          {hasReferences ? (
            // New format with structured references
            references.map((ref) => (
              <div
                key={ref.id}
                className="bg-[var(--color-bg-accent)] border border-[var(--color-border)] rounded-md p-3 text-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <DocumentTextIcon className="w-4 h-4 text-[var(--color-primary)]" />
                    <span className="font-medium text-[var(--color-text-main)]">
                      {ref.source} - Page {ref.page}
                    </span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleViewDocument(ref)}
                    className="text-xs flex items-center gap-1 bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)]"
                  >
                    <DocumentMagnifyingGlassIcon className="w-4 h-4" />
                    View PDF
                  </Button>
                </div>
                <p className="text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-wrap">
                  {ref.text}
                </p>
              </div>
            ))
          ) : (
            // Legacy format for backward compatibility
            context.map((ref, index) => (
              <div
                key={index}
                className="bg-[var(--color-bg-accent)] border border-[var(--color-border)] rounded-md p-3 text-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <DocumentTextIcon className="w-4 h-4 text-[var(--color-primary)]" />
                    <span className="font-medium text-[var(--color-text-main)]">
                      Reference {index + 1}
                    </span>
                  </div>
                  {ref.source_path && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleViewDocument(ref)}
                      className="text-xs flex items-center gap-1 bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)]"
                    >
                      <DocumentMagnifyingGlassIcon className="w-4 h-4" />
                      View PDF
                    </Button>
                  )}
                </div>
                <p className="text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-wrap">
                  {typeof ref === 'string' ? ref : ref.content || ref.page_content || 'No content available'}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

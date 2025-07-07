// components/chat/PDFViewer.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeftIcon, ChevronRightIcon, DocumentMagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Button } from '../ui/button';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';

export default function PDFViewer({ filePath, pageNumber, highlightText = null }) {
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(pageNumber || 1);
  const [scale, setScale] = useState(1.2);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // filePath is already the full URL path from getPdfUrlForDocument
  const pdfUrl = filePath;
  
  console.log('PDFViewer:', {
    filePath: filePath,
    pdfUrl: pdfUrl
  });
  
  useEffect(() => {
    // When pageNumber prop changes, update current page
    if (pageNumber) {
      setCurrentPage(pageNumber);
    }
  }, [pageNumber]);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
    setIsLoading(false);
  }

  function onDocumentLoadError(error) {
    setError('Failed to load PDF document');
    setIsLoading(false);
  }

  function zoomIn() {
    setScale(prevScale => Math.min(prevScale + 0.2, 3));
  }
  
  function zoomOut() {
    setScale(prevScale => Math.max(prevScale - 0.2, 0.6));
  }

  // Custom options for PDF loading with authentication
  const options = {
    httpHeaders: {
      'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
    },
    withCredentials: true
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[var(--color-bg-card)] p-6 rounded-md">
        <DocumentMagnifyingGlassIcon className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-center text-[var(--color-text-main)]">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-md overflow-hidden">
      {/* Header with controls */}
      <div className="p-2 bg-[var(--color-bg)] flex items-center justify-between border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
            disabled={currentPage <= 1}
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </Button>
          
          <span className="text-sm font-medium">
            Page {currentPage} of {numPages || '?'}
          </span>
          
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => setCurrentPage(p => p < numPages ? p + 1 : p)}
            disabled={currentPage >= numPages}
          >
            <ChevronRightIcon className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={zoomIn}
          >
            Zoom +
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={zoomOut}
          >
            Zoom -
          </Button>
        </div>
      </div>
      
      {/* PDF Document */}
      <div className="flex-1 overflow-auto bg-[var(--color-bg-alt)]">
        <div className="flex flex-col items-center py-6">
          {pdfUrl && (
            <Document
              file={pdfUrl}
              options={options}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="flex items-center justify-center h-[500px]">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]"></div>
                </div>
              }
              error={
                <div className="flex flex-col items-center justify-center h-[500px]">
                  <DocumentMagnifyingGlassIcon className="w-12 h-12 text-red-500 mb-2" />
                  <p className="text-center text-[var(--color-text-main)]">Failed to load PDF</p>
                </div>
              }
            >
              <Page
                pageNumber={currentPage}
                scale={scale}
                customTextRenderer={highlightText ? ({ str, itemIndex }) => {
                  if (str.includes(highlightText)) {
                    return (
                      <mark 
                        key={`highlight-${itemIndex}`}
                        className="bg-yellow-300 text-gray-800"
                      >
                        {str}
                      </mark>
                    );
                  }
                  return null;
                } : undefined}
              />
            </Document>
          )}
        </div>
      </div>
    </div>
  );
}

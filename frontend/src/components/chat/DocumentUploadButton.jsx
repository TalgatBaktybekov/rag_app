// DocumentUploadButton.jsx
import React, { useState, useEffect } from 'react';
import { uploadDocuments, ingestDocument, getDocumentStatus } from '../../services/api';

export default function DocumentUploadButton() {
  const [isUploading, setIsUploading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [pollingDocIds, setPollingDocIds] = useState([]);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    
    // Validate files
    const validFiles = selectedFiles.filter(file => {
      if (file.type !== 'application/pdf') {
        alert(`${file.name} is not a PDF file and will be skipped.`);
        return false;
      }
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        alert(`${file.name} is too large (max 50MB) and will be skipped.`);
        return false;
      }
      return true;
    });

    setFiles(validFiles);
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      alert('Please select at least one PDF file.');
      return;
    }

    setIsUploading(true);
    setUploadStatus('');
    setUploadedDocs([]);

    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });

      setUploadStatus('Uploading files...');

      // Upload files
      const result = await uploadDocuments(formData);
      
      if (!result.documents || result.documents.length === 0) {
        throw new Error('No documents were uploaded successfully');
      }

      setUploadedDocs(result.documents.map(doc => ({ 
        ...doc, 
        ingestStarted: false, 
        processed: false,
        status: 'uploaded'
      })));
      
      setUploadStatus('Files uploaded successfully. Starting processing...');

      // Automatically start processing for all uploaded documents
      const processingPromises = result.documents.map(async (doc) => {
        try {
          await ingestDocument(doc.document_id);
          setUploadedDocs(docs => 
            docs.map(d => 
              d.document_id === doc.document_id 
                ? { ...d, ingestStarted: true, status: 'processing' }
                : d
            )
          );
          return doc.document_id;
        } catch (error) {
          console.error(`Failed to start processing for document ${doc.document_id}:`, error);
          setUploadedDocs(docs => 
            docs.map(d => 
              d.document_id === doc.document_id 
                ? { ...d, ingestStarted: false, status: 'error' }
                : d
            )
          );
          return null;
        }
      });

      // Add successfully started documents to polling
      const startedDocIds = await Promise.all(processingPromises);
      const validDocIds = startedDocIds.filter(id => id !== null);
      
      if (validDocIds.length > 0) {
        setPollingDocIds(validDocIds);
        setUploadStatus(`Processing ${validDocIds.length} document(s). This may take several minutes for large files.`);
      } else {
        setUploadStatus('Upload completed but processing failed to start. Please try again.');
      }
      
      // Clear file input
      setFiles([]);
      
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus(`Upload failed: ${error.response?.data?.detail || error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Poll for document status updates with better error handling and timing
  useEffect(() => {
    if (pollingDocIds.length === 0) return;
    
    let pollCount = 0;
    const maxPollAttempts = 100; // 5 minutes max (100 * 3 seconds)
    
    // Set up interval to poll for document status
    const intervalId = setInterval(async () => {
      pollCount++;
      
      try {
        // Check status for each document in polling state
        const updatedStatuses = await Promise.all(
          pollingDocIds.map(async docId => {
            try {
              const status = await getDocumentStatus(docId);
              return { 
                docId, 
                processed: status.ingested,
                error: false,
                status: status.status || 'processing'
              };
            } catch (error) {
              console.error(`Error checking status for document ${docId}:`, error);
              return { 
                docId, 
                processed: false, 
                error: true,
                status: 'error'
              };
            }
          })
        );
        
        // Update document statuses
        let stillPolling = false;
        setUploadedDocs(docs => 
          docs.map(doc => {
            const statusUpdate = updatedStatuses.find(s => s.docId === doc.document_id);
            if (statusUpdate) {
              if (statusUpdate.processed) {
                return { ...doc, ingestStarted: true, processed: true, status: 'completed' };
              } else if (statusUpdate.error) {
                return { ...doc, ingestStarted: true, processed: false, status: 'error' };
              } else {
                stillPolling = true;
                return { ...doc, ingestStarted: true, status: statusUpdate.status || 'processing' };
              }
            }
            return doc;
          })
        );
        
        // Stop polling if all documents are processed/errored or max attempts reached
        if (!stillPolling || pollCount >= maxPollAttempts) {
          setPollingDocIds([]);
          if (pollCount >= maxPollAttempts) {
            console.warn('Document processing polling timed out after 5 minutes');
            setUploadStatus('Some documents may still be processing. Please refresh to check status.');
          }
        }
        
      } catch (error) {
        console.error('Error during polling:', error);
        // Continue polling unless it's a critical error
      }
    }, 2000); // Check every 2 seconds for better responsiveness
    
    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, [pollingDocIds]);
  
  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const openModal = () => setShowModal(true);
  const closeModal = () => {
    setShowModal(false);
    setUploadStatus('');
    setUploadedDocs([]);
    setPollingDocIds([]);
  };

  return (
    <>
      <button
        onClick={openModal}
        className="glass-button flex items-center gap-2 px-4 py-2 text-sm rounded-xl font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg interactive"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
        Upload Documents
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="glass-card rounded-2xl p-8 w-full max-w-lg mx-4 shadow-2xl border border-white/20 animate-slide-in-up"
               style={{
                 background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.06) 100%)',
                 backdropFilter: 'blur(20px)',
                 WebkitBackdropFilter: 'blur(20px)'
               }}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">
                Upload Documents
              </h2>
              <button
                onClick={closeModal}
                className="text-white/60 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10 interactive"
                disabled={isUploading}
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-main)] mb-2">
                  Select PDF Files (max 50MB each)
                </label>
                <input
                  type="file"
                  multiple
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="w-full text-sm text-[var(--color-text-secondary)]
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-[var(--color-primary)] file:text-white
                    hover:file:bg-[var(--color-primary-light)]"
                  disabled={isUploading}
                />
              </div>

              {files.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-[var(--color-text-main)] mb-2">
                    Selected Files:
                  </h3>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {files.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-[var(--color-bg-accent)] p-2 rounded">
                        <span className="text-sm text-[var(--color-text-main)] truncate">
                          {file.name}
                        </span>
                        <button
                          onClick={() => removeFile(index)}
                          className="text-red-400 hover:text-red-300 ml-2"
                          disabled={isUploading}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {uploadStatus && (
                <div className={`p-3 rounded ${
                  uploadStatus.includes('failed') || uploadStatus.includes('error')
                    ? 'bg-red-900/20 text-red-400 border border-red-400/30'
                    : 'bg-green-900/20 text-green-400 border border-green-400/30'
                }`}>
                  {uploadStatus}
                </div>
              )}

              {uploadedDocs.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-[var(--color-text-main)] mb-2">
                    Document Processing Status:
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {uploadedDocs.map((doc) => (
                      <div key={doc.document_id} className="flex items-center bg-[var(--color-bg-accent)] p-3 rounded-lg border border-white/10">
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-[var(--color-text-main)] truncate block font-medium">
                            {doc.display_name}
                          </span>
                          <div className="text-xs mt-1 flex items-center gap-2">
                            {doc.status === 'completed' || doc.processed ? (
                              <span className="text-green-400 flex items-center gap-1">
                                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                                Successfully Processed
                              </span>
                            ) : doc.status === 'error' ? (
                              <span className="text-red-400 flex items-center gap-1">
                                <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                                Processing Failed
                              </span>
                            ) : doc.ingestStarted ? (
                              <span className="text-yellow-400 flex items-center gap-1">
                                <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
                                Processing... (this may take a few minutes for large files)
                              </span>
                            ) : (
                              <span className="text-gray-400 flex items-center gap-1">
                                <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                                Waiting to start
                              </span>
                            )}
                          </div>
                          {doc.document_id && (
                            <div className="text-xs text-[var(--color-text-muted)] mt-1">
                              ID: {doc.document_id.toString().substring(0, 8)}...
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {pollingDocIds.length > 0 && (
                    <div className="mt-3 p-2 bg-blue-900/20 border border-blue-400/30 rounded-md">
                      <div className="text-xs text-blue-300 flex items-center gap-2">
                        <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                        Checking processing status... Large documents may take several minutes.
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleUpload}
                  disabled={files.length === 0 || isUploading}
                  className="flex-1 bg-[var(--color-primary)] text-white py-2 px-4 rounded-md hover:bg-[var(--color-primary-light)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? 'Uploading...' : 'Upload'}
                </button>
                <button
                  onClick={closeModal}
                  className="px-4 py-2 border border-[var(--color-border)] text-[var(--color-text-main)] rounded-md hover:bg-[var(--color-bg-accent)]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// DocumentUploadButton.jsx
import React, { useState } from 'react';
import { uploadDocuments } from '../../services/api';

export default function DocumentUploadButton() {
  const [isUploading, setIsUploading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadedDocs, setUploadedDocs] = useState([]);

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

      // Show initial processing state for all files
      setUploadedDocs(files.map((file, index) => ({
        document_id: `temp_${index}`,
        filename: file.name,
        display_name: file.name,
        status: 'uploading',
        processed: false
      })));

      setUploadStatus('Processing documents... This may take several minutes for large files.');

      // Upload and process files synchronously (like chat messages)
      const result = await uploadDocuments(formData);
      
      if (!result.documents || result.documents.length === 0) {
        throw new Error('No documents were uploaded successfully');
      }

      // Update with final results
      setUploadedDocs(result.documents.map(doc => ({
        ...doc,
        status: doc.status || (doc.processed ? 'completed' : 'failed')
      })));
      
      const successCount = result.documents.filter(doc => doc.processed).length;
      const failCount = result.documents.length - successCount;
      
      if (failCount > 0) {
        setUploadStatus(`Processed ${successCount} documents successfully, ${failCount} failed.`);
      } else {
        setUploadStatus(`All ${successCount} documents processed successfully!`);
      }
      
      // Clear file input
      setFiles([]);
      
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus(`Upload failed: ${error.response?.data?.detail || error.message}`);
      // Update all documents to error state
      setUploadedDocs(prev => prev.map(doc => ({ ...doc, status: 'error', processed: false })));
    } finally {
      setIsUploading(false);
    }
  };
  
  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const openModal = () => setShowModal(true);
  const closeModal = () => {
    setShowModal(false);
    setUploadStatus('');
    setUploadedDocs([]);
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

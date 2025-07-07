// DocumentSelection.jsx
import React, { useState, useEffect } from 'react';
import { listDocuments, selectDocumentsForConversation, getSelectedDocuments, deleteDocument } from '../../services/api';

export default function DocumentSelection({ conversationId, onClose, onDocumentsSelected, initialSelectedDocIds = [] }) {
  const [documents, setDocuments] = useState([]);
  const [selectedDocIds, setSelectedDocIds] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [selectionChanged, setSelectionChanged] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setMessage('');
      
      try {
        // Fetch user documents
        const docsResponse = await listDocuments();
        
        // Make sure we're handling the document list correctly regardless of structure
        let docsList = [];
        if (Array.isArray(docsResponse)) {
          docsList = docsResponse;
        } else if (docsResponse && Array.isArray(docsResponse.documents)) {
          docsList = docsResponse.documents;
        } else if (docsResponse) {
          docsList = []; // Empty list as fallback
        }
        
        // Filter out documents that are not ingested for better UX
        const availableDocs = docsList.filter(doc => doc.ingested !== false);
        setDocuments(availableDocs);
        
        // Set initial selection from either conversation or initial prop
        let initialSelection = new Set(initialSelectedDocIds);
        
        // If conversation exists, get selected documents (overrides initial selection)
        if (conversationId) {
          try {
            const selectedResponse = await getSelectedDocuments(conversationId);
            
            // Handle possible response formats
            let selectedDocs = [];
            if (Array.isArray(selectedResponse)) {
              selectedDocs = selectedResponse;
            } else if (selectedResponse && Array.isArray(selectedResponse.documents)) {
              selectedDocs = selectedResponse.documents;
            }
            
            const selectedIds = new Set((selectedDocs || []).map(doc => doc.document_id));
            initialSelection = selectedIds;
          } catch (err) {
            setMessage("Could not load selected documents");
          }
        }
        
        setSelectedDocIds(initialSelection);
      } catch (error) {
        setMessage(`Error loading documents: ${error.message || 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [conversationId, initialSelectedDocIds]);

  const handleToggleDocument = (docId) => {
    setSelectedDocIds(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(docId)) {
        newSelection.delete(docId);
      } else {
        newSelection.add(docId);
      }
      setSelectionChanged(true);
      return newSelection;
    });
  };

  const handleSaveSelection = async () => {
    // If there's no conversation, just pass selected documents to parent
    if (!conversationId) {
      if (onDocumentsSelected) {
        onDocumentsSelected(Array.from(selectedDocIds));
      }
      if (onClose) onClose();
      return;
    }

    setIsSaving(true);
    setMessage('');
    
    try {
      const docIdsArray = Array.from(selectedDocIds);
      await selectDocumentsForConversation(conversationId, docIdsArray);
      setMessage('✓ Document selection saved successfully');
      setSelectionChanged(false);
      
      setTimeout(() => {
        if (onClose) onClose();
      }, 1500);
    } catch (error) {
      setMessage(`Error saving selection: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDocument = async (docId, displayName) => {
    if (!confirm(`Are you sure you want to delete "${displayName}"? This will permanently remove the document from your knowledge base.`)) {
      return;
    }

    try {
      await deleteDocument(docId);
      
      // Remove from documents list
      setDocuments(prev => prev.filter(doc => doc.document_id !== docId));
      
      // Remove from selected documents if it was selected
      setSelectedDocIds(prev => {
        const newSelection = new Set(prev);
        newSelection.delete(docId);
        return newSelection;
      });
      
      setMessage('✓ Document deleted successfully');
      setSelectionChanged(true);
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(`Error deleting document: ${error.response?.data?.detail || error.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
        <div className="glass-card rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl animate-slide-in-up"
             style={{
               background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.06) 100%)',
               backdropFilter: 'blur(20px)',
               WebkitBackdropFilter: 'blur(20px)'
             }}>
          <div className="flex items-center justify-center gap-3">
            <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-center text-white font-medium">Loading documents...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="glass-card rounded-2xl p-8 w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col shadow-2xl animate-slide-in-up"
           style={{
             background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.06) 100%)',
             backdropFilter: 'blur(20px)',
             WebkitBackdropFilter: 'blur(20px)'
           }}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">
              Select Knowledge Base Documents
            </h2>
            <p className="text-sm text-white/60">
              Choose which documents to use as sources for AI responses
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10 interactive"
            disabled={isSaving}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-3 mb-6">
          <p className="text-sm text-white/70">
            {conversationId 
              ? "Select documents to use as sources for this conversation."
              : "Select documents to use as sources for your next conversation."
            }
            {documents.length === 0 && " No documents available. Upload documents first."}
          </p>
          {selectedDocIds.size > 0 && (
            <div className="inline-flex items-center gap-2 text-sm font-medium text-blue-300 bg-blue-400/10 px-3 py-1 rounded-full">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
              </svg>
              {selectedDocIds.size} document{selectedDocIds.size !== 1 ? 's' : ''} selected
            </div>
          )}
        </div>

        {documents.length > 0 && (
          <div className="overflow-y-auto flex-1 mb-6 custom-scrollbar">
            <div className="space-y-3">
              {documents.map(doc => (
                <div 
                  key={doc.document_id}
                  onClick={() => doc.ingested && handleToggleDocument(doc.document_id)}
                  className={`p-4 rounded-xl flex items-center justify-between border transition-all duration-300 ${
                    selectedDocIds.has(doc.document_id) 
                    ? 'bg-gradient-to-r from-blue-400/20 to-blue-500/10 border-blue-400/50 shadow-md' 
                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                  } ${!doc.ingested ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer interactive'}`}
                >
                  <div className="flex-1">
                    <div className="font-medium text-[var(--color-text-main)]">
                      {doc.display_name}
                    </div>
                    <div className="text-xs text-[var(--color-text-secondary)] flex flex-wrap gap-2 mt-1">
                      {!doc.ingested && (
                        <span className="px-1.5 py-0.5 rounded-full bg-yellow-900/30 text-yellow-400 border border-yellow-500/20">
                          Not Processed
                        </span>
                      )}
                      {selectedDocIds.has(doc.document_id) && (
                        <span className="px-1.5 py-0.5 rounded-full bg-[var(--color-primary-light)]/30 text-[var(--color-primary)] border border-[var(--color-primary)]/20">
                          Selected
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="pl-3">
                    <div className={`w-5 h-5 rounded-sm border transition-colors ${
                      selectedDocIds.has(doc.document_id) 
                        ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white flex items-center justify-center'
                        : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)]'
                    }`}>
                      {selectedDocIds.has(doc.document_id) && (
                        <span className="text-xs">✓</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDocument(doc.document_id, doc.display_name);
                    }}
                    className="ml-2 text-red-600 hover:text-red-500"
                    title="Delete document"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {message && (
          <div className={`p-3 rounded mb-4 ${
            message.includes('Error') 
              ? 'bg-red-900/20 text-red-400 border border-red-400/30'
              : 'bg-green-900/20 text-green-400 border border-green-400/30'
          }`}>
            {message}
          </div>
        )}

        <div className="flex gap-4">
          <button
            onClick={handleSaveSelection}
            disabled={documents.length === 0 || isSaving || selectedDocIds.size === 0}
            className="flex-1 glass-button py-3 px-6 font-medium rounded-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 interactive"
          >
            {isSaving 
              ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </span>
              )
              : conversationId 
                ? (selectionChanged ? 'Save Changes' : 'Save Selection')
                : 'Select Documents'
            }
          </button>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 hover:border-white/30 transition-all duration-300 hover:scale-105 disabled:opacity-50 interactive"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

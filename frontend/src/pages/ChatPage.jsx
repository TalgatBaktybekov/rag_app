import PageLayout from '../components/layout/PageLayout';
import Sidebar from '../components/layout/Sidebar';
import ChatArea from '../components/layout/ChatArea';
import ConversationList from '../components/chat/ConversationList';
import ChatWindow from '../components/chat/ChatWindow';
import DocumentUploadButton from '../components/chat/DocumentUploadButton';
import DocumentSelection from '../components/chat/DocumentSelection';
import { useState, useEffect, useRef, useMemo } from "react";
import {
  fetchConversations,
  createConversation,
  deleteConversation,
  askQuestion,
  fetchMessages,
  selectDocumentsForConversation,
} from "../services/api";

export default function ChatPage() {
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showDocumentSelection, setShowDocumentSelection] = useState(false);
  const [preSelectedDocuments, setPreSelectedDocuments] = useState([]);
  const chatContainerRef = useRef(null);

  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.conv_id === activeConversationId);
  }, [conversations, activeConversationId]);

  useEffect(() => {
    const loadConversations = async () => {
      const convs = await fetchConversations();
      const convsWithMessages = await Promise.all(
        convs.map(async (conv) => {
          const messages = await fetchMessages(conv.conv_id);
          return { ...conv, messages };
        })
      );
      setConversations(convsWithMessages);
      setActiveConversationId(convsWithMessages.length ? convsWithMessages[0].conv_id : null);
    };
    loadConversations();
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
      setShowScrollButton(false);
    }
  }, [activeConversation?.messages]);

  const onScroll = () => {
    const el = chatContainerRef.current;
    if (!el) return;
    const nearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    setShowScrollButton(!nearBottom);
  };

  const scrollToBottom = () => {
    const el = chatContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    setShowScrollButton(false);
  };

  const onNewConversation = async () => {
    setActiveConversationId(null);
    // Don't clear pre-selected documents here - let user keep their selection
  };

  const onSelectConversation = (convId) => {
    setActiveConversationId(convId);
  };

  const onDeleteConversation = async (convId) => {
    await deleteConversation(convId);
    setConversations((prev) => prev.filter((c) => c.conv_id !== convId));
    if (activeConversationId === convId) {
      const remaining = conversations.filter((c) => c.conv_id !== convId);
      setActiveConversationId(remaining.length ? remaining[0].conv_id : null);
    }
  };

  const handleSendMessage = async (content) => {
    let convId = activeConversationId;
    let newConv = null;
    if (!convId) {
      newConv = await createConversation(content);
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(newConv.conv_id);
      convId = newConv.conv_id;
      
      // If there are pre-selected documents, apply them to the new conversation
      if (preSelectedDocuments.length > 0) {
        try {
          await selectDocumentsForConversation(convId, preSelectedDocuments);
          setPreSelectedDocuments([]); // Clear pre-selection after using
        } catch (error) {
          console.error('Failed to apply pre-selected documents:', error);
        }
      }
    }
    // Optimistically add user message
    const userMsg = {
      id: Date.now(),
      content,
      role: "user",
      timestamp: new Date().toISOString(),
    };
    setConversations((prev) =>
      prev.map((c) =>
        c.conv_id === convId
          ? {
              ...c,
              messages: [...(c.messages || []), userMsg],
              preview: content,
              timestamp: new Date(),
            }
          : c
      )
    );
    setIsLoading(true);
    try {
      const aiMsg = await askQuestion({ question: content, convId });
      setConversations((prev) =>
        prev.map((c) =>
          c.conv_id === convId
            ? {
                ...c,
                messages: [...(c.messages || []), aiMsg],
                preview: aiMsg.content,
                timestamp: new Date(),
              }
            : c
        )
      );
    } catch (err) {
      // Silent error handling - user will see no response
    }
    setIsLoading(false);
  };
  
  return (
    <PageLayout>
      <Sidebar>
        <ConversationList
          conversations={conversations}
          activeConversationId={activeConversationId}
          onNewConversation={onNewConversation}
          onSelectConversation={onSelectConversation}
          onDeleteConversation={onDeleteConversation}
        />
      </Sidebar>
      <ChatArea
        header={
          <header className="p-6 border-b border-white/10 bg-gradient-to-r from-white/5 to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <h1 className="font-bold text-2xl text-white drop-shadow-lg mb-1">
                  {activeConversation?.title || "Start a conversation"}
                </h1>
                <p className="text-sm text-white/60">
                  AI-powered documentation assistant
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowDocumentSelection(true)}
                  className="glass-button flex items-center gap-2 px-4 py-2 text-sm rounded-xl font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                  Select Sources
                  {!activeConversationId && preSelectedDocuments.length > 0 && (
                    <span className="ml-1 px-2 py-0.5 text-xs bg-white/20 text-white rounded-full animate-pulse">
                      {preSelectedDocuments.length}
                    </span>
                  )}
                </button>
                <DocumentUploadButton />
              </div>
            </div>
          </header>
        }
        input={null}
      >
        <ChatWindow
          messages={activeConversation?.messages || []}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          chatContainerRef={chatContainerRef}
          onScroll={onScroll}
          showScrollButton={showScrollButton}
          scrollToBottom={scrollToBottom}
        />
      </ChatArea>
      
      {showDocumentSelection && (
        <DocumentSelection 
          conversationId={activeConversationId}
          initialSelectedDocIds={!activeConversationId ? preSelectedDocuments : []}
          onClose={() => setShowDocumentSelection(false)}
          onDocumentsSelected={(selectedDocIds) => {
            if (!activeConversationId) {
              // Store for pre-selection if no active conversation
              setPreSelectedDocuments(selectedDocIds);
            }
          }}
        />
      )}
    </PageLayout>
  );
}

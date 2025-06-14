import React, { useState, useEffect, useRef } from "react";
import ConversationList from "./ConversationList";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";

const ChatWindow = () => {
  const [conversations, setConversations] = useState([
    {
      id: "1",
      title: "Understanding GPT Models",
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      preview: "Can you explain the differences between GPT-3 and GPT-4?",
      messages: [
        {
          id: "m1",
          role: "assistant",
          content: "GPT-4 is the newest model with better capabilities.",
          timestamp: new Date(Date.now() - 1000 * 60 * 29),
        },
      ],
    },
  ]);
  const [activeConversationId, setActiveConversationId] = useState("1");
  const [isLoading, setIsLoading] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const chatContainerRef = useRef(null);

  const activeConversation = conversations.find(
    (c) => c.id === activeConversationId
  );

  // Scroll to bottom on new messages
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      setShowScrollButton(false);
    }
  }, [activeConversation?.messages]);

  // Show scroll-to-bottom button if user scrolls up
  const onScroll = () => {
    const el = chatContainerRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    setShowScrollButton(!nearBottom);
  };

  const scrollToBottom = () => {
    const el = chatContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    setShowScrollButton(false);
  };

  // New conversation creation
  const onNewConversation = () => {
    const newConv = {
      id: Date.now().toString(),
      title: "New conversation",
      timestamp: new Date(),
      preview: "",
      messages: [],
    };
    setConversations([newConv, ...conversations]);
    setActiveConversationId(newConv.id);
  };

  // Select conversation by id
  const onSelectConversation = (id) => {
    setActiveConversationId(id);
  };

  // Delete conversation by id
  const onDeleteConversation = (id) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConversationId === id) {
      setActiveConversationId(conversations.length ? conversations[0].id : "");
    }
  };

  // Sending message logic
  const handleSendMessage = (content) => {
    if (!activeConversationId) return;
    const newMessage = {
      id: `user-${Date.now()}`,
      content,
      role: "user",
      timestamp: new Date(),
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversationId
          ? {
              ...c,
              messages: [...c.messages, newMessage],
              preview: content,
              timestamp: new Date(),
            }
          : c
      )
    );

    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const aiMessage = {
        id: `ai-${Date.now()}`,
        content: `AI response to "${content.substring(0, 30)}${
          content.length > 30 ? "..." : ""
        }"`,
        role: "assistant",
        timestamp: new Date(),
      };
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId
            ? {
                ...c,
                messages: [...c.messages, aiMessage],
                preview: aiMessage.content,
                timestamp: new Date(),
              }
            : c
        )
      );
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="flex h-full border rounded overflow-hidden">
      <ConversationList
        conversations={conversations}
        activeConversationId={activeConversationId}
        onNewConversation={onNewConversation}
        onSelectConversation={onSelectConversation}
        onDeleteConversation={onDeleteConversation}
      />
      <div className="flex flex-col flex-1 bg-white">
        {/* Fixed header */}
        <header className="border-b p-4 font-semibold text-lg sticky top-0 bg-white z-10">
          {activeConversation?.title || "Select a conversation"}
        </header>

        {/* Chat container with scroll listener */}
        <div
          ref={chatContainerRef}
          onScroll={onScroll}
          className="flex flex-col overflow-y-auto p-4 flex-1"
          style={{ height: "calc(100vh - 160px)" }}
        >
          <MessageList messages={activeConversation?.messages || []} />
          {isLoading && (
            <div className="text-center text-gray-500 italic mt-2">AI is typing...</div>
          )}
        </div>

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-20 right-6 bg-blue-600 text-white rounded-full p-2 shadow-lg hover:bg-blue-700 transition"
            aria-label="Scroll to bottom"
          >
            ↓
          </button>
        )}

        <MessageInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default ChatWindow;



// components/chat/ChatWindow.jsx
import React from "react";
import MessageList from "../chat/MessageList";
import InputBox from "./InputBox";
import { ChevronDownIcon } from "lucide-react";

export default function ChatWindow({ messages, onSendMessage, isLoading, chatContainerRef, onScroll, showScrollButton, scrollToBottom }) {
  return (
    <div className="flex flex-col relative h-full w-full overflow-hidden">
      <div
        ref={chatContainerRef}
        onScroll={onScroll}
        className="flex flex-col overflow-y-auto overflow-x-hidden px-6 py-4 flex-1 space-y-4 custom-scrollbar"
        style={{ minHeight: 0 }}
      >
        <MessageList messages={messages} />
        {isLoading && (
          <div className="text-center animate-fade-in">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-md border border-white/20 shadow-lg">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <span className="text-white/80 text-sm font-medium">AI is thinking...</span>
            </div>
          </div>
        )}
      </div>
      
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="glass-button p-3 rounded-full shadow-lg hover:scale-110 transition-all duration-300 animate-fade-in absolute bottom-32 right-6 z-10"
          aria-label="Scroll to bottom"
        >
          <ChevronDownIcon className="h-5 w-5" />
        </button>
      )}
      
      <InputBox onSendMessage={onSendMessage} isLoading={isLoading} />
    </div>
  );
}

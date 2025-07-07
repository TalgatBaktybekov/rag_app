// components/chat/ConversationList.jsx
import React, { useState } from "react";
import { PlusIcon, TrashIcon, MessageSquareIcon, LogOutIcon } from "lucide-react";
import { logoutUser } from "../../services/api";
import "../../theme.css";

export default function ConversationList({
  conversations = [],
  activeConversationId = "",
  onNewConversation = () => {},
  onSelectConversation = () => {},
  onDeleteConversation = () => {},
}) {
  const [confirmingId, setConfirmingId] = useState(null);

  const handleDelete = (id) => {
    if (confirmingId === id) {
      onDeleteConversation(id);
      setConfirmingId(null);
    } else {
      setConfirmingId(id);
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffHrs = (now - date) / (1000 * 60 * 60);
    if (diffHrs < 24) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (diffHrs < 48) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header with New Chat Button */}
      <div className="p-6 border-b border-white/10 bg-gradient-to-b from-white/5 to-transparent">
        <button
          className="glass-button w-full flex items-center justify-center gap-3 py-4 px-4 font-semibold transition-all duration-300 hover:shadow-lg hover:scale-[1.02] interactive"
          onClick={onNewConversation}
          style={{ borderRadius: 'var(--radius-xl)' }}
        >
          <PlusIcon size={18} />
          New Conversation
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {conversations.length === 0 ? (
          <div className="text-center mt-20 flex flex-col items-center gap-6 animate-fade-in">
            <div className="p-8 rounded-full bg-gradient-to-br from-white/10 to-white/5 border border-white/10 shadow-lg">
              <MessageSquareIcon className="text-blue-400" size={36} />
            </div>
            <div>
              <p className="font-semibold text-white/90 mb-2 text-lg">No conversations yet</p>
              <p className="text-sm text-white/60 max-w-xs">Start a new chat to begin your AI-powered conversation</p>
            </div>
          </div>
        ) : (
          conversations.map((conv, index) => (
            <div
              key={conv.conv_id}
              onClick={() => onSelectConversation(conv.conv_id)}
              className={`group p-5 rounded-2xl cursor-pointer border transition-all duration-300 animate-fade-in interactive ${
                activeConversationId === conv.conv_id 
                  ? "bg-gradient-to-br from-white/15 to-white/8 border-blue-400/50 shadow-lg ring-1 ring-blue-400/20" 
                  : "bg-gradient-to-br from-white/8 to-white/4 border-white/10 hover:from-white/12 hover:to-white/6 hover:border-white/20 hover:shadow-md"
              }`}
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-white/90 truncate flex-1 mr-3 group-hover:text-white transition-colors text-base">
                  {conv.title}
                </h3>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-white/50 font-mono">
                    {formatDate(conv.timestamp)}
                  </span>
                  <button
                    className="text-white/40 hover:text-red-400 transition-all duration-200 p-1.5 rounded-lg hover:bg-red-500/10 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(conv.conv_id);
                    }}
                  >
                    <TrashIcon size={14} />
                  </button>
                </div>
              </div>
              <p className="text-sm text-white/60 truncate group-hover:text-white/70 transition-colors leading-relaxed">
                {conv.preview}
              </p>
              
              {confirmingId === conv.conv_id && (
                <div className="text-sm mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 animate-slide-in-up backdrop-blur-sm">
                  <p className="text-red-300 mb-3 font-medium">Delete this conversation?</p>
                  <div className="flex gap-3">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(conv.conv_id);
                      }} 
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-medium transition-all duration-200 hover:shadow-md interactive"
                    >
                      Delete
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmingId(null);
                      }} 
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white/80 rounded-lg text-xs font-medium transition-all duration-200 interactive"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Logout Button at Bottom */}
      <div className="p-4 border-t border-white/10 bg-gradient-to-t from-white/5 to-transparent mt-auto">
        <button
          onClick={logoutUser}
          className="logout-button glass-button w-full flex items-center justify-center gap-3 py-3 px-4 font-medium transition-all duration-300 hover:shadow-lg hover:scale-[1.02] interactive"
          style={{ 
            borderRadius: 'var(--radius-lg)'
          }}
        >
          <LogOutIcon size={16} />
          Logout
        </button>
      </div>
    </div>
  );
}

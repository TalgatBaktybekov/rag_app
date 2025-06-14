// components/ConversationList.jsx
import React, { useState } from "react";
import { PlusIcon, TrashIcon, MessageSquareIcon } from "lucide-react";

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
    <div className="w-full max-w-xs h-full bg-gray-100 border-r flex flex-col">
      <div className="p-3 border-b">
        <button
          className="w-full bg-blue-600 text-white px-3 py-2 rounded flex items-center justify-center gap-2"
          onClick={onNewConversation}
        >
          <PlusIcon size={16} />
          New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {conversations.length === 0 ? (
          <div className="text-center text-gray-500 mt-10 flex flex-col items-center gap-2">
            <MessageSquareIcon />
            <p>No conversations yet</p>
            <p className="text-sm">Start a new chat to begin</p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`p-3 rounded cursor-pointer hover:bg-gray-200 ${
                  activeConversationId === conv.id ? "bg-gray-300" : "bg-white"
                }`}
              >
                <div className="flex justify-between items-start">
                  <h3 className="font-medium truncate">{conv.title}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{formatDate(conv.timestamp)}</span>
                    <button
                      className="text-gray-500 hover:text-red-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(conv.id);
                      }}
                    >
                      <TrashIcon size={16} />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 truncate mt-1">{conv.preview}</p>
                {confirmingId === conv.id && (
                  <div className="text-sm text-red-600 mt-2 flex gap-3">
                    Confirm delete?
                    <button onClick={() => handleDelete(conv.id)} className="underline">
                      Yes
                    </button>
                    <button onClick={() => setConfirmingId(null)} className="underline">
                      No
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

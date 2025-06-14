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
    // Enhanced visual version

    <div className="w-full max-w-xs h-full bg-gradient-to-b from-gray-50 to-gray-200 border-r border-gray-300 shadow-md flex flex-col rounded-r-lg">
    <div className="p-4 border-b border-gray-300">
        <button
        className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow"
        onClick={onNewConversation}
        >
        <PlusIcon size={16} />
        New Chat
        </button>
    </div>

    <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {conversations.length === 0 ? (
        <div className="text-center text-gray-500 mt-20 flex flex-col items-center gap-2">
            <MessageSquareIcon className="text-blue-400" size={28} />
            <p className="font-medium text-gray-600">No conversations yet</p>
            <p className="text-sm text-gray-500">Start a new chat to begin</p>
        </div>
        ) : (
        conversations.map((conv) => (
            <div
            key={conv.id}
            onClick={() => onSelectConversation(conv.id)}
            className={`p-4 rounded-xl cursor-pointer border transition-all shadow-sm hover:shadow-md hover:bg-gray-100 ${
                activeConversationId === conv.id ? "bg-white border-blue-400" : "bg-gray-50 border-transparent"
            }`}
            >
            <div className="flex justify-between items-start">
                <h3 className="font-semibold text-gray-800 truncate">{conv.title}</h3>
                <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{formatDate(conv.timestamp)}</span>
                <button
                    className="text-gray-400 hover:text-red-600"
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
                <div className="text-sm text-red-600 mt-2 flex gap-4 items-center">
                Confirm delete?
                <button onClick={() => handleDelete(conv.id)} className="underline font-medium">
                    Yes
                </button>
                <button onClick={() => setConfirmingId(null)} className="underline font-medium text-gray-500">
                    No
                </button>
                </div>
            )}
            </div>
        ))
        )}
    </div>
    </div>
  );
}

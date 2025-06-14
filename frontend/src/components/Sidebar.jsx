// Sidebar.jsx
import React from "react";
import ConversationList from "./ConversationList";

export default function Sidebar({
  conversations,
  activeConversationId,
  onNewConversation,
  onSelectConversation,
  onDeleteConversation,
}) {
  return (
    <aside className="w-72 h-screen border-r bg-gray-50 flex flex-col">
      <ConversationList
        conversations={conversations}
        activeConversationId={activeConversationId}
        onNewConversation={onNewConversation}
        onSelectConversation={onSelectConversation}
        onDeleteConversation={onDeleteConversation}
      />
    </aside>
  );
}

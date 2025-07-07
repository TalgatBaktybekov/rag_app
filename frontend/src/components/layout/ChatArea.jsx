// components/layout/ChatArea.jsx
import "../../theme.css";

// Main chat area (header, messages, input)
export default function ChatArea({ header, children, input }) {
  return (
    <main 
      className="flex flex-col flex-1 h-full relative overflow-hidden animate-fade-in"
      style={{ 
        background: 'var(--gradient-chat)',
        backdropFilter: 'var(--backdrop-blur)',
        WebkitBackdropFilter: 'var(--backdrop-blur)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-2xl)',
        boxShadow: 'var(--shadow-xl)',
        transition: 'var(--transition-smooth)'
      }}
    >
      {header}
      <div className="flex-1 flex flex-col overflow-hidden">{children}</div>
      {input}
    </main>
  );
}

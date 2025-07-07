// components/layout/Sidebar.jsx
import "../../theme.css";

export default function Sidebar({ children }) {
  return (
    <aside 
      className="flex flex-col z-20 overflow-hidden animate-slide-in-left"
      style={{
        width: '320px',
        height: '100%',
        background: 'var(--gradient-sidebar)',
        backdropFilter: 'var(--backdrop-blur)',
        WebkitBackdropFilter: 'var(--backdrop-blur)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-2xl)',
        boxShadow: 'var(--shadow-2xl)',
        transition: 'var(--transition-smooth)'
      }}
    >
      {children}
    </aside>
  );
}

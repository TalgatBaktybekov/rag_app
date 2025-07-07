// components/layout/PageLayout.jsx
import "../../theme.css";

// App-wide layout wrapper with enhanced spacing and flow
export default function PageLayout({ children }) {
  return (
    <div 
      className="min-h-screen w-screen flex overflow-hidden"
      style={{ 
        height: '100vh', 
        width: '100vw',
        background: 'var(--gradient-main)',
        padding: 'var(--spacing-4)',
        gap: 'var(--spacing-4)'
      }}
    >
      {children}
    </div>
  );
}

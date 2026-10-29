import React from 'react';
import type { CourseView } from './CourseSidebar';

interface CourseHeaderProps {
  query: string;
  percentDone: number;
  onQueryChange: (query: string) => void;
  onOpenSidebar: () => void;
  onNavigate: (view: CourseView) => void;
}

export const CourseHeader: React.FC<CourseHeaderProps> = ({
  query,
  percentDone,
  onQueryChange,
  onOpenSidebar,
  onNavigate,
}) => (
  <header className="topbar">
    <button
      className="circle-btn mobile-menu"
      id="openSidebar"
      aria-label="Otwórz menu"
      onClick={onOpenSidebar}
      type="button"
    >
      ☰
    </button>
    <div className="topsearch">
      <span>⌕</span>
      <input
        id="globalSearch"
        placeholder="Szukaj: klucz prywatny, hash, MFA..."
        aria-label="Szukaj tematów i pojęć"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onQueryChange('');
        }}
      />
    </div>
    <div className="topright">
      <span className="status-chip" id="topStatus">
        {percentDone === 100
          ? 'Cały materiał ukończony! 🏆'
          : `${percentDone}% materiału za Tobą`}
      </span>
      <button
        className="circle-btn"
        id="goHome"
        title="Pulpit"
        onClick={() => onNavigate('home')}
        type="button"
      >
        ✦
      </button>
    </div>
  </header>
);
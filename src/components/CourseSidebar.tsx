import React from 'react';
import { LESSONS } from '../data/courseData';

export type CourseView =
  | 'home'
  | 'lessons'
  | 'lesson'
  | 'flash'
  | 'glossary'
  | 'exam'
  | 'exam-active'
  | 'exam-done'
  | 'search';

interface CourseSidebarProps {
  open: boolean;
  view: CourseView;
  lessonId: string | null;
  doneLessonIds: string[];
  syncStatus: string;
  onClose: () => void;
  onNavigate: (view: CourseView, lessonId?: string) => void;
  onOpenStudentPortal: () => void;
  onOpenProfile: () => void;
  onExportProgress: () => void;
}

const tracks = [
  { id: 1, title: 'Wykład 1 · Podstawy' },
  { id: 2, title: 'Wykład 2 · Kryptografia' },
  { id: 3, title: 'Wykład 3 · Aktorzy zagrożeń' },
  { id: 4, title: 'Wykład 4 · Malware i ataki' },
];

export const CourseSidebar: React.FC<CourseSidebarProps> = ({
  open,
  view,
  lessonId,
  doneLessonIds,
  syncStatus,
  onClose,
  onNavigate,
  onOpenStudentPortal,
  onOpenProfile,
  onExportProgress,
}) => (
  <>
    <div
      className={`overlay ${open ? 'show' : ''}`}
      id="overlay"
      onClick={onClose}
    />
    <aside className={`sidebar ${open ? 'open' : ''}`} id="sidebar">
      <div className="logo">
        <div className="logo-mark">✦</div>
        <div>
          <strong>Od zera do hakera</strong>
          <small>Twoja strefa nauki</small>
        </div>
      </div>

      <button className="menu-btn" onClick={onOpenStudentPortal} type="button">
        ← Moje przedmioty
      </button>
      <button className="menu-btn" onClick={onOpenProfile} type="button">
        👤 Mój profil
      </button>

      <div className="nav-title">Przestrzeń nauki</div>
      <button
        className={`menu-btn ${view === 'home' ? 'active' : ''}`}
        onClick={() => onNavigate('home')}
        type="button"
      >
        <span className="menu-icon">⌂</span> Pulpit
      </button>
      <button
        className={`menu-btn ${view === 'lessons' || view === 'lesson' ? 'active' : ''}`}
        onClick={() => onNavigate('lessons')}
        type="button"
      >
        <span className="menu-icon">📚</span> Lekcje{' '}
        <span className="count">{LESSONS.length}</span>
      </button>
      <button
        className={`menu-btn ${view === 'flash' ? 'active' : ''}`}
        onClick={() => onNavigate('flash')}
        type="button"
      >
        <span className="menu-icon">🃏</span> Fiszki
      </button>
      <button
        className={`menu-btn ${view === 'exam' || view === 'exam-active' || view === 'exam-done' ? 'active' : ''}`}
        onClick={() => onNavigate('exam')}
        type="button"
      >
        <span className="menu-icon">📝</span> Testy
      </button>
      <button
        className={`menu-btn ${view === 'glossary' ? 'active' : ''}`}
        onClick={() => onNavigate('glossary')}
        type="button"
      >
        <span className="menu-icon">📖</span> Słownik
      </button>

      {tracks.map((track) => (
        <React.Fragment key={track.id}>
          <div className="nav-title">{track.title}</div>
          <div>
            {LESSONS.filter((lesson) => lesson.track === track.id).map((lesson) => {
              const isCurrent = lessonId === lesson.id && view === 'lesson';
              const isDone = doneLessonIds.includes(lesson.id);
              return (
                <button
                  key={lesson.id}
                  className={`lesson-nav ${isCurrent ? 'active' : ''} ${isDone ? 'done' : ''}`}
                  onClick={() => onNavigate('lesson', lesson.id)}
                  type="button"
                >
                  <span className="mini-ico">{lesson.icon}</span>
                  <span>{lesson.title}</span>
                </button>
              );
            })}
          </div>
        </React.Fragment>
      ))}

      <div className="sidebar-footer">
        <span id="syncStatus" role="status">{syncStatus}</span>
        <br />
        <button id="exportProgress" onClick={onExportProgress} type="button">
          ↓ Eksportuj postępy
        </button>
      </div>
    </aside>
  </>
);
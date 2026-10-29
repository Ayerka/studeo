import React from 'react';
import type { User } from '@supabase/supabase-js';
import type { AccountPlan } from '../../types';

export type StudentView =
  | 'home'
  | 'subjects'
  | 'reviews'
  | 'tasks'
  | 'calendar'
  | 'notes'
  | 'archive'
  | 'plan'
  | 'subject'
  | 'entry'
  | 'course-lesson'
  | 'edit';

interface StudentPortalShellProps {
  user: User;
  plan: AccountPlan;
  view: StudentView;
  status: string;
  onNavigate: (view: StudentView) => void;
  onRefresh: () => void;
  onOpenProfile: () => void;
  onLogout: () => void;
  children: React.ReactNode;
}

const navigation: { id: StudentView; label: string }[] = [
  { id: 'home', label: '⌂ Pulpit' },
  { id: 'subjects', label: '▤ Przedmioty' },
  { id: 'reviews', label: '◇ Powtórki' },
  { id: 'tasks', label: '☑ Do zrobienia' },
  { id: 'calendar', label: '▦ Kalendarz' },
  { id: 'notes', label: '▤ Notatki' },
  { id: 'archive', label: 'Archiwum' },
];

export const StudentPortalShell: React.FC<StudentPortalShellProps> = ({
  user,
  plan,
  view,
  status,
  onNavigate,
  onRefresh,
  onOpenProfile,
  onLogout,
  children,
}) => (
  <section id="studentApp" className="student-shell-root">
    <div className="student-shell">
      <header className="student-head">
        <button className="student-brand" onClick={() => onNavigate('home')} type="button">
          ✦ Studeo <span className="student-pill">BETA</span>
          <small>{user.email || 'Twoja prywatna przestrzeń nauki'}</small>
        </button>
        <div className="student-actions">
          <button className="student-quiet" onClick={onRefresh} type="button">Odśwież</button>
          <button className="student-premium" onClick={() => onNavigate('plan')} type="button">
            {plan.key === 'unknown' ? 'Plan niedostępny' : plan.key === 'free' ? 'Basic · zobacz Premium' : '✦ Masz Premium'}
          </button>
          <button className="student-quiet" onClick={onOpenProfile} type="button">Profil</button>
          <button className="student-quiet" onClick={onLogout} type="button">Wyloguj</button>
        </div>
      </header>
      <nav className="student-nav" aria-label="Nawigacja przestrzeni studenta">
        {navigation.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-current={view === item.id || (view === 'subject' && item.id === 'subjects') ? 'page' : undefined}
            onClick={() => onNavigate(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <p className="student-status" role="status">{status}</p>
      <main>{children}</main>
    </div>
  </section>
);
import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { StudentView } from '../types';

const ROUTES: Record<Exclude<StudentView, 'subject' | 'entry' | 'edit' | 'course-lesson'>, string> = {
  home: '/student',
  subjects: '/student/subjects',
  library: '/student/library',
  courses: '/student/courses',
  reviews: '/student/reviews',
  tasks: '/student/tasks',
  calendar: '/student/calendar',
  notes: '/student/notes',
  archive: '/student/archive',
  plan: '/student/plan',
};

export function studentViewFromPath(pathname: string): StudentView {
  if (pathname.startsWith('/student/subject/')) return 'subject';
  if (pathname.startsWith('/student/entry/')) return 'entry';
  if (pathname === '/student/edit') return 'edit';

  for (const [view, route] of Object.entries(ROUTES) as [StudentView, string][]) {
    if (route === pathname) return view;
  }
  return 'home';
}

export function useStudentNavigation() {
  const location = useLocation();
  const navigate = useNavigate();

  const view = useMemo(
    () => studentViewFromPath(location.pathname),
    [location.pathname],
  );

  const setView = (nextView: StudentView) => {
    const route = ROUTES[nextView as keyof typeof ROUTES];
    if (route) navigate(route);
  };

  const openSubject = (subjectId: string) => {
    navigate(`/student/subject/${encodeURIComponent(subjectId)}`);
  };

  const openEntry = (entryId: string) => {
    navigate(`/student/entry/${encodeURIComponent(entryId)}`);
  };

  const openEditor = () => {
    navigate('/student/edit');
  };

  const subjectId = useMemo(() => {
    const match = location.pathname.match(/^\/student\/subject\/([^/?]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  }, [location.pathname]);

  const entryId = useMemo(() => {
    const match = location.pathname.match(/^\/student\/entry\/([^/?]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  }, [location.pathname]);

  return { setView, openSubject, openEntry, openEditor, subjectId, entryId, view };
}

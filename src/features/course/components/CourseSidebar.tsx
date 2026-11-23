// src/components/CourseSidebar.tsx
import React from 'react';
import { LESSONS } from '../../../data/courseData';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  HomeIcon,
  BookOpenIcon,
  LayersIcon,
  FileTextIcon,
  BookMarkedIcon,
  ArrowLeftIcon,
  UserIcon,
  DownloadIcon,
  CheckIcon,
} from 'lucide-react';

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
    {open && (
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
        onClick={onClose}
      />
    )}
    <aside
      className={`fixed inset-y-0 left-0 z-50 w-72 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col p-4 shrink-0 transition-transform md:static md:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="flex items-center gap-3 px-2 py-3 border-b border-sidebar-border mb-3">
        <div className="size-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
          ✦
        </div>
        <div>
          <h2 className="font-semibold text-sm leading-tight text-white">Od zera do hakera</h2>
          <p className="text-xs text-sidebar-foreground/70">Twoja strefa nauki</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 justify-start gap-1.5 text-xs bg-sidebar-border/30 border-sidebar-border text-sidebar-foreground hover:bg-sidebar-border/60"
          onClick={onOpenStudentPortal}
        >
          <ArrowLeftIcon className="size-3.5" /> Przedmioty
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 justify-start gap-1.5 text-xs bg-sidebar-border/30 border-sidebar-border text-sidebar-foreground hover:bg-sidebar-border/60"
          onClick={onOpenProfile}
        >
          <UserIcon className="size-3.5" /> Profil
        </Button>
      </div>

      <nav className="space-y-1 flex-1 overflow-y-auto pr-1">
        <div className="text-[11px] font-bold uppercase tracking-wider text-sidebar-foreground/50 px-2 py-1">
          Przestrzeń nauki
        </div>
        <Button
          variant={view === 'home' ? 'secondary' : 'ghost'}
          size="sm"
          className="w-full justify-start gap-2"
          onClick={() => onNavigate('home')}
        >
          <HomeIcon className="size-4" /> Pulpit
        </Button>
        <Button
          variant={view === 'lessons' || view === 'lesson' ? 'secondary' : 'ghost'}
          size="sm"
          className="w-full justify-between"
          onClick={() => onNavigate('lessons')}
        >
          <span className="flex items-center gap-2">
            <BookOpenIcon className="size-4" /> Lekcje
          </span>
          <Badge variant="outline" className="text-xs">
            {LESSONS.length}
          </Badge>
        </Button>
        <Button
          variant={view === 'flash' ? 'secondary' : 'ghost'}
          size="sm"
          className="w-full justify-start gap-2"
          onClick={() => onNavigate('flash')}
        >
          <LayersIcon className="size-4" /> Fiszki
        </Button>
        <Button
          variant={view === 'exam' || view === 'exam-active' || view === 'exam-done' ? 'secondary' : 'ghost'}
          size="sm"
          className="w-full justify-start gap-2"
          onClick={() => onNavigate('exam')}
        >
          <FileTextIcon className="size-4" /> Testy
        </Button>
        <Button
          variant={view === 'glossary' ? 'secondary' : 'ghost'}
          size="sm"
          className="w-full justify-start gap-2"
          onClick={() => onNavigate('glossary')}
        >
          <BookMarkedIcon className="size-4" /> Słownik
        </Button>

        {tracks.map((track) => (
          <React.Fragment key={track.id}>
            <div className="text-[11px] font-bold uppercase tracking-wider text-sidebar-foreground/50 px-2 pt-4 pb-1">
              {track.title}
            </div>
            {LESSONS.filter((l) => l.track === track.id).map((lesson) => {
              const isCurrent = lessonId === lesson.id && view === 'lesson';
              const isDone = doneLessonIds.includes(lesson.id);
              return (
                <button
                  key={lesson.id}
                  type="button"
                  onClick={() => onNavigate('lesson', lesson.id)}
                  className={`w-full flex items-center justify-between text-left text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                    isCurrent
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-border/40 hover:text-white'
                  }`}
                >
                  <span className="truncate pr-2">
                    {lesson.icon} {lesson.title}
                  </span>
                  {isDone && <CheckIcon className="size-3.5 text-emerald-400 shrink-0" />}
                </button>
              );
            })}
          </React.Fragment>
        ))}
      </nav>

      <div className="pt-3 border-t border-sidebar-border text-xs text-sidebar-foreground/60 space-y-2">
        <div className="truncate">{syncStatus}</div>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-center gap-1.5 text-xs bg-sidebar-border/20 border-sidebar-border text-sidebar-foreground hover:bg-sidebar-border/50"
          onClick={onExportProgress}
        >
          <DownloadIcon className="size-3.5" /> Eksportuj postępy
        </Button>
      </div>
    </aside>
  </>
);
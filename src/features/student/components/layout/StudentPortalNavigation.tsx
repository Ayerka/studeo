import { Button } from '@/components/ui/button';

import {
  Home,
  BookOpen,
  Layers,
  CheckSquare,
  Calendar,
  FileText,
  Archive,
  Library,
} from 'lucide-react';

import type { StudentView } from '../../types';

interface StudentPortalNavigationProps {
  view: StudentView;
  onNavigate: (view: StudentView) => void;
}

const navigation: {
  id: StudentView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'home', label: 'Pulpit', icon: Home },
  { id: 'subjects', label: 'Przedmioty', icon: BookOpen },
  { id: 'library', label: 'Biblioteka kursów', icon: Library },
  { id: 'courses', label: 'Dostępne kursy', icon: Library },
  { id: 'reviews', label: 'Powtórki', icon: Layers },
  { id: 'tasks', label: 'Do zrobienia', icon: CheckSquare },
  { id: 'calendar', label: 'Kalendarz', icon: Calendar },
  { id: 'notes', label: 'Notatki', icon: FileText },
  { id: 'archive', label: 'Archiwum', icon: Archive },
];

export const StudentPortalNavigation = ({
  view,
  onNavigate,
}: StudentPortalNavigationProps) => {
  return (
    <nav
      className="border-b bg-muted/30"
      aria-label="Nawigacja główna"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center gap-1 py-2 overflow-x-auto">

        {navigation.map((item) => {
          const Icon = item.icon;

          const isActive =
            view === item.id ||
            (view === 'subject' && item.id === 'subjects');

          return (
            <Button
              key={item.id}
              variant={isActive ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onNavigate(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`gap-2 text-xs font-medium shrink-0 h-8 ${
                isActive
                  ? 'bg-primary/10 text-primary hover:bg-primary/15 font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="size-3.5" />
              {item.label}
            </Button>
          );
        })}

      </div>
    </nav>
  );
};
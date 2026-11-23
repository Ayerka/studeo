import React from 'react';
import type { CourseView } from './CourseSidebar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Menu, Search, Home } from 'lucide-react';

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
  <header className="h-16 border-b bg-background/95 backdrop-blur-sm sticky top-0 z-30 flex items-center justify-between gap-4 px-4 sm:px-6 mb-6">
    <div className="flex items-center gap-3 flex-1 max-w-md">
      <Button
        variant="ghost"
        size="icon-sm"
        className="md:hidden shrink-0"
        aria-label="Otwórz menu"
        onClick={onOpenSidebar}
      >
        <Menu className="size-5" />
      </Button>

      <div className="relative w-full">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Szukaj: klucz prywatny, hash, MFA…"
          aria-label="Szukaj tematów i pojęć"
          value={query}
          className="pl-9 h-9 text-xs sm:text-sm bg-muted/40 border-muted-foreground/20"
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onQueryChange('');
          }}
        />
      </div>
    </div>

    <div className="flex items-center gap-3">
      <Badge variant="secondary" className="hidden sm:inline-flex text-xs px-2.5 py-1">
        {percentDone === 100 ? 'Ukończono 100%! 🏆' : `${percentDone}% materiału za Tobą`}
      </Badge>

      <Button
        variant="outline"
        size="icon-sm"
        title="Pulpit kursu"
        onClick={() => onNavigate('home')}
      >
        <Home className="size-4" />
      </Button>
    </div>
  </header>
);
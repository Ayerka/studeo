import React from 'react';
import type { Lesson } from '../../../types';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Check } from 'lucide-react';

interface LessonCardProps {
  lesson: Lesson;
  completed: boolean;
  onOpen: (lessonId: string) => void;
}

export const LessonCard: React.FC<LessonCardProps> = ({ lesson, completed, onOpen }) => (
  <Card
    className={`cursor-pointer transition-all hover:-translate-y-1 hover:shadow-md ${
      completed ? 'border-emerald-500/30 bg-emerald-500/5' : 'hover:border-primary/40'
    }`}
    onClick={() => onOpen(lesson.id)}
  >
    <CardHeader className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xl">
          {lesson.icon}
        </span>
        <Badge variant={completed ? 'secondary' : 'outline'} className={completed ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : ''}>
          {completed ? (
            <span className="flex items-center gap-1 font-semibold">
              <Check className="size-3" /> Ukończona
            </span>
          ) : (
            'Do nauki'
          )}
        </Badge>
      </div>

      <div>
        <CardTitle className="text-base font-bold leading-snug">{lesson.title}</CardTitle>
        <CardDescription className="text-xs line-clamp-2 mt-1">{lesson.subtitle}</CardDescription>
      </div>

      <div className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground font-medium">
        <span className="uppercase tracking-wider text-[10px]">Wykład {lesson.track}</span>
        <span className="text-primary flex items-center gap-1 hover:underline">
          Otwórz <ArrowRight className="size-3" />
        </span>
      </div>
    </CardHeader>
  </Card>
);
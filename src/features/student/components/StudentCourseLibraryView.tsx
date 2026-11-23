import React, { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { coursePlan } from '../lib/subject-course';
import type { ProgressState, StudentEntry, StudentSubject } from '@/types';
import { BookOpen, Search } from 'lucide-react';

interface StudentCourseLibraryViewProps {
  subjects: StudentSubject[];
  entries: StudentEntry[];
  builtinProgress: ProgressState;
  onOpenBuiltinCourse: () => void;
  onOpenSubject: (subjectId: string) => void;
  onBrowseCourses: () => void;
}

type CourseFilter = 'all' | 'system' | 'public' | 'private';

export const StudentCourseLibraryView: React.FC<StudentCourseLibraryViewProps> = ({
  subjects,
  entries,
  builtinProgress,
  onOpenBuiltinCourse,
  onOpenSubject,
  onBrowseCourses,
}) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<CourseFilter>('all');

  const cards = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('pl-PL');

    const subjectCards = subjects
      .filter((subject) => !subject.archived)
      .map((subject) => {
        const subjectEntries = entries.filter((entry) => entry.subject_id === subject.id);
        const publicEntry = subjectEntries.find((entry) => entry.payload.publicCourseSlug);
        const plan = coursePlan(entries, subject.id);
        const lessons = plan.current.flatMap(({ deck }) => deck.payload.sections || []);
        const completed = plan.current.reduce(
          (total, { deck }) => total + Object.keys(deck.payload.lessonDone || {}).length,
          0,
        );

        return {
          id: subject.id,
          title: subject.title,
          type: publicEntry ? ('public' as const) : ('private' as const),
          description: publicEntry
            ? 'Dodany publiczny kurs'
            : 'Kurs stworzony z Twoich materiałów',
          lessonCount: lessons.length,
          progress: lessons.length ? Math.round((completed / lessons.length) * 100) : 0,
          pending: plan.pending.length,
          onOpen: () => onOpenSubject(subject.id),
        };
      })
      .filter((course) =>
        !needle || `${course.title} ${course.description}`.toLocaleLowerCase('pl-PL').includes(needle)
      );

    const systemCard = {
      id: 'builtin-od-zera-do-hakera',
      title: 'Od zera do hakera',
      type: 'system' as const,
      description: 'Bezpieczeństwo IT · 34 lekcje · fiszki · testy · słownik',
      lessonCount: 34,
      progress: 0,
      pending: 0,
      onOpen: onOpenBuiltinCourse,
    };

    const all = [systemCard, ...subjectCards].filter((course) =>
      filter === 'all' || course.type === filter
    );

    return filter === 'all' && !needle
      ? all
      : all.filter((course) =>
          !needle || `${course.title} ${course.description}`.toLocaleLowerCase('pl-PL').includes(needle)
        );
  }, [subjects, entries, builtinProgress.done.length, query, filter, onOpenBuiltinCourse, onOpenSubject]);

  const filterLabels: { id: CourseFilter; label: string }[] = [
    { id: 'all', label: 'Wszystkie' },
    { id: 'system', label: 'Systemowe' },
    { id: 'public', label: 'Publiczne' },
    { id: 'private', label: 'Własne' },
  ];

  return (
    <section className="student-view-shell">
      <header className="student-view-header">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Badge variant="outline" className="gap-1.5"><BookOpen className="size-3.5" /> Biblioteka</Badge>
            <h1 className="student-view-title mt-2">Biblioteka kursów</h1>
            <p className="student-view-copy">Wszystkie kursy, do których masz dostęp, w jednym miejscu.</p>
          </div>
          <Button variant="outline" onClick={onBrowseCourses}>Dodaj z katalogu</Button>
        </div>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Szukaj kursu…" className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          {filterLabels.map((item) => (
            <Button key={item.id} size="sm" variant={filter === item.id ? 'default' : 'outline'} onClick={() => setFilter(item.id)}>
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {cards.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-10 text-center text-sm text-muted-foreground">Nie znaleziono kursów.</CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((course) => (
            <Card key={course.id} className="flex flex-col justify-between hover:border-primary/40">
              <CardHeader>
                <Badge variant={course.type === 'private' ? 'outline' : 'secondary'} className="w-fit">
                  {course.type === 'system' ? 'KURS SYSTEMOWY' : course.type === 'public' ? 'KURS PUBLICZNY' : 'TWÓJ KURS'}
                </Badge>
                <CardTitle className="text-lg">{course.title}</CardTitle>
                <CardDescription>{course.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {course.lessonCount > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{course.lessonCount} lekcji</span><span>{course.progress}%</span>
                    </div>
                    <Progress value={course.progress} />
                  </div>
                )}
                {course.pending > 0 && <p className="text-xs text-primary">{course.pending} części czeka na opracowanie</p>}
                <Button className="w-full" variant="outline" onClick={course.onOpen}>Otwórz kurs</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
};

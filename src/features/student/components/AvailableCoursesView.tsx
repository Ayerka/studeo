import React, { useEffect, useMemo, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { listPublishedCourses } from '@/features/course/lib/public-courses';
import type { PublicCourse, StudentEntry, StudentSubject } from '@/types';
import { BookOpen, Check, Search } from 'lucide-react';

interface AvailableCoursesViewProps {
  client: SupabaseClient;
  subjects: StudentSubject[];
  entries: StudentEntry[];
  busy: boolean;
  onAddCourse: (course: PublicCourse) => Promise<void>;
  onOpenSubject: (subjectId: string) => void;
}

export const AvailableCoursesView: React.FC<AvailableCoursesViewProps> = ({
  client,
  subjects,
  entries,
  busy,
  onAddCourse,
  onOpenSubject,
}) => {
  const [courses, setCourses] = useState<PublicCourse[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);

    void listPublishedCourses(client)
      .then((published) => {
        if (!active) return;
        setCourses(published);
        setError(published.length ? '' : 'Brak opublikowanych kursów.');
      })
      .catch(async () => {
        try {
          const response = await fetch('/courses/od-zera-do-hakera.json', { cache: 'no-cache' });
          if (!response.ok) throw new Error('Brak katalogu kursów.');
          const raw = await response.json() as PublicCourse;
          if (active) {
            setCourses([raw]);
            setError('');
          }
        } catch {
          if (active) setError('Nie udało się pobrać katalogu kursów.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [client]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('pl-PL');
    if (!needle) return courses;
    return courses.filter((course) =>
      `${course.title} ${course.description}`.toLocaleLowerCase('pl-PL').includes(needle) ||
      course.content.lessons.some((lesson) =>
        `${lesson.title} ${lesson.subtitle}`.toLocaleLowerCase('pl-PL').includes(needle)
      )
    );
  }, [courses, query]);

  const findOwnedSubject = (course: PublicCourse) =>
    subjects.find((subject) =>
      entries.some((entry) =>
        entry.subject_id === subject.id && entry.payload.publicCourseSlug === course.slug
      )
    ) ?? subjects.find((subject) => subject.title === course.title) ?? null;

  return (
    <section className="student-view-shell">
      <header className="student-view-header">
        <Badge variant="outline" className="gap-1.5"><BookOpen className="size-3.5" /> Katalog</Badge>
        <h1 className="student-view-title">Dostępne kursy</h1>
        <p className="student-view-copy">Przeglądaj publiczne kursy i dodaj wybrany materiał do własnej biblioteki.</p>
      </header>

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Szukaj kursu lub tematu…"
          className="pl-9"
        />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Wczytywanie katalogu…</p>
      ) : error ? (
        <Card className="border-dashed"><CardContent className="py-8 text-center text-sm text-muted-foreground">{error}</CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-8 text-center text-sm text-muted-foreground">Nie znaleziono kursów dla „{query}”.</CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((course) => {
            const owned = findOwnedSubject(course);
            return (
              <Card key={course.id || course.slug} className="flex flex-col justify-between">
                <CardHeader>
                  <Badge variant="secondary" className="w-fit">PUBLICZNY KURS</Badge>
                  <CardTitle className="text-lg">{course.title}</CardTitle>
                  <CardDescription>{course.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">{course.content.lessons.length} lekcji</Badge>
                    <Badge variant="outline">{course.content.glossary.length} pojęć</Badge>
                  </div>
                  {owned ? (
                    <Button className="w-full gap-2" variant="outline" onClick={() => onOpenSubject(owned.id)}>
                      <Check className="size-4" /> Otwórz w bibliotece
                    </Button>
                  ) : (
                    <Button className="w-full" disabled={busy} onClick={() => void onAddCourse(course)}>
                      Dodaj do biblioteki
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
};

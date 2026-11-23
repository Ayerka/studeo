import type { SupabaseClient } from '@supabase/supabase-js';
import type { PublicCourse } from '@/types';

export function normalizePublicCourse(raw: unknown): PublicCourse | null {
  if (!raw || typeof raw !== 'object') return null;
  const course = raw as Record<string, unknown>;
  const content = course.content as Record<string, unknown> | undefined;
  if (
    typeof course.id !== 'string' ||
    typeof course.slug !== 'string' ||
    typeof course.title !== 'string' ||
    typeof course.description !== 'string' ||
    !content ||
    !Array.isArray(content.lessons) ||
    !Array.isArray(content.glossary) ||
    !Array.isArray(content.lectureMulti)
  ) {
    return null;
  }

  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    description: course.description,
    content: {
      lessons: content.lessons,
      glossary: content.glossary,
      lectureMulti: content.lectureMulti,
    },
    published: course.published === true,
    sort_order: typeof course.sort_order === 'number' ? course.sort_order : 0,
  };
}

export async function listPublishedCourses(client: SupabaseClient): Promise<PublicCourse[]> {
  const { data, error } = await client
    .from('public_courses')
    .select('id,slug,title,description,content,published,sort_order,created_at,updated_at')
    .eq('published', true)
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true });

  if (error) throw error;

  return (data ?? [])
    .map(normalizePublicCourse)
    .filter((course): course is PublicCourse => course !== null);
}

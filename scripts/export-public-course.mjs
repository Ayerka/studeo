import fs from 'node:fs';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });

try {
  const courseData = await vite.ssrLoadModule('/src/data/courseData.ts');
  const course = {
    slug: 'od-zera-do-hakera',
    title: 'Od zera do hakera',
    description: 'Bezpieczeństwo IT: CIA, NIST, kryptografia, zagrożenia i ataki.',
    published: true,
    sort_order: 10,
    content: {
      lessons: courseData.LESSONS,
      glossary: courseData.GLOSSARY,
      lectureMulti: courseData.LECTURE_MULTI,
    },
  };

  fs.mkdirSync(new URL('../public/courses/', import.meta.url), { recursive: true });
  fs.writeFileSync(new URL('../public/courses/od-zera-do-hakera.json', import.meta.url), JSON.stringify(course, null, 2));
  console.log(`Wyeksportowano ${courseData.LESSONS.length} lekcji, ${courseData.GLOSSARY.length} pojęć i ${courseData.LECTURE_MULTI.length} pytań.`);
} finally {
  await vite.close();
}

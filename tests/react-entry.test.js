import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('production HTML mounts the React application entry', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /<div id="root"><\/div>/);
  assert.match(html, /src="\/src\/main\.tsx"/);
  assert.doesNotMatch(html, /src="\/src\/main\.js"/);
  assert.doesNotMatch(html, /id="courseApp"|id="account"/);
});
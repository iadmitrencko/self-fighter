import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import type { ExerciseInfo } from './challenges';

// The name and the plural forms of each exercise come from the front matter of its page.
export function readExercises(directory: string): ExerciseInfo[] {
  return readdirSync(directory)
    .filter((file) => file.endsWith('.md'))
    .sort()
    .map((file) => {
      const [, frontMatter = ''] = /^---\n([\s\S]*?)\n---/.exec(readFileSync(join(directory, file), 'utf8')) ?? [];
      const fields: unknown = parse(frontMatter);
      const field = (key: string): unknown => (typeof fields === 'object' && fields !== null ? Reflect.get(fields, key) : undefined);
      const name = field('name');
      const forms = field('forms');
      const list: readonly unknown[] = Array.isArray(forms) ? forms : [];
      const [one, few, many, ...rest] = list;

      if (typeof name !== 'string' || typeof one !== 'string' || typeof few !== 'string' || typeof many !== 'string' || rest.length > 0) {
        throw new Error(`${file} needs a name and three plural forms in its front matter.`);
      }

      return { slug: file.slice(0, -'.md'.length), name, forms: [one, few, many] };
    });
}

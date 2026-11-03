// Writes backend/content/challenges/generated.json from the matrix: npm run challenges.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { generateChallenges } from './challenges';
import { readExercises } from './exercises';

const [content = '../backend/content'] = process.argv.slice(2);
const matrix: unknown = parse(readFileSync(join(content, 'challenges/matrix.yaml'), 'utf8'));
const challenges = generateChallenges(matrix, readExercises(join(content, 'exercises')));

writeFileSync(join(content, 'challenges/generated.json'), `${JSON.stringify(challenges, null, 2)}\n`);
console.log(`Generated ${challenges.length} challenges.`);

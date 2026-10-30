import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

// Budgets for the JavaScript loaded on start, in gzip kilobytes (section 6.4 of the plan).
const BUDGETS_KB = { site: 15, app: 150 };

const [buildDirectory] = process.argv.slice(2);

if (buildDirectory === undefined) {
  throw new Error('Usage: check-bundle-size.js <build-directory>');
}

const { base, entryPoints } = JSON.parse(
  readFileSync(join(buildDirectory, '.vite/entrypoints.json'), 'utf8'),
);

const gzipSizeKb = (url) => {
  const file = readFileSync(join(buildDirectory, url.slice(base.length)));

  return gzipSync(file).length / 1024;
};

let overBudget = false;

for (const [entry, budgetKb] of Object.entries(BUDGETS_KB)) {
  const { js = [], preload = [] } = entryPoints[entry];
  const sizeKb = [...js, ...preload].reduce((total, url) => total + gzipSizeKb(url), 0);
  const withinBudget = sizeKb <= budgetKb;

  console.log(
    `${withinBudget ? 'ok' : 'over budget'}: ${entry} ${sizeKb.toFixed(1)} KB of ${budgetKb} KB`,
  );
  overBudget ||= !withinBudget;
}

process.exitCode = overBudget ? 1 : 0;

import { chromium, expect, test } from '@playwright/test';
import lighthouse from 'lighthouse';

// Section 6.4 of the plan: the budgets of the public pages in the mobile profile of Lighthouse.
const PAGES = ['/', '/guides', '/guides/ladder-training', '/about'];
const BUDGETS = { performance: 0.9, accessibility: 0.95 };
const LCP_MAX = 2500;
const CLS_MAX = 0.1;
const PORT = 9333;

test('public pages keep the budgets of Lighthouse', async ({ baseURL, request }, testInfo) => {
  // Lighthouse emulates its own phone, so one run is enough.
  test.skip(testInfo.project.name !== 'Mobile Chrome');
  test.setTimeout(PAGES.length * 60_000);
  const browser = await chromium.launch({ args: [`--remote-debugging-port=${PORT}`, '--ignore-certificate-errors'] });
  const failures: string[] = [];

  try {
    for (const path of PAGES) {
      const url = `${baseURL}${path}`;
      const result = await lighthouse(url, {
        port: PORT,
        output: 'json',
        logLevel: 'error',
        onlyCategories: ['performance', 'accessibility', 'seo'],
      });
      const { categories, audits } = result?.lhr ?? { categories: {}, audits: {} };
      // A draft stays closed with noindex until a person reviews it: every other rule of SEO holds.
      const draft = (await (await request.get(path)).text()).includes('<meta name="robots" content="noindex');

      for (const [category, budget] of Object.entries(BUDGETS)) {
        const score = categories[category]?.score ?? 0;

        if (score < budget) {
          failures.push(`${path}: ${category} ${score} < ${budget}`);
        }
      }
      for (const { id, weight } of categories.seo?.auditRefs ?? []) {
        const audit = audits[id];

        if (weight > 0 && audit?.score !== 1 && audit?.scoreDisplayMode !== 'notApplicable' && !(draft && id === 'is-crawlable')) {
          failures.push(`${path}: SEO audit ${id} failed`);
        }
      }
      const lcp = audits['largest-contentful-paint']?.numericValue ?? Infinity;
      const cls = audits['cumulative-layout-shift']?.numericValue ?? Infinity;

      if (lcp > LCP_MAX || cls > CLS_MAX) {
        failures.push(`${path}: LCP ${Math.round(lcp)} ms, CLS ${cls}`);
      }
    }
  } finally {
    await browser.close();
  }

  expect(failures).toEqual([]);
});

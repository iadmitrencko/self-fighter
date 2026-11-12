import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createSession, type CampaignSession } from '../../../domain/engine/session';
import { levelConfig } from '../../../domain/kozak/battle';
import { allLevels, findLevel, SICH } from '../../../domain/kozak/journey';
import { pullUps, testDeps } from '../../../domain/testing/fixtures';
import { createMemoryStorage, type MemoryStorage } from '../../../storage/memory';
import { levelAttempt } from '../../../storage/testing/attempts';
import { renderKozak } from '../../testing/render';
import { scheme } from './common';

// The levels of «Лісові круки» in their order.
const LEVELS = allLevels(SICH)
  .filter(({ campaign }) => campaign === 'forest-ravens')
  .map(({ id }) => id);

// A player who has won the given levels a day before the clock of the tests, with full energy.
async function passed(levels: readonly string[]): Promise<MemoryStorage> {
  const storage = createMemoryStorage();

  for (const [index, level] of levels.entries()) {
    const at = new Date(Date.parse('2026-10-29T00:00:00.000Z') + index * 60_000).toISOString();
    await storage.attempts.save(levelAttempt(level, 'win', at, at));
  }

  return storage;
}

// A battle the screen of preparation has started: it has taken a unit of the energy of the journey.
function battleOf(level: string): CampaignSession {
  return {
    ...createSession(levelConfig(findLevel(SICH, level) ?? (undefined as never), pullUps), testDeps()),
    game: { pool: 'campaign', energyFullAt: '2026-10-30T15:00:00.000Z' },
  };
}

describe('the journey «Січ»', () => {
  // §24.5: «Чорний прапор» and «Лісові круки» have their levels; the rest is still being prepared.
  it('opens the campaigns that have their levels', async () => {
    renderKozak('/journey');

    const ravens = within((await screen.findByRole('heading', { name: 'Лісові круки' })).closest('article') as HTMLElement);
    expect(ravens.getByText('Доступна')).toBeTruthy();
    expect(ravens.getByText('Підтягування · до 10 за підхід')).toBeTruthy();
    expect(ravens.getByRole('link', { name: 'Вирушити в кампанію' }).getAttribute('href')).toBe('/journey/forest-ravens');

    const flag = within(screen.getByRole('heading', { name: 'Чорний прапор' }).closest('article') as HTMLElement);
    expect(flag.getByText('Відтискання · до 25 за підхід')).toBeTruthy();
    expect(flag.getByRole('link', { name: 'Вирушити в кампанію' }).getAttribute('href')).toBe('/journey/black-flag');

    const wolves = within(screen.getByRole('heading', { name: 'Степові вовки' }).closest('article') as HTMLElement);
    expect(wolves.getByText('Закрита')).toBeTruthy();
    expect(wolves.getByText('Ще готується')).toBeTruthy();
    expect(wolves.getByRole('button', { name: 'Недоступно' })).toHaveProperty('disabled', true);
    const finale = within(screen.getByRole('heading', { name: 'Фінальна битва' }).closest('article') as HTMLElement);
    expect(finale.getByText('Відкриється після трьох кампаній')).toBeTruthy();
  });

  it('tells how far a campaign has gone', async () => {
    renderKozak('/journey', { storage: await passed(LEVELS.slice(0, 4)) });

    const ravens = within((await screen.findByRole('heading', { name: 'Лісові круки' })).closest('article') as HTMLElement);
    expect(ravens.getByText('Розпочато · 1/10')).toBeTruthy();
    expect(ravens.getByText('1 / 10 етапів')).toBeTruthy();
    expect(ravens.getByRole('link', { name: 'Продовжити кампанію' })).toBeTruthy();
  });
});

describe('the map of a campaign', () => {
  it('leads to the stages passed and to the current one', async () => {
    renderKozak('/journey/forest-ravens', { storage: await passed(LEVELS.slice(0, 4)) });

    expect(await screen.findByRole('heading', { level: 1, name: 'Лісові круки' })).toBeTruthy();
    // A phone and a wide screen have maps of their own, so every point is there twice.
    for (const link of screen.getAllByRole('link', { name: 'Етап 1: Перші сліди, пройдено' })) {
      expect(link.getAttribute('href')).toBe('/journey/forest-ravens/1');
    }
    expect(screen.getAllByRole('link', { name: 'Етап 2: Глибше в хащі, доступно' })).toHaveLength(2);
    expect(screen.queryByRole('link', { name: /Етап 3/ })).toBeNull();
    expect(screen.getAllByRole('img', { name: 'Етап 3: Серце лісу, закрито' })).toHaveLength(2);
    for (const link of screen.getAllByRole('link', { name: 'Відкрити етап' })) {
      expect(link.getAttribute('href')).toBe('/journey/forest-ravens/2');
    }
    expect(screen.getAllByText('Ти тут · Глибше в хащі')).toHaveLength(1);
  });

  it('says a campaign passed is passed', async () => {
    renderKozak('/journey/forest-ravens', { storage: await passed(LEVELS) });

    expect(await screen.findByText('Кампанію пройдено')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Відкрити етап' })).toBeNull();
  });

  it('keeps a campaign that is being prepared closed', async () => {
    renderKozak('/journey/steppe-wolves');

    expect(await screen.findByRole('heading', { name: 'Кампанія ще закрита' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Етап/ })).toBeNull();
  });
});

describe('the map of a stage', () => {
  it('shows the current level and the way to its battle', async () => {
    renderKozak('/journey/forest-ravens/1');

    expect(await screen.findByRole('heading', { level: 1, name: 'Перші сліди' })).toBeTruthy();
    const card = within(screen.getByRole('complementary', { name: 'Вибраний рівень' }));
    expect(card.getByRole('heading', { name: 'Перше випробування' })).toBeTruthy();
    expect(card.getByText('Рівень 1 · Звичайний рівень')).toBeTruthy();
    expect(card.getByText('1-1-1')).toBeTruthy();
    expect(card.getByRole('link', { name: 'Перейти до випробування' }).getAttribute('href')).toBe(
      '/journey/forest-ravens/1/1',
    );
  });

  it('tells when a locked level opens', async () => {
    const { user } = renderKozak('/journey/forest-ravens/1');

    await user.click(await screen.findByRole('button', { name: 'Рівень 3: Слід розбійників, закрито' }));

    const card = within(screen.getByRole('complementary', { name: 'Вибраний рівень' }));
    expect(card.getByRole('button', { name: 'Закрито' })).toHaveProperty('disabled', true);
    expect(card.getByText('Відкриється після «Лісова варта»')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Рівень 3: Слід розбійників, закрито', pressed: true })).toBeTruthy();
  });

  it('shows a passed level without a battle', async () => {
    const { user } = renderKozak('/journey/forest-ravens/1', { storage: await passed(LEVELS.slice(0, 1)) });

    await user.click(await screen.findByRole('button', { name: 'Рівень 1: Перше випробування, пройдено' }));

    const card = within(screen.getByRole('complementary', { name: 'Вибраний рівень' }));
    expect(card.getByText('Пройдено')).toBeTruthy();
    expect(card.queryByRole('link')).toBeNull();
  });

  // §24.5: the last level of a stage is its leader.
  it('calls out the leader of the stage', async () => {
    renderKozak('/journey/forest-ravens/1', { storage: await passed(LEVELS.slice(0, 3)) });

    const card = within(await screen.findByRole('complementary', { name: 'Вибраний рівень' }));
    expect(card.getByText('Бос · Рівень 4')).toBeTruthy();
    expect(card.getByRole('img', { name: 'Портрет: Ватажок розвідників' })).toBeTruthy();
    expect(card.getByText('10 × 1')).toBeTruthy();
    expect(card.getByRole('link', { name: 'Кинути виклик ватажку' }).getAttribute('href')).toBe('/journey/forest-ravens/1/4');
  });

  it('knows only the stages of the campaign', async () => {
    renderKozak('/journey/forest-ravens/11');

    expect(await screen.findByRole('heading', { level: 1, name: 'Тут нічого немає' })).toBeTruthy();
  });
});

describe('the battle of a level', () => {
  // Screens 5–7 of kozak_design: the task, the sets one by one and the victory.
  it('is prepared, played set by set and won', async () => {
    const { user, storage } = renderKozak('/journey/forest-ravens/1/1');

    expect(await screen.findByRole('heading', { level: 1, name: 'Перше випробування' })).toBeTruthy();
    const task = within(screen.getByRole('region', { name: 'Завдання' }));
    expect(task.getByText('Підтягування')).toBeTruthy();
    expect(task.getByText('3 повторення')).toBeTruthy();
    expect(task.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText('За перемогу: +2 слави')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Почати випробування' }));

    const battle = within(await screen.findByRole('dialog', { name: 'Перше випробування' }));
    expect(storage.gameSessions.campaign.load()?.game?.pool).toBe('campaign');
    expect(battle.getByText('Підтягування · 1-1-1')).toBeTruthy();

    for (let set = 1; set <= 3; set += 1) {
      expect(battle.getByText('Підхід')).toBeTruthy();
      await user.click(battle.getByRole('button', { name: 'Підхід виконано' }));
    }

    expect(await battle.findByText('Усі підходи виконано')).toBeTruthy();
    expect(battle.getByText('3 з 3 повторень')).toBeTruthy();
    await user.click(battle.getByRole('button', { name: 'Завершити тренування' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Розбійника схоплено' })).toBeTruthy();
    expect(screen.getByText('Рівень 1 · Перше випробування — пройдено')).toBeTruthy();
    expect(screen.getByText('+2')).toBeTruthy();
    expect(screen.getByText('Лісова варта')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Далі' }).getAttribute('href')).toBe('/journey/forest-ravens/1/2');
    expect(storage.gameSessions.campaign.load()).toBeNull();
    expect(await storage.attempts.game()).toMatchObject({
      campaign: { wins: 1, draws: 0, losses: 0 },
      passed: ['forest-ravens/1/1'],
    });
  });

  // Screen 6: no timer, the player rests as long as needed.
  it('pauses and goes on when the player says so', async () => {
    const storage = createMemoryStorage();
    storage.gameSessions.campaign.save(battleOf('forest-ravens/1/1'));
    const { user } = renderKozak('/journey/battle', { storage });

    await user.click(await screen.findByRole('button', { name: 'Пауза' }));

    expect(screen.getByRole('status').textContent).toBe('Пауза — відпочинь і продовж, коли відновиш сили');
    expect(screen.getByRole('button', { name: 'Продовжити', pressed: true })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Підхід виконано' }));

    expect(screen.queryByText(/Пауза —/)).toBeNull();
    expect(screen.getByText('1 з 3')).toBeTruthy();
  });

  it('goes on after a reload where it stopped', async () => {
    const storage = createMemoryStorage();
    storage.gameSessions.campaign.save(battleOf('forest-ravens/1/1'));
    const first = renderKozak('/journey/battle', { storage });

    await first.user.click(await screen.findByRole('button', { name: 'Підхід виконано' }));
    first.unmount();
    renderKozak('/journey/battle', { storage });

    expect(await screen.findByText('1 з 3')).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'Підходи' }).getAttribute('aria-valuenow')).toBe('1');
  });

  // §24.5: a retreat loses the level; the energy stays spent and the level waits for another try.
  it('is lost on a retreat', async () => {
    const storage = createMemoryStorage();
    storage.gameSessions.campaign.save(battleOf('forest-ravens/1/1'));
    const { user } = renderKozak('/journey/battle', { storage });

    await user.click(await screen.findByRole('button', { name: 'Підхід виконано' }));
    await user.click(screen.getByRole('button', { name: 'Завершити' }));
    const confirm = within(screen.getByRole('dialog', { name: 'Відступити з бою?' }));
    await user.click(confirm.getByRole('button', { name: 'Відступити' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Цього разу ворог устояв' })).toBeTruthy();
    expect(screen.getByText('1 / 3')).toBeTruthy();
    expect(await screen.findByRole('link', { name: 'Спробувати ще раз' })).toBeTruthy();
    expect(await storage.attempts.game()).toMatchObject({
      campaign: { wins: 0, draws: 0, losses: 1 },
      passed: [],
      energy: { campaign: '2026-10-30T15:00:00.000Z' },
    });
  });

  it('is not left by accident', async () => {
    const storage = createMemoryStorage();
    storage.gameSessions.campaign.save(battleOf('forest-ravens/1/1'));
    const { user } = renderKozak('/journey/battle', { storage });

    await user.click(await screen.findByRole('button', { name: 'Завершити' }));
    await user.click(screen.getByRole('button', { name: 'Продовжити бій' }));

    expect(screen.queryByRole('dialog', { name: 'Відступити з бою?' })).toBeNull();
    expect(storage.gameSessions.campaign.load()).not.toBeNull();
  });

  // §24.4: five battles in a row empty the pool of the journey for five hours.
  it('waits for the energy of the journey', async () => {
    const storage = createMemoryStorage();

    for (let battle = 0; battle < 5; battle += 1) {
      const fullAt = new Date(Date.parse('2026-10-30T14:00:00.000Z') + battle * 5 * 3_600_000).toISOString();
      await storage.attempts.save(levelAttempt('forest-ravens/1/1', 'loss', `2026-10-30T09:0${battle}:00.000Z`, fullAt));
    }
    renderKozak('/journey/forest-ravens/1/1', { storage });

    expect(await screen.findByRole('button', { name: 'Почати випробування' })).toHaveProperty('disabled', true);
    expect(screen.getByText('Енергії немає. Наступна одиниця через 4 год.')).toBeTruthy();
  });

  it('leads back to the battle in progress instead of a new one', async () => {
    const storage = createMemoryStorage();
    storage.gameSessions.campaign.save(battleOf('forest-ravens/1/1'));
    renderKozak('/journey/forest-ravens/1/1', { storage });

    expect((await screen.findByRole('link', { name: 'Повернутися до бою' })).getAttribute('href')).toBe('/journey/battle');
    expect(screen.queryByText(/Незавершене випробування/)).toBeNull();
  });

  it('names the battle in progress of another level', async () => {
    const storage = await passed(LEVELS.slice(0, 1));
    storage.gameSessions.campaign.save(battleOf('forest-ravens/1/1'));
    renderKozak('/journey/forest-ravens/1/2', { storage });

    expect(await screen.findByText(/Ти ще в бою на рівні «Перше випробування»/)).toBeTruthy();
  });

  it('says a level is passed or still closed', async () => {
    const storage = await passed(LEVELS.slice(0, 1));
    const { unmount } = renderKozak('/journey/forest-ravens/1/1', { storage });

    expect(await screen.findByText('Цей рівень уже пройдено. Слава за нього вже з тобою.')).toBeTruthy();
    unmount();
    renderKozak('/journey/forest-ravens/1/3', { storage });

    expect(await screen.findByText('Цей рівень ще закритий.')).toBeTruthy();
  });

  it('takes the player to the journey when nothing is in progress', async () => {
    renderKozak('/journey/battle');

    expect(await screen.findByRole('heading', { level: 1, name: 'Похід «Січ»' })).toBeTruthy();
  });
});

describe('the victories over a boss', () => {
  // Screen 8: the stage is passed, the next one opens, and the glory brings a new rank.
  it('ends the stage', async () => {
    const storage = await passed(LEVELS.slice(0, 3));
    const { user } = renderKozak('/journey/forest-ravens/1/4', { storage });

    await user.click(await screen.findByRole('button', { name: 'Кинути виклик ватажку' }));
    const battle = within(await screen.findByRole('dialog', { name: 'Ватажок розвідників' }));

    for (let set = 0; set < 10; set += 1) {
      await user.click(battle.getByRole('button', { name: 'Підхід виконано' }));
    }
    await user.click(await battle.findByRole('button', { name: 'Завершити тренування' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Ватажка розвідників переможено' })).toBeTruthy();
    expect(screen.getByText('Бос переможений')).toBeTruthy();
    expect(screen.getByText('+5')).toBeTruthy();
    expect(screen.getByText('Етап «Перші сліди» пройдено')).toBeTruthy();
    expect(screen.getByText('Відкрито етап 2')).toBeTruthy();
    expect((await screen.findByText(/Нове звання/)).textContent).toBe('Нове звання: Заставний');
    expect(screen.getByRole('link', { name: 'Далі — до карти кампанії' }).getAttribute('href')).toBe('/journey/forest-ravens');
  });

  // §24.3: the last boss passes the campaign and adds its glory.
  it('passes the campaign', async () => {
    const storage = await passed(LEVELS.slice(0, -1));
    storage.gameSessions.campaign.save(battleOf('forest-ravens/10/7'));
    const { user } = renderKozak('/journey/battle', { storage });

    for (let set = 0; set < 19; set += 1) {
      await user.click(await screen.findByRole('button', { name: 'Підхід виконано' }));
    }
    await user.click(await screen.findByRole('button', { name: 'Завершити тренування' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Чорного Крука переможено' })).toBeTruthy();
    expect(screen.getByText('+15')).toBeTruthy();
    expect(screen.getByText('+10 слави за кампанію')).toBeTruthy();
    // The record of the screen learns of the last battle a moment later.
    expect(await screen.findByText('Кампанію «Лісові круки» пройдено')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Далі — до походу' }).getAttribute('href')).toBe('/journey');
  });

  it('finds no battle the history does not have', async () => {
    renderKozak('/journey/result/019a3b2c-1d2e-7f30-8a41-b52c63d74e85');

    expect(await screen.findByRole('heading', { level: 1, name: 'Тут нічого немає' })).toBeTruthy();
  });
});

describe('the scheme of a level', () => {
  it.each([
    [[1, 1, 1], '1-1-1'],
    [[4, 4, 3, 3, 3], '4-4-3-3-3'],
    [Array<number>(10).fill(2), '10 × 2'],
    [[1, 2, 3, 4, 5, 6], '1 → 6'],
    [[1, 2, 3, 4, 3, 2, 1], '1 → 4 → 1'],
    [[6, 5, 6, 5, 6, 5], '6-5-6-5-6-5'],
  ])('writes %j as «%s»', (sets, written) => {
    expect(scheme(sets)).toBe(written);
  });
});

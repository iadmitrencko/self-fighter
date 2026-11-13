import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createSession, type CampaignSession } from '../../../domain/engine/session';
import { levelConfig } from '../../../domain/kozak/battle';
import { allLevels, findLevel, SICH } from '../../../domain/kozak/journey';
import type { ExerciseRef } from '../../../domain/catalog/exercise';
import { pullUps, squats, testDeps } from '../../../domain/testing/fixtures';
import { createMemoryStorage, type MemoryStorage } from '../../../storage/memory';
import { duelAttempt, levelAttempt } from '../../../storage/testing/attempts';
import { renderKozak } from '../../testing/render';
import { scheme } from './common';

// The levels of a campaign in their order.
const levelsOf = (campaign: string) =>
  allLevels(SICH)
    .filter((level) => level.campaign === campaign)
    .map(({ id }) => id);
const LEVELS = levelsOf('forest-ravens');
const WOLVES = levelsOf('steppe-wolves');

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
function battleOf(level: string, exercise: ExerciseRef = pullUps): CampaignSession {
  return {
    ...createSession(levelConfig(findLevel(SICH, level) ?? (undefined as never), exercise), testDeps()),
    game: { pool: 'campaign', energyFullAt: '2026-10-30T15:00:00.000Z' },
  };
}

describe('the journey «Січ»', () => {
  // §24.5: the three campaigns have their levels; the final battle waits for them.
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
    expect(wolves.getByText('Присідання · до 50 за підхід')).toBeTruthy();
    expect(wolves.getByRole('link', { name: 'Вирушити в кампанію' }).getAttribute('href')).toBe('/journey/steppe-wolves');

    const finale = within(screen.getByRole('heading', { name: 'Фінальна битва' }).closest('article') as HTMLElement);
    expect(finale.getByText('Закрита')).toBeTruthy();
    expect(finale.getByRole('button', { name: 'Недоступно' })).toHaveProperty('disabled', true);
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


  // §24.5: «Степові вовки» has the ten stages of its brief on a map of its own.
  it('leads to the stages of «Степові вовки»', async () => {
    renderKozak('/journey/steppe-wolves', { storage: await passed(WOLVES.slice(0, 6)) });

    expect(await screen.findByRole('heading', { level: 1, name: 'Степові вовки' })).toBeTruthy();
    expect(screen.getAllByRole('link', { name: 'Етап 1: Перші сліди, пройдено' })).toHaveLength(2);
    expect(screen.getAllByRole('link', { name: 'Етап 2: Степові нальоти, доступно' })).toHaveLength(2);
    expect(screen.getAllByRole('img', { name: 'Етап 10: Сірий Вовк, закрито' })).toHaveLength(2);
    expect(screen.getAllByText('Ти тут · Степові нальоти')).toHaveLength(1);
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

  it('shows the first level of «Степові вовки» with its squats', async () => {
    renderKozak('/journey/steppe-wolves/1');

    expect(await screen.findByRole('heading', { level: 1, name: 'Перші сліди' })).toBeTruthy();
    const card = within(screen.getByRole('complementary', { name: 'Вибраний рівень' }));
    expect(card.getByRole('heading', { name: 'Покинутий віз' })).toBeTruthy();
    expect(card.getByText('Ти знаходиш розграбований віз і перші докази нападу.')).toBeTruthy();
    expect(card.getByText('Присідання')).toBeTruthy();
    expect(card.getByText('2-3-3')).toBeTruthy();
    expect(card.getByText('8')).toBeTruthy();
    expect(card.getByRole('link', { name: 'Перейти до випробування' }).getAttribute('href')).toBe('/journey/steppe-wolves/1/1');
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

  // §24.4: six battles in a row empty the pool of the journey for two hours.
  it('waits for the energy of the journey', async () => {
    const storage = createMemoryStorage();

    for (let battle = 0; battle < 6; battle += 1) {
      const fullAt = new Date(Date.parse('2026-10-30T11:00:00.000Z') + battle * 2 * 3_600_000).toISOString();
      await storage.attempts.save(levelAttempt('forest-ravens/1/1', 'loss', `2026-10-30T09:0${battle}:00.000Z`, fullAt));
    }
    renderKozak('/journey/forest-ravens/1/1', { storage });

    expect(await screen.findByRole('button', { name: 'Почати випробування' })).toHaveProperty('disabled', true);
    expect(screen.getByText('Енергії немає. Наступна одиниця через 1 год.')).toBeTruthy();
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

  // §24.5: the Grey Wolf is the last boss of «Степові вовки».
  it('passes «Степові вовки» with the Grey Wolf', async () => {
    const storage = await passed(WOLVES.slice(0, -1));
    storage.gameSessions.campaign.save(battleOf('steppe-wolves/10/6', squats));
    const { user } = renderKozak('/journey/battle', { storage });

    expect(await screen.findByText('Присідання · 15-25-35-50-35-25-15')).toBeTruthy();
    for (let set = 0; set < 7; set += 1) {
      await user.click(await screen.findByRole('button', { name: 'Підхід виконано' }));
    }
    await user.click(await screen.findByRole('button', { name: 'Завершити тренування' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Сірого Вовка переможено' })).toBeTruthy();
    expect(screen.getByText('+10 слави за кампанію')).toBeTruthy();
    expect(await screen.findByText('Кампанію «Степові вовки» пройдено')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Далі — до походу' }).getAttribute('href')).toBe('/journey');
  });

  it('finds no battle the history does not have', async () => {
    renderKozak('/journey/result/019a3b2c-1d2e-7f30-8a41-b52c63d74e85');

    expect(await screen.findByRole('heading', { level: 1, name: 'Тут нічого немає' })).toBeTruthy();
  });
});

// §24.9: the duel with the King of robbers, the final battle of the journey.
describe('the duel with the King', () => {
  const ALL = allLevels(SICH).map(({ id }) => id);

  it('waits for the three campaigns', async () => {
    renderKozak('/journey/final-battle');

    expect(await screen.findByRole('heading', { level: 2, name: 'Король чекає' })).toBeTruthy();
    expect(screen.getByText('Двобій із Королем розбійників почнеться, коли ти пройдеш усі три кампанії походу.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /До бою з Королем/ })).toBeNull();
  });

  it('opens with the King at full health', async () => {
    const storage = await passed(ALL);
    const { unmount } = renderKozak('/journey', { storage });

    const card = within((await screen.findByRole('heading', { name: 'Фінальна битва' })).closest('article') as HTMLElement);
    expect(card.getByText('Доступна')).toBeTruthy();
    expect(card.getByRole('progressbar', { name: 'Здоров’я Короля: 100 з 100' })).toBeTruthy();
    expect(card.getByRole('link', { name: 'До бою з Королем' }).getAttribute('href')).toBe('/journey/final-battle');
    unmount();
    renderKozak('/journey/final-battle', { storage });

    expect(await screen.findByRole('heading', { level: 1, name: 'Король розбійників' })).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'Здоров’я Короля: 100 з 100' })).toBeTruthy();
    expect(screen.getByText('Незламний Король')).toBeTruthy();
    expect(within(screen.getByRole('region', { name: 'Раунди двобою' })).getAllByRole('listitem')).toHaveLength(5);
    const next = within(screen.getByRole('region', { name: 'Наступний бій' }));
    expect(next.getByRole('heading', { name: 'Перша сутичка' })).toBeTruthy();
    expect(next.getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Відтискання15повт.', 'Відтискання20повт.', 'Відтискання25повт.']);
    expect(next.getByRole('button', { name: 'До бою з Королем · 3 підходи' })).toBeTruthy();
  });

  // A retreat keeps the damage done, and the next battle goes on from the first set not done.
  it('keeps the damage of a battle left in the middle', async () => {
    const { user, storage } = renderKozak('/journey/final-battle', { storage: await passed(ALL) });

    await user.click(await screen.findByRole('button', { name: 'До бою з Королем · 3 підходи' }));
    const battle = within(await screen.findByRole('dialog', { name: 'Раунд 1 · Перша сутичка' }));
    expect(storage.gameSessions.campaign.load()?.game?.pool).toBe('campaign');
    expect(battle.getAllByText('Відтискання').length).toBeGreaterThan(0);
    await user.click(battle.getByRole('button', { name: 'Підхід виконано' }));
    await user.click(battle.getByRole('button', { name: 'Підхід виконано' }));
    await user.click(battle.getByRole('button', { name: 'Завершити' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Відступити з бою?' })).getByRole('button', { name: 'Відступити' }));

    // 15 and 20 of 60 push-ups.
    expect(await screen.findByRole('heading', { level: 1, name: 'Король утратив 11 здоров’я' })).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'Здоров’я Короля: 89 з 100' })).toBeTruthy();
    expect(screen.getByText('2 / 3')).toBeTruthy();

    await user.click(screen.getByRole('link', { name: 'Продовжити двобій' }));

    expect(await screen.findByRole('button', { name: 'Продовжити двобій · 1 підхід' })).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'Здоров’я Короля: 89 з 100' })).toBeTruthy();
  });

  it('opens the next round once a round is done', async () => {
    const storage = await passed(ALL);
    await storage.attempts.save(duelAttempt(1, '2026-10-29T12:00:00.000Z', '2026-10-29T14:00:00.000Z', { retreatAt: 2 }));
    const { user } = renderKozak('/journey/final-battle', { storage });

    await user.click(await screen.findByRole('button', { name: 'Продовжити двобій · 1 підхід' }));
    const battle = within(await screen.findByRole('dialog', { name: 'Раунд 1 · Перша сутичка' }));
    await user.click(battle.getByRole('button', { name: 'Підхід виконано' }));
    await user.click(await battle.findByRole('button', { name: 'Завершити тренування' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Король утратив 9 здоров’я' })).toBeTruthy();
    // 80 health: the King still stands unbroken.
    expect(screen.getByRole('progressbar', { name: 'Здоров’я Короля: 80 з 100' })).toBeTruthy();
    expect(screen.getByText(/^Король ще тримається/)).toBeTruthy();
    expect(screen.getByText('Раунд «Перша сутичка» пройдено')).toBeTruthy();
    expect(screen.getByText('Відкрито раунд 2')).toBeTruthy();
    expect(screen.getByText('+5')).toBeTruthy();
  });

  // The last set of the last round defeats the King and ends the journey.
  it('ends the journey with the King defeated', async () => {
    const storage = await passed(ALL);
    for (const round of [1, 2, 3, 4]) {
      await storage.attempts.save(duelAttempt(round, `2026-10-29T1${round}:00:00.000Z`, '2026-10-29T15:00:00.000Z'));
    }
    await storage.attempts.save(duelAttempt(5, '2026-10-29T15:00:00.000Z', '2026-10-29T16:00:00.000Z', { retreatAt: 9 }));
    const { user } = renderKozak('/journey/final-battle', { storage });

    expect(await screen.findByText('Останній подих')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Продовжити двобій · 1 підхід' }));
    const battle = within(await screen.findByRole('dialog', { name: 'Раунд 5 · Смертельний поєдинок' }));
    await user.click(battle.getByRole('button', { name: 'Підхід виконано' }));
    await user.click(await battle.findByRole('button', { name: 'Завершити тренування' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Короля розбійників переможено' })).toBeTruthy();
    expect(screen.getByText('+35')).toBeTruthy();
    expect(screen.getByText('+30 слави за похід')).toBeTruthy();
    const legend = within(screen.getByRole('region', { name: 'Легенда Січі' }));
    expect(legend.getByText('Оборонець Січі')).toBeTruthy();
    expect(legend.getByText('Шабля Короля розбійників')).toBeTruthy();

    await user.click(screen.getByRole('link', { name: 'До козака' }));

    expect(await screen.findByRole('region', { name: 'Легенда Січі' })).toBeTruthy();
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

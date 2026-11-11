import { useId, useState } from 'react';
import { Link } from 'react-router';
import type { Mode } from '../../../domain/config/types';
import { energyStatus, fightHallTexts, formatWait } from '../../../i18n/kozak';
import { modeGuides, modeNames, modesTexts } from '../../../i18n/uk';
import { Title } from '../../components/Screen';
import { MemoryWarning } from '../../components/notices';
import { useGame } from '../../game';
import { kozakPaths, MODES } from '../paths';
import { EnergyMeter, KozakIcon, KozakScreen, WithCossack } from '../parts';
import { useNow } from '../record';

// §24.6: the fights of the game start here, from the choice of the mode.
export function FightHall() {
  const { storage } = useGame();
  const now = useNow();
  const [mode, setMode] = useState<Mode>('target');
  const session = storage.gameSessions.fight.load();
  const guide = modeGuides[mode];
  const resumeId = useId();

  return (
    <KozakScreen title={fightHallTexts.title} className="k-hall">
      <header className="k-head">
        <p className="k-eyebrow">{fightHallTexts.eyebrow}</p>
        <Title className="k-title">{fightHallTexts.title}</Title>
        <p className="k-lead">{fightHallTexts.lead}</p>
      </header>
      <MemoryWarning />
      <WithCossack>
        {(cossack) => {
          const energy = cossack.energy('fight', now);

          return (
            <div className="k-hall__body">
              <div className="k-hall__side">
                <EnergyMeter pool="fight" energy={energy} now={now} />
                {session !== null && (
                  <section className="k-card k-card--active" aria-labelledby={resumeId}>
                    <h2 id={resumeId} className="k-card__title">
                      {fightHallTexts.resumeTitle}
                    </h2>
                    <p className="k-card__text">
                      {fightHallTexts.resumeProgress(
                        modeNames[session.mode],
                        session.stages.filter(({ actual }) => actual !== null).length,
                        session.stages.length,
                      )}
                    </p>
                    <Link className="k-button k-button--primary" to={kozakPaths.fightBattle}>
                      {fightHallTexts.resume}
                    </Link>
                  </section>
                )}
              </div>
              <div className="k-hall__main">
                <fieldset className="choices">
                  <legend className="visually-hidden">{modesTexts.group}</legend>
                  {MODES.map((item, index) => (
                    <label key={item} className="choice">
                      <input
                        type="radio"
                        name="mode"
                        className="choice__input"
                        checked={item === mode}
                        onChange={() => setMode(item)}
                      />
                      <span className="choice__number" aria-hidden="true">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="choice__name">{modeNames[item]}</span>
                    </label>
                  ))}
                </fieldset>
                <section className="k-card mode-guide" aria-live="polite">
                  <h2 className="k-card__title">{modeNames[mode]}</h2>
                  <dl className="mode-guide__facts">
                    <div>
                      <dt className="eyebrow">{modesTexts.task}</dt>
                      <dd>{guide.task}</dd>
                    </div>
                    <div>
                      <dt className="eyebrow">{modesTexts.win}</dt>
                      <dd>{guide.win}</dd>
                    </div>
                    <div>
                      <dt className="eyebrow">{modesTexts.length}</dt>
                      <dd>{guide.length}</dd>
                    </div>
                  </dl>
                </section>
                {energy.value > 0 ? (
                  <Link className="k-button k-button--primary k-button--large" to={kozakPaths.fightSetup(mode)}>
                    {fightHallTexts.next}
                    <KozakIcon name="back" className="k-button__icon k-button__icon--forward" />
                  </Link>
                ) : (
                  <div className="k-refusal">
                    <button type="button" className="k-button k-button--locked k-button--large" disabled>
                      <KozakIcon name="lock" className="k-button__icon" />
                      {fightHallTexts.noEnergy}
                    </button>
                    <p className="k-refusal__text">
                      {energyStatus.empty(formatWait(Date.parse(energy.nextAt ?? now.toISOString()) - now.getTime()))}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        }}
      </WithCossack>
    </KozakScreen>
  );
}

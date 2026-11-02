import { useId, useState } from 'react';
import { Link } from 'react-router';
import type { Mode } from '../../domain/config/types';
import type { Session } from '../../domain/engine/session';
import { modeGuides, modeNames, modesTexts } from '../../i18n/uk';
import { Icon } from '../components/Icon';
import { AppBar, Screen, Title } from '../components/Screen';
import { MemoryWarning } from '../components/notices';
import { useGame } from '../game';
import { MODES, paths } from '../paths';

// §3.2: the first step of the game. An interrupted attempt is offered back here (§12.4).
export function ModesScreen() {
  const { storage } = useGame();
  const [mode, setMode] = useState<Mode>('target');
  const [session, setSession] = useState(() => storage.activeSession.load());
  const guide = modeGuides[mode];

  return (
    <Screen title={modesTexts.title}>
      <AppBar />
      <MemoryWarning />
      {session !== null && (
        <ResumeNotice
          session={session}
          onDiscard={() => {
            storage.activeSession.clear();
            setSession(null);
          }}
        />
      )}
      <div className="screen-intro">
        <p className="eyebrow">{modesTexts.step}</p>
        <Title className="screen-title">{modesTexts.title}</Title>
      </div>
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
      <section className="card mode-guide" aria-live="polite">
        <h2 className="mode-guide__title">{modeNames[mode]}</h2>
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
      <div className="screen__actions">
        <Link className="button button--primary button--large" to={paths.setup(mode)}>
          {modesTexts.next}
          <Icon name="arrow" className="button__icon" />
        </Link>
      </div>
    </Screen>
  );
}

function ResumeNotice({ session, onDiscard }: { session: Session; onDiscard: () => void }) {
  const titleId = useId();
  const done = session.stages.filter(({ actual }) => actual !== null).length;

  return (
    <section className="notice notice--resume" aria-labelledby={titleId}>
      <h2 id={titleId} className="notice__title">
        {modesTexts.resumeTitle}
      </h2>
      <p>{modesTexts.resumeProgress(session.mode, done, session.stages.length)}</p>
      <div className="notice__actions">
        <Link className="button button--primary" to={paths.fight}>
          {modesTexts.resume}
        </Link>
        <button type="button" className="button button--outline" onClick={onDiscard}>
          {modesTexts.discard}
        </button>
      </div>
    </section>
  );
}

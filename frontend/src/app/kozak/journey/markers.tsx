import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router';
import type { Status } from '../../../domain/kozak/progress';
import type { LabelSide } from '../art/CampaignMap';
import { KozakIcon, Raven } from '../parts';

/*
 * The markers of kozak_design (section 3): gold with a check for a passed point, a glowing
 * circle with its number for the current one, grey for a locked one, a rhombus for a boss.
 */

export interface MarkerLook {
  readonly status: Status;
  readonly number: number;
  readonly boss: boolean;
  // A locked point shows its number on the map of a campaign and a lock on the map of a stage.
  readonly lockedFace: 'number' | 'lock';
}

function Face({ status, number, boss, lockedFace }: MarkerLook) {
  if (status === 'done') {
    return <KozakIcon name="check" className="k-marker__check" />;
  }
  if (boss && status === 'current') {
    return <Raven className="k-marker__raven" />;
  }
  if (status === 'locked' && lockedFace === 'lock') {
    return <KozakIcon name="lock" className="k-marker__lock" />;
  }

  return <span className="k-marker__number">{number}</span>;
}

function markerClass({ status, boss }: MarkerLook, selected: boolean): string {
  return ['k-marker', `k-marker--${status}`, boss ? 'k-marker--boss' : '', selected ? 'k-marker--selected' : '']
    .filter(Boolean)
    .join(' ');
}

export function Pin({
  style,
  side,
  tag,
  tagTone = 'plain',
  children,
}: {
  style: CSSProperties;
  side: LabelSide;
  tag: ReactNode;
  tagTone?: 'plain' | 'current' | 'selected' | 'locked' | 'boss';
  children: ReactNode;
}) {
  return (
    <div className="k-pin" style={style}>
      {children}
      <span className={`k-tag k-tag--${side} k-tag--${tagTone}`} aria-hidden="true">
        {tag}
      </span>
    </div>
  );
}

// A point that opens another screen: a stage of the campaign.
export function MarkerLink({ look, to, label }: { look: MarkerLook; to: string; label: string }) {
  return (
    <Link className={markerClass(look, false)} to={to} aria-label={label}>
      <Face {...look} />
    </Link>
  );
}

// A point that chooses a level of the stage for its card.
export function MarkerButton({
  look,
  selected,
  label,
  onSelect,
}: {
  look: MarkerLook;
  selected: boolean;
  label: string;
  onSelect: () => void;
}) {
  return (
    <button type="button" className={markerClass(look, selected)} aria-label={label} aria-pressed={selected} onClick={onSelect}>
      <Face {...look} />
    </button>
  );
}

// A point that cannot be opened yet.
export function MarkerStill({ look, label }: { look: MarkerLook; label: string }) {
  return (
    <span className={markerClass(look, false)} role="img" aria-label={label}>
      <Face {...look} />
    </span>
  );
}

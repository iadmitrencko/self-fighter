import { formatDate } from '../../i18n/format';
import { campaignTexts, legendTexts } from '../../i18n/kozak';
import { SaberTrophy } from './art/King';

// §24.9: the title and the trophy of the one who defeated the King, outside the ladder of ranks.
export function Legend({ at }: { at: string | null }) {
  return (
    <section className="k-card k-legend-card" aria-label={legendTexts.heading}>
      <SaberTrophy label={legendTexts.trophyArt} className="k-legend-card__trophy" />
      <div className="k-legend-card__text">
        <p className="k-eyebrow k-eyebrow--gold">{legendTexts.heading}</p>
        <p className="k-legend-card__title">
          <span>{legendTexts.titleLabel}</span>
          <b>{legendTexts.title}</b>
        </p>
        <p className="k-legend-card__title">
          <span>{legendTexts.trophyLabel}</span>
          <b>{legendTexts.trophy}</b>
        </p>
        {at !== null && <p className="k-legend-card__date">{legendTexts.won(formatDate(at))}</p>}
        <p className="k-legend-card__finale">{campaignTexts['final-battle'].finale}</p>
      </div>
    </section>
  );
}

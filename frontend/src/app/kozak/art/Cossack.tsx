import type { Look } from '../../../domain/kozak/ranks';
import cossackSmall from './cossack/cossack-360.webp';
import cossackLarge from './cossack/cossack-720.webp';
import generalSmall from './cossack/general-360.webp';
import generalLarge from './cossack/general-720.webp';
import hetmanSmall from './cossack/hetman-360.webp';
import hetmanLarge from './cossack/hetman-720.webp';
import officerSmall from './cossack/officer-360.webp';
import officerLarge from './cossack/officer-720.webp';
import recruitSmall from './cossack/recruit-360.webp';
import recruitLarge from './cossack/recruit-720.webp';

// The portraits, 720 px wide and half of that. `make portraits` draws them (e2e/portraits.mjs) and the
// landing shows the same files.
const PORTRAITS: Readonly<Record<Look, readonly [small: string, large: string]>> = {
  recruit: [recruitSmall, recruitLarge],
  cossack: [cossackSmall, cossackLarge],
  officer: [officerSmall, officerLarge],
  general: [generalSmall, generalLarge],
  hetman: [hetmanSmall, hetmanLarge],
};

/**
 * §24.2: the cossack as his rank dresses him, at full height on the maidan of the Sich. A box of
 * another shape crops the picture around the figure (object-fit in kozak.css). A phone shows him
 * across the screen, a wider screen beside his rank in a column of 18rem at most.
 */
export function CossackFigure({ look, label }: { look: Look; label: string }) {
  const [small, large] = PORTRAITS[look];

  return (
    <img
      className="k-figure"
      src={large}
      srcSet={`${small} 360w, ${large} 720w`}
      sizes="(min-width: 40rem) 18rem, 100vw"
      width="720"
      height="960"
      alt={label}
    />
  );
}

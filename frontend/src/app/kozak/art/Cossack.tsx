import type { Look } from '../../../domain/kozak/ranks';

// The portraits by the names `make portraits` gives them (e2e/portraits.mjs); the landing shows the
// same files.
const FILES = import.meta.glob<string>('./cossack/*.webp', { eager: true, import: 'default' });

function file(name: string): string {
  const url = FILES[`./cossack/${name}.webp`];

  if (url === undefined) {
    throw new Error(`cossack/${name}.webp is missing: make portraits draws it.`);
  }

  return url;
}

interface Portrait {
  // 3 : 4, 360 and 720 px wide.
  readonly tall: string;
  // 4 : 3, 640 and 1280 px wide: the same cossack with more of the Sich on both sides.
  readonly wide: string;
  readonly src: string;
}

function portrait(look: Look): Portrait {
  return {
    tall: `${file(`${look}-360`)} 360w, ${file(`${look}-720`)} 720w`,
    wide: `${file(`${look}-wide-640`)} 640w, ${file(`${look}-wide-1280`)} 1280w`,
    src: file(`${look}-wide-1280`),
  };
}

const PORTRAITS: Readonly<Record<Look, Portrait>> = {
  recruit: portrait('recruit'),
  cossack: portrait('cossack'),
  officer: portrait('officer'),
  general: portrait('general'),
  hetman: portrait('hetman'),
};

/**
 * §24.2: the cossack as his rank dresses him, at full height on the maidan of the Sich. Above the
 * rank the picture takes the width of the card and 26.25rem of height at most (kozak.css): the wide
 * portrait covers such a box however wide the card is, cut at its sides only. Beside the rank, in a
 * column of 18rem at most, the tall one fills the column. Either way the box crops the picture around
 * the figure.
 */
export function CossackFigure({ look, label }: { look: Look; label: string }) {
  const { tall, wide, src } = PORTRAITS[look];

  return (
    <picture>
      {/* The column beside the rank opens at 36rem of the screen of the cossack, which 40rem of a
          window always give. */}
      <source media="(min-width: 40rem)" srcSet={tall} sizes="18rem" />
      {/* Covering a box 26.25rem high, the wide picture is 35rem wide. */}
      <img className="k-figure" src={src} srcSet={wide} sizes="35rem" width="1280" height="960" alt={label} />
    </picture>
  );
}

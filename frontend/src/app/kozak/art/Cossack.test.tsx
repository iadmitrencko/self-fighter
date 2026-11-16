import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Look } from '../../../domain/kozak/ranks';
import { CossackFigure } from './Cossack';

const LOOKS: readonly Look[] = ['recruit', 'cossack', 'officer', 'general', 'hetman'];

describe('the portrait of the cossack', () => {
  // `make portraits` draws every look tall and wide, each in two widths.
  it.each(LOOKS)('shows the %s wide above the rank and tall beside it', (look) => {
    const { container } = render(<CossackFigure look={look} label="Козак на майдані Січі." />);
    const image = screen.getByRole('img', { name: 'Козак на майдані Січі.' });
    const source = container.querySelector('picture > source');

    expect(image.getAttribute('srcset')).toMatch(new RegExp(`/${look}-wide-640\\.webp 640w, \\S+/${look}-wide-1280\\.webp 1280w$`));
    expect(source?.getAttribute('media')).toBe('(min-width: 40rem)');
    expect(source?.getAttribute('srcset')).toMatch(new RegExp(`/${look}-360\\.webp 360w, \\S+/${look}-720\\.webp 720w$`));
  });
});

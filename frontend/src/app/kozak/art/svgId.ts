import { useId } from 'react';

// Several pictures on one screen define their own gradients, so their ids must not collide. The
// id of React is made of characters a url(#…) of SVG does not always read, so they are dropped.
export function useSvgId(prefix: string): (name: string) => string {
  const id = `${prefix}${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  return (name) => `${id}-${name}`;
}

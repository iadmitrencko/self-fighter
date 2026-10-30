export function ladderSequence(max: number, returnDown: boolean): number[] {
  const climb = Array.from({ length: max }, (_, index) => index + 1);

  return returnDown ? [...climb, ...climb.slice(0, -1).reverse()] : climb;
}

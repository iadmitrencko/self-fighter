import { NICKNAME_MAX } from './contract';

/**
 * §24.11: the name the player gives the cossack, cleaned as the server cleans it: line breaks and
 * invisible characters become a space and spaces in a row one. An empty name is none, and a name
 * longer than allowed is refused with false. The storages without a server follow the same rule.
 */
export function cleanNickname(text: string | null): string | null | false {
  const clean = (text ?? '').replace(/[\s\p{Cc}\p{Cf}\p{Z}]+/gu, ' ').trim();

  if (clean === '') {
    return null;
  }

  return [...clean].length > NICKNAME_MAX ? false : clean;
}

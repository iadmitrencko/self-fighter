// The ready-made challenge an attempt took while the site had them. The site no longer offers
// challenges (§24.1), yet the format of an attempt keeps the field, so old attempts stay valid.
export interface ChallengeRef {
  readonly slug: string;
  readonly title: string;
}

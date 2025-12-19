export const Skipping = {
  A: 0,
  B: 1,
  C: 10,
  D: 11,
} as const;

export type Skipping = (typeof Skipping)[keyof typeof Skipping];

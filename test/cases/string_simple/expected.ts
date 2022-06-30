export const DNABase = {
  A: "adenine",
  C: "cytosine",
  G: "guanine",
  T: "thymine",
} as const;

export type DNABase = typeof DNABase[keyof typeof DNABase];

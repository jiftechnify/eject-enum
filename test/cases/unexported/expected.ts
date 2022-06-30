export const Exported = {
  EA: 1,
  EB: 2,
} as const;

export type Exported = typeof Exported[keyof typeof Exported];

const Unexported = {
  UA: 11,
  UB: 12,
} as const;

type Unexported = typeof Unexported[keyof typeof Unexported];

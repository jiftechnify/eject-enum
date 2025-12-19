export enum Computed1 {
  Rand = Math.floor(Math.random() * 10),
}

export enum Conputed2 {
  Len = "string".length,
}

const E = {
  X: 0,
} as const;

type E = (typeof E)[keyof typeof E];

export enum RefersOther {
  A = E.X,
}

export declare enum Ambient {
  A,
}

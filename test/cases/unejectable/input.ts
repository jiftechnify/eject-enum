export enum Computed1 {
  Rand = Math.floor(Math.random() * 10),
}

export enum Conputed2 {
  Len = "string".length,
}

enum E {
  X,
}

export enum RefersOther {
  A = E.X,
}

export declare enum Ambient {
  A,
}

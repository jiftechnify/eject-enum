export const ShapeKind = {
  Circle: 0,
  Square: 1,
} as const;

export type ShapeKind = (typeof ShapeKind)[keyof typeof ShapeKind];

export interface Circle {
  kind: typeof ShapeKind.Circle;
  radius: number;
}

export interface Square {
  kind: typeof ShapeKind.Square;
  sideLength: number;
}

// namespace-membered type should be unchanged
export namespace NS {
  export type Circle = 0;
  export type Square = 1;
}

export interface CircleNS {
  kind: NS.Circle;
  radius: number;
}

export interface SquareNS {
  kind: NS.Square;
  sideLength: number;
}
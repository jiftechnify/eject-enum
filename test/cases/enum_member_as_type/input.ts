export enum ShapeKind {
  Circle,
  Square,
}

export interface Circle {
  kind: ShapeKind.Circle;
  radius: number;
}

export interface Square {
  kind: ShapeKind.Square;
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

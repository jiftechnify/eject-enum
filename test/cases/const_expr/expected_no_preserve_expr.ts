export const ConstExpr = {
  Add: 3,
  Sub: 2,
  Mul: 6,
  Div: 5,
  Mod: 4,
  Shl: 8,
  Shr: -16,
  Ushr: 16,
  And: 4608,
  Or: 4660,
  Xor: 9,
  Minus: -3,
  Inv: -1,
  Cat: "abcdef",
  One: 1,
  Two: 2,
  Three: 3,
  Sum: 9301,
} as const;

export type ConstExpr = (typeof ConstExpr)[keyof typeof ConstExpr];

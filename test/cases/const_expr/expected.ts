export const ConstExpr = {
  Add: 3, // 1 + 2
  Sub: 2, // 3 - 1
  Mul: 6, // 2 * 3
  Div: 5, // 10 / 2
  Mod: 4, // 9 % 5
  Shl: 8, // 1 << 3
  Shr: -16, // -32 >> 1
  Ushr: 16, // 32 >>> 1
  And: 4608, // 0x1234 & 0xff00
  Or: 4660, // 0x1200 | 0x34
  Xor: 9, // 0b1100 ^ 0b0101
  Minus: -3, // -(1 + 2)
  Inv: -1, // ~0
  Cat: "abcdef", // "abc" + "def"
  One: 1,
  Two: 2,
  Three: 3, // One + Two
  Sum: 9301, // Add + Sub + Mul + Div + Mod + Shl + Shr + Ushr + And + Or + Xor + Minus + Inv
} as const;

export type ConstExpr = (typeof ConstExpr)[keyof typeof ConstExpr];

export enum ConstExpr {
  Add = 1 + 2,
  Sub = 3 - 1,
  Mul = 2 * 3,
  Div = 10 / 2,
  Mod = 9 % 5,
  Shl = 1 << 3,
  Shr = -32 >> 1,
  Ushr = 32 >>> 1,
  And = 0x1234 & 0xff00,
  Or = 0x1200 | 0x34,
  Xor = 0b1100 ^ 0b0101,
  Minus = -(1 + 2),
  Inv = ~0,
  Cat = "abc" + "def",
  One = 1,
  Two = 2,
  Three = One + Two,
  Sum = Add +
    Sub +
    Mul +
    Div +
    Mod +
    Shl +
    Shr +
    Ushr +
    And +
    Or +
    Xor +
    Minus +
    Inv,
}

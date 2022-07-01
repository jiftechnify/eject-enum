// mysterious leading comment.

/* more leading comment. */
/**
 * Yes or No!
 */
/* hidden comment */
// one more comment
export const YesNo = {
  /** No */
  // nope...
  No: 0,
  /**
   * Yes
   */
  /* yep!!! */
  Yes: 1,
} as const;

export type YesNo = typeof YesNo[keyof typeof YesNo];
/* stray comment... */
/**
 * Three essential colors
 */
export const Colors = {
  Red: "R",
  Green: "G",
  Blue: "B",
} as const;

export type Colors = typeof Colors[keyof typeof Colors];
// some trailing comments...
// and more.

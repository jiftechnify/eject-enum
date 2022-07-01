// mysterious leading comment.

/* more leading comment. */

/**
 * Yes or No!
 */
/* hidden comment */
// one more comment
export enum YesNo {
  /** No */
  // nope...
  No, // this comment will disappear due to the compiler API limitation...
  /**
   * Yes
   */
  /* yep!!! */
  Yes,
}

/* stray comment... */

/**
 * Three essential colors
 */
export enum Colors {
  Red = "R",
  Green = "G",
  Blue = "B",
}

// some trailing comments...
// and more.

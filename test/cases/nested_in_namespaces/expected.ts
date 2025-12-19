/* eslint-disable @typescript-eslint/no-namespace */
export namespace mod {
  /**
   * Yes or No
   */
  export const YesNo = {
    /** No */
    No: 0,
    /** Yes */
    Yes: 1,
  } as const;

  export type YesNo = (typeof YesNo)[keyof typeof YesNo];
  export const yes = YesNo.Yes;

  export function f() {
    const YesNo = {
      No: 0,
      Yes: 1,
    } as const;

    type YesNo = (typeof YesNo)[keyof typeof YesNo];
    return YesNo.No;
  }

  export namespace deepmod {
    /**
     * Kinds of DNA nucleobases.
     */
    export const DNABase = {
      A: "adenine",
      C: "cytosine",
      G: "guanine",
      T: "thymine",
    } as const;

    export type DNABase = (typeof DNABase)[keyof typeof DNABase];
    export const deepFn = () => {
      const YesNo = {
        No: 0,
        Yes: 1,
      } as const;

      type YesNo = (typeof YesNo)[keyof typeof YesNo];
      return YesNo.No;
    };
  }
}

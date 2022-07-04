/* eslint-disable @typescript-eslint/no-namespace */
export namespace mod {
  /**
   * Yes or No
   */
  export enum YesNo {
    /** No */
    No,
    /** Yes */
    Yes,
  }

  export const yes = YesNo.Yes;

  export function f() {
    enum YesNo {
      No,
      Yes,
    }

    return YesNo.No;
  }

  export namespace deepmod {
    /**
     * Kinds of DNA nucleobases.
     */
    export enum DNABase {
      A = "adenine",
      C = "cytosine",
      G = "guanine",
      T = "thymine",
    }

    export const deepFn = () => {
      enum YesNo {
        No,
        Yes,
      }

      return YesNo.No;
    };
  }
}

/* eslint-disable @typescript-eslint/no-namespace */
export namespace mod {
  export enum YesNo {
    No,
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

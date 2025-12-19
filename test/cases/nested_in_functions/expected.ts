export function f1() {
  const YesNo = {
    No: 0,
    Yes: 1,
  } as const;

  type YesNo = (typeof YesNo)[keyof typeof YesNo];
  return YesNo.No;
}

export const f2 = () => {
  const YesNo = {
    No: 0,
    Yes: 1,
  } as const;

  type YesNo = (typeof YesNo)[keyof typeof YesNo];
  return YesNo.Yes;
};

export const f3 = () => {
  const YesNo = {
    No: 0,
    Yes: 1,
  } as const;

  type YesNo = (typeof YesNo)[keyof typeof YesNo];
  return YesNo.No;
};

export const obj = {
  objMethod() {
    const YesNo = {
      No: 0,
      Yes: 1,
    } as const;

    type YesNo = (typeof YesNo)[keyof typeof YesNo];
    return YesNo.Yes;
  },
  arrow: () => {
    const YesNo = {
      No: 0,
      Yes: 1,
    } as const;

    type YesNo = (typeof YesNo)[keyof typeof YesNo];
    return YesNo.No;
  },
};

export class C {
  constructor() {
    const YesNo = {
      No: 0,
      Yes: 1,
    } as const;

    type YesNo = (typeof YesNo)[keyof typeof YesNo];
    console.log(YesNo.Yes);
  }

  public classMethod() {
    const YesNo = {
      No: 0,
      Yes: 1,
    } as const;

    type YesNo = (typeof YesNo)[keyof typeof YesNo];
    return YesNo.No;
  }
}

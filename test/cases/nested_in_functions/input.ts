export function f1() {
  enum YesNo {
    No,
    Yes,
  }
  return YesNo.No;
}

export const f2 = () => {
  enum YesNo {
    No,
    Yes,
  }
  return YesNo.Yes;
};

export const f3 = () => {
  enum YesNo {
    No,
    Yes,
  }
  return YesNo.No;
};

export const obj = {
  objMethod() {
    enum YesNo {
      No,
      Yes,
    }
    return YesNo.Yes;
  },
  arrow: () => {
    enum YesNo {
      No,
      Yes,
    }
    return YesNo.No;
  },
};

export class C {
  constructor() {
    enum YesNo {
      No,
      Yes,
    }
    console.log(YesNo.Yes);
  }

  public classMethod() {
    enum YesNo {
      No,
      Yes,
    }
    return YesNo.No;
  }
}

export const YesNo = {
  No: 0,
  Yes: 1,
} as const;

export type YesNo = (typeof YesNo)[keyof typeof YesNo];

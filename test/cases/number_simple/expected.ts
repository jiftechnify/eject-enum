export const Gender = {
  Male: 1,
  Female: 2,
  Others: 10,
} as const;

export type Gender = (typeof Gender)[keyof typeof Gender];

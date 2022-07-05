import { describe, expect, test } from "vitest";
import { EjectEnumTarget } from "../src/EjectEnum";
import { targetFromArgv } from "../src/main";

describe("targetFromArgv", () => {
  test("--project -> EjectTarget.tsConfig", () => {
    const argv = {
      project: ["tsconfig.json", "tsconfig2.json"],
      include: [],
      exclude: [],
    };
    expect(targetFromArgv(argv)).toEqual(
      EjectEnumTarget.tsConfig(argv.project)
    );
  });

  test("--include / --exclude -> EjectTarget.paths", () => {
    const argv = {
      project: [],
      include: ["src/**/*", "test/**/*"],
      exclude: ["src/hoge/*.ts", "src/fuga.ts"],
    };
    expect(targetFromArgv(argv)).toEqual(
      EjectEnumTarget.paths({
        include: argv.include,
        exclude: argv.exclude,
      })
    );
  });

  test("--project wins if --project and --include / --exclude are both specified", () => {
    const argv = {
      project: ["tsconfig.json", "tsconfig2.json"],
      include: ["src/**/*", "test/**/*"],
      exclude: ["src/hoge/*.ts", "src/fuga.ts"],
    };
    expect(targetFromArgv(argv)).toEqual(
      EjectEnumTarget.tsConfig(argv.project)
    );
  });

  test("throws if neither --project nor --include is specified", () => {
    const argv = {
      project: [],
      include: [],
      exclude: ["hoge"],
    };
    expect(() => {
      targetFromArgv(argv);
    }).toThrow();
  });
});

import { describe, expect, test } from "vitest";
import { EjectTarget } from "../src/EjectEnum";
import { optionsFromArgv } from "../src/main";

describe("optionsFromArgv", () => {
  test("--project -> EjectTarget.tsConfig", () => {
    const argv = {
      project: ["tsconfig.json", "tsconfig2.json"],
      include: [],
      exclude: [],
    };
    expect(optionsFromArgv(argv)).toEqual({
      target: EjectTarget.tsConfig(argv.project),
    });
  });

  test("--include / --exclude -> EjectTarget.paths", () => {
    const argv = {
      project: [],
      include: ["src/**/*", "test/**/*"],
      exclude: ["src/hoge/*.ts", "src/fuga.ts"],
    };
    expect(optionsFromArgv(argv)).toEqual({
      target: EjectTarget.paths({
        include: argv.include,
        exclude: argv.exclude,
      }),
    });
  });

  test("--project wins if --project and --include / --exclude are both specified", () => {
    const argv = {
      project: ["tsconfig.json", "tsconfig2.json"],
      include: ["src/**/*", "test/**/*"],
      exclude: ["src/hoge/*.ts", "src/fuga.ts"],
    };
    expect(optionsFromArgv(argv)).toEqual({
      target: EjectTarget.tsConfig(argv.project),
    });
  });

  test("throws if neither --project nor --include is specified", () => {
    const argv = {
      project: [],
      include: [],
      exclude: ["hoge"],
    };
    expect(() => {
      optionsFromArgv(argv);
    }).toThrow();
  });
});

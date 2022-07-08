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
    expect(targetFromArgv(argv, [])).toEqual(
      EjectEnumTarget.tsConfig(argv.project)
    );
  });

  test("consider JSON files in positional args as TS configs", () => {
    const argv = {
      project: ["tsconfig.project.json"],
      include: [],
      exclude: [],
    };
    expect(targetFromArgv(argv, ["tsconfig.positional.json"])).toEqual(
      EjectEnumTarget.tsConfig([
        "tsconfig.project.json",
        "tsconfig.positional.json",
      ])
    );
  });

  test("--include / --exclude -> EjectTarget.paths", () => {
    const argv = {
      project: [],
      include: ["src/**/*", "test/**/*"],
      exclude: ["src/hoge/*.ts", "src/fuga.ts"],
    };
    expect(targetFromArgv(argv, [])).toEqual(
      EjectEnumTarget.paths({
        include: argv.include,
        exclude: argv.exclude,
      })
    );
  });

  test("consider non-JSON paths in positional args as include paths", () => {
    const argv = {
      project: [],
      include: ["src/include/**"],
      exclude: ["src/exclude/**"],
    };
    expect(targetFromArgv(argv, ["src/positional/**"])).toEqual(
      EjectEnumTarget.paths({
        include: ["src/include/**", "src/positional/**"],
        exclude: ["src/exclude/**"],
      })
    );
  });

  test("--project wins if --project and --include / --exclude are both specified", () => {
    const argv = {
      project: ["tsconfig.json", "tsconfig2.json"],
      include: ["src/**/*", "test/**/*"],
      exclude: ["src/hoge/*.ts", "src/fuga.ts"],
    };
    expect(targetFromArgv(argv, [])).toEqual(
      EjectEnumTarget.tsConfig(argv.project)
    );
  });

  test("positionals: JSON files win against non-JSONs", () => {
    const argv = {
      project: [],
      include: [],
      exclude: [],
    };
    expect(
      targetFromArgv(argv, [
        "src/hoge/**",
        "tsconfig.json",
        "src/fuga/**",
        "tsconfig2.json",
      ])
    ).toEqual(EjectEnumTarget.tsConfig(["tsconfig.json", "tsconfig2.json"]));
  });

  test("throws if no targets are specified", () => {
    const argv = {
      project: [],
      include: [],
      exclude: ["hoge"],
    };
    expect(() => {
      targetFromArgv(argv, []);
    }).toThrow();
  });
});

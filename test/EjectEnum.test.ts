import { fail } from "node:assert";
import { IndentationText, Project } from "ts-morph";
import { describe, expect, test, vi } from "vitest";
import { ejectEnumFromSourceFile } from "../src/EjectEnum";

const TEST_CASES_DIR = "test/cases";

const initProject = () => {
  return new Project({
    manipulationSettings: { indentationText: IndentationText.TwoSpaces },
  });
};

const testOptions = {
  silent: true,
  preserveExpr: true,
};

const testProjCtx = {
  options: testOptions,
  progLogger: undefined,
};

describe.concurrent("ejectEnumFromSourceFile", () => {
  test.each([
    "number_simple",
    "number_omit_initializer",
    "number_skipping_initializer",
    "string_simple",
    "const_expr",
    "unexported",
    "comments",
    "nested_in_functions",
    "nested_in_namespaces",
    "unejectable",
  ])("converts each enum in source file to equivalent object + type alias [%s]", (testCase) => {
    const project = initProject();
    project.addSourceFilesAtPaths(`${TEST_CASES_DIR}/${testCase}/*.ts`);

    const inputSrc = project.getSourceFile("input.ts");
    const expSrc = project.getSourceFile("expected.ts");
    if (inputSrc === undefined || expSrc === undefined) {
      fail("input or expected source file is missing");
    }

    ejectEnumFromSourceFile(inputSrc, testProjCtx);
    const ejected = inputSrc.getFullText();

    expSrc.formatText();
    const expected = expSrc.getFullText();

    expect(ejected).toEqual(expected);
  });

  test("not preserve expression if `preserveExpr` is false", () => {
    const project = initProject();
    project.addSourceFilesAtPaths(`${TEST_CASES_DIR}/const_expr/*.ts`);

    const inputSrc = project.getSourceFile("input.ts");
    const expSrc = project.getSourceFile("expected_no_preserve_expr.ts");
    if (inputSrc === undefined || expSrc === undefined) {
      fail("input or expected source file is missing");
    }

    ejectEnumFromSourceFile(inputSrc, {
      ...testProjCtx,
      options: { ...testOptions, preserveExpr: false },
    });
    const ejected = inputSrc.getFullText();

    expSrc.formatText();
    const expected = expSrc.getFullText();

    expect(ejected).toEqual(expected);
  });

  test("format source file if conversion happened", () => {
    const project = initProject();
    const srcFile = project.createSourceFile("test.ts", `enum Test { A, B }`);

    const fmtSpy = vi.spyOn(srcFile, "formatText");

    ejectEnumFromSourceFile(srcFile, testProjCtx);

    expect(fmtSpy).toHaveBeenCalled();
  });

  test("don't format source file if conversion didn't happen", () => {
    const project = initProject();
    const srcFile = project.createSourceFile("test.ts", `const x = 1`);

    const fmtSpy = vi.spyOn(srcFile, "formatText");

    ejectEnumFromSourceFile(srcFile, testProjCtx);

    expect(fmtSpy).not.toHaveBeenCalled();
  });
});

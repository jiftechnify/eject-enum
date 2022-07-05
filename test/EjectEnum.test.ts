import { fail } from "assert";
import { IndentationText, Project } from "ts-morph";
import { describe, expect, test, vi } from "vitest";
import { ejectEnumFromSourceFile } from "../src/EjectEnum";

const TEST_CASES_DIR = "test/cases";

const initProject = () => {
  return new Project({
    manipulationSettings: { indentationText: IndentationText.TwoSpaces },
  });
};

describe.concurrent("ejectEnumFromSourceFile", () => {
  test.each([
    "number_simple",
    "number_omit_initializer",
    "number_skipping_initializer",
    "number_const_expr",
    "string_simple",
    "unexported",
    "comments",
    "nested_in_functions",
    "nested_in_namespaces",
    "unejectable",
  ])(
    "converts each enum in source file to equivalent object + type alias [%s]",
    (testCase) => {
      const project = initProject();
      project.addSourceFilesAtPaths(`${TEST_CASES_DIR}/${testCase}/*.ts`);

      const inputSrc = project.getSourceFile("input.ts");
      const expSrc = project.getSourceFile("expected.ts");
      if (inputSrc === undefined || expSrc === undefined) {
        fail("input or expected source file is missing");
      }

      ejectEnumFromSourceFile(inputSrc);
      const ejected = inputSrc.getFullText();

      expSrc.formatText();
      const expected = expSrc.getFullText();

      expect(ejected).toEqual(expected);
    }
  );

  test("format source file if conversion happend", () => {
    const project = initProject();
    const srcFile = project.createSourceFile("test.ts", `enum Test { A, B }`);

    const fmtSpy = vi.spyOn(srcFile, "formatText");

    ejectEnumFromSourceFile(srcFile);

    expect(fmtSpy).toHaveBeenCalled();
  });

  test("don't format source file if conversion didn't happen", () => {
    const project = initProject();
    const srcFile = project.createSourceFile("test.ts", `const x = 1`);

    const fmtSpy = vi.spyOn(srcFile, "formatText");

    ejectEnumFromSourceFile(srcFile);

    expect(fmtSpy).not.toHaveBeenCalled();
  });
});

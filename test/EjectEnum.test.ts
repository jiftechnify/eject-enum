import { fail } from "assert";
import { IndentationText, Project } from "ts-morph";
import { describe, expect, test } from "vitest";
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
});

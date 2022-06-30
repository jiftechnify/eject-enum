import { fail } from "assert";
import fs from "fs-extra";
import { Project } from "ts-morph";
import { describe, expect, test } from "vitest";
import { ejectEnumFromSourceFile } from "../src/EjectEnum";

const TEST_CASES_DIR = "test/cases";

describe("ejectEnumFromSourceFile", () => {
  test("converts each enum in source file to equivalent object + type alias", () => {
    const testCases = fs.readdirSync(TEST_CASES_DIR);

    for (const testCase of testCases) {
      const project = new Project();
      project.addSourceFilesAtPaths(`${TEST_CASES_DIR}/${testCase}/*.ts`);

      const inputSrc = project.getSourceFile("input.ts");
      const expSrc = project.getSourceFile("expected.ts");
      if (inputSrc === undefined || expSrc === undefined) {
        fail("input or expected source file is missing");
      }

      ejectEnumFromSourceFile(inputSrc);
      const ejected = inputSrc.getText();

      expSrc.formatText();
      const expected = expSrc.getText();

      expect(ejected).toEqual(expected);
    }
  });
});

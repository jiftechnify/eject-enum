import {
  CodeBlockWriter,
  EnumDeclaration,
  EnumMember,
  Project,
  SourceFile,
  SyntaxKind,
  VariableDeclarationKind,
} from "ts-morph";

/**
 * Options of {@link ejectEnum}.
 */
export type EjectEnumOptions = {
  /**
   * Paths for files to convert.
   *
   * You can specify paths as well as globs.
   */
  targetPaths: readonly string[];

  /**
   * If `true`, it overwrites target files with converted codes.
   *
   * If `false`, it only shows conversion results to the console and no overwrite happens.
   */
  write?: boolean;
};

/**
 * Ejects enums from all files specified by `targetPaths`.
 *
 * Each enum is converted to an "idiomatic alternative". for example:
 *
 * ```
 * // before conversion
 * enum YesNo {
 *   No,
 *   Yes,
 * }
 *
 * // after conversion
 * const YesNo = {
 *   No: 0,
 *   Yes: 1,
 * } as const;
 *
 * type YesNo = typeof YesNo[keyof typeof YesNo];
 * ```
 *
 * For the details of options, refer the documentation: {@link EjectEnumOptions}.
 */
export function ejectEnum({ targetPaths, write = false }: EjectEnumOptions) {
  const project = new Project();
  project.addSourceFilesAtPaths(targetPaths);

  for (const srcFile of project.getSourceFiles()) {
    ejectEnumFromSourceFile(srcFile);

    if (!write) {
      console.log(`${srcFile.getFilePath()}:`);
      console.log(srcFile.getText());
    }
  }

  if (write) {
    project.saveSync();
  }
}

// Ejects enums from single source file.  It is exported for the purpose of testing.
export function ejectEnumFromSourceFile(srcFile: SourceFile) {
  let seenEnumCnt = 0;
  srcFile.getStatements().forEach((stmt, i) => {
    const enumDecl = stmt.asKind(SyntaxKind.EnumDeclaration);

    if (enumDecl === undefined) {
      return;
    }
    // skipping ambient enums for now, as we can't get member's value from them
    if (enumDecl.hasDeclareKeyword()) {
      return;
    }

    convertEnumDeclaration(srcFile, enumDecl, i + seenEnumCnt);
    seenEnumCnt++;
  });

  srcFile.formatText();
}

function convertEnumDeclaration(
  srcFile: SourceFile,
  enumDecl: EnumDeclaration,
  idx: number
) {
  const { name, isExported } = enumDecl.getStructure();
  const members = enumDecl.getMembers();

  // insert a variable declaration whose initializer is an object literal equivalent to the target enum
  srcFile.insertVariableStatement(idx, {
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
      {
        name,
        initializer: enumEquivObjLitWriter(members),
      },
    ],
    leadingTrivia: [
      /* TODO */
    ],
    trailingTrivia: [
      /* TODO */
    ],
    isExported: isExported ?? false,
  });

  // insert a type alias declaration of an enum-equivalent type after the object variable decl.
  srcFile.insertTypeAlias(idx + 1, {
    name,
    type: `typeof ${name}[keyof typeof ${name}]`,
    isExported: isExported ?? false,
    leadingTrivia: [
      /* TODO */
    ],
  });

  // remove the original enum decl.
  enumDecl.remove();
}

function enumEquivObjLitWriter(
  enumMembers: EnumMember[]
): (writer: CodeBlockWriter) => void {
  return (writer) => {
    writer
      .inlineBlock(() => {
        enumMembers.forEach((m) => {
          const value = m.getValue();
          switch (typeof value) {
            case "number":
              writer.writeLine(`${m.getName()}: ${value},`);
              break;
            case "string":
              writer
                .write(`${m.getName()}: `)
                .quote()
                .write(value)
                .quote()
                .write(",")
                .newLine();
              break;
            default:
              break;
          }
        });
      })
      .space()
      .write("as const");
  };
}

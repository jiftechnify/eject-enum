import path from "path";
import {
  CaseOrDefaultClause,
  CodeBlockWriter,
  CommentRange,
  EnumDeclaration,
  EnumMember,
  Node,
  Project,
  SourceFile,
  StatementedNode,
  SyntaxKind,
  VariableDeclarationKind,
} from "ts-morph";

/**
 * Options of {@link ejectEnum}.
 */
export type EjectEnumOptions = {
  /**
   * Conversion target specification.
   */
  target: EjectTarget;
};

/**
 * Target of the conversion. You can specify one of:
 *
 * - Paths to TS config files (`EjectTarget.tsConfig`)
 * - Paths to include in / exclude from the conversion (`EjectTarget.paths`)
 */
export type EjectTarget =
  | {
      t: "tsconfig";
      tsConfigPaths: readonly string[];
    }
  | {
      t: "raw-paths";
      includePaths: readonly string[];
      excludePaths: readonly string[];
    };

export const EjectTarget = {
  /**
   * Specifies TS config paths as the target of the converision.
   *
   * @param paths Paths to TS config files for the coversion target projects.
   */
  tsConfig(paths: readonly string[]): EjectTarget {
    return {
      t: "tsconfig",
      tsConfigPaths: paths,
    };
  },

  /**
   * Directly specifies paths to include in (and optionally exclude from) the target of the conversion.
   *
   * @param paths Target paths specification.
   * @param paths.include Paths or globs to the files to convert.
   * @param paths.exclude Paths or globs to the files that should be excluded from the conversion.
   */
  paths({
    include,
    exclude = [],
  }: {
    include: readonly string[];
    exclude?: readonly string[];
  }): EjectTarget {
    return {
      t: "raw-paths",
      includePaths: include,
      excludePaths: exclude,
    };
  },
} as const;

function addSourceFilesInTarget(project: Project, target: EjectTarget) {
  switch (target.t) {
    case "tsconfig":
      for (const tsConf of target.tsConfigPaths) {
        project.addSourceFilesFromTsConfig(tsConf);
      }
      break;
    case "raw-paths":
      project.addSourceFilesAtPaths([
        ...target.includePaths,
        ...target.excludePaths.map((path) => `!${path}`),
      ]);
  }
}

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
export function ejectEnum({ target }: EjectEnumOptions) {
  const project = new Project();
  addSourceFilesInTarget(project, target);

  for (const srcFile of project.getSourceFiles()) {
    ejectEnumFromSourceFile(srcFile);
  }
  project.saveSync();
}

// Ejects enums from single source file.  It is exported for the purpose of testing.
export function ejectEnumFromSourceFile(srcFile: SourceFile) {
  // convert top-level statements
  ejectEnumFromStatementedNode(srcFile, srcFile);

  // convert nested statements
  srcFile.forEachDescendant(statementedNodesVisitor(srcFile));

  srcFile.formatText();
}

function statementedNodesVisitor(
  parentSrcFile: SourceFile
): (node: Node) => void {
  return (node: Node) => {
    if (Node.isBlock(node) || Node.isModuleBlock(node)) {
      // body of function-like, `if`, `while`, `namespace`, and `case` / `default` clause in `switch` with explicit block
      ejectEnumFromStatementedNode(node as StatementedNode, parentSrcFile);
    } else if (
      (Node.isCaseClause(node) || Node.isDefaultClause(node)) &&
      node.getChildrenOfKind(SyntaxKind.Block).length === 0
    ) {
      // `case` or `default` clause in `switch` without explicit block
      ejectEnumFromStatementedNode(node as CaseOrDefaultClause, parentSrcFile);
    }
  };
}

// Ejects enums from a StatementedNode (a node that has a block of statements).
function ejectEnumFromStatementedNode(
  node: StatementedNode,
  parentSrcFile: SourceFile
) {
  node.getEnums().forEach((enumDecl) => {
    if (!isEjectableEnum(enumDecl)) {
      console.error(
        `${path.relative(
          process.cwd(),
          parentSrcFile.getFilePath()
        )} > ${enumDecl.getName()}: it has a member whose value can't be known at compile-time. skipped.`
      );
      return;
    }

    convertEnumDeclaration(node, enumDecl, enumDecl.getChildIndex());
  });
}

function isEjectableEnum(enumDecl: EnumDeclaration): boolean {
  return enumDecl
    .getMembers()
    .map((m) => m.getValue())
    .every((v) => v !== undefined);
}

function convertEnumDeclaration(
  parent: StatementedNode,
  enumDecl: EnumDeclaration,
  idx: number
) {
  const { name, isExported, docs } = enumDecl.getStructure();
  const members = enumDecl.getMembers();
  const hasDocs = docs !== undefined && docs.length > 0;

  // insert a variable declaration whose initializer is an object literal equivalent to the target enum
  parent.insertVariableStatement(idx, {
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
      {
        name,
        initializer: enumEquivObjLitWriter(members),
      },
    ],
    leadingTrivia: hasDocs
      ? commentWriter(getLeadingCommentsAssociatedWithDecl(enumDecl))
      : "",
    isExported: isExported ?? false,
  });

  // insert a type alias declaration of an enum-equivalent type after the object variable decl.
  parent.insertTypeAlias(idx + 1, {
    name,
    type: `typeof ${name}[keyof typeof ${name}]`,
    isExported: isExported ?? false,
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
          // copy leading comments for the member
          commentWriter(m.getLeadingCommentRanges())(writer);

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

// Writer function that writes code comments based on `CommentRange`s.
function commentWriter(
  comments: CommentRange[]
): (writer: CodeBlockWriter) => void {
  return (writer) => {
    comments
      .map((c) => c.getText())
      .forEach((c) => {
        const lines = c.split("\n");
        if (lines.length === 0) {
          return;
        }

        // Write a first line of the comment.
        writer.writeLine(lines[0] as string);

        // Write 2nd and subsequent lines of the multi-line comment.
        // To preserve indentation and alignment, trim an indentation text from the line and prepend single whitespace to it.
        lines
          .slice(1)
          .forEach((l) => writer.space().write(l.trimStart()).newLine());
      });
  };
}

// Get leading comments that are considered to be associated with the EnumDeclaration.
// To be exact, first doc comment (starts with `/**`) and all the comments below that.
// Comments above that doc comment are considered to be independent of the EnumDecl in the context of statement indexing.
function getLeadingCommentsAssociatedWithDecl(
  enumDecl: EnumDeclaration
): CommentRange[] {
  const firstDocIdx = enumDecl
    .getLeadingCommentRanges()
    .findIndex((cr) => cr.getText().startsWith("/**"));
  return firstDocIdx >= 0
    ? enumDecl.getLeadingCommentRanges().slice(firstDocIdx)
    : [];
}

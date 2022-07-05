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
import { initProgressLogger, ProgressLogger } from "./ProgressLogger";

/**
 * Target of the conversion. You can specify one of:
 *
 * - Paths to TS config files (`EjectTarget.tsConfig`)
 * - Paths to include in / exclude from the conversion (`EjectTarget.paths`)
 */
export type EjectEnumTarget =
  | {
      t: "tsconfig";
      tsConfigPaths: readonly string[];
    }
  | {
      t: "raw-paths";
      includePaths: readonly string[];
      excludePaths: readonly string[];
    };

export const EjectEnumTarget = {
  /**
   * Specifies TS config paths as the target of the converision.
   *
   * @param paths Paths to TS config files for the coversion target projects.
   */
  tsConfig(paths: readonly string[]): EjectEnumTarget {
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
  }): EjectEnumTarget {
    return {
      t: "raw-paths",
      includePaths: include,
      excludePaths: exclude,
    };
  },
} as const;

function addSourceFilesInTarget(project: Project, target: EjectEnumTarget) {
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
 * Additional options for the conversion.
 */
export type EjectEnumOptions = {
  /**
   * If `true`, all outputs are suppressed.
   *
   * @defaultValue `false`
   */
  silent?: boolean;
};

/**
 * Ejects enums from all files specified by `target`.
 *
 * Each enum is converted to {@link https://www.typescriptlang.org/docs/handbook/enums.html#objects-vs-enums | the safer alternative}. for example:
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
 * @param target Target specification of the conversion.
 * @param options Additional options for the conversion.
 */
export function ejectEnum(
  target: EjectEnumTarget,
  { silent = false }: EjectEnumOptions = {}
) {
  const project = new Project();
  addSourceFilesInTarget(project, target);

  const progLogger = initProgressLogger(silent);
  progLogger.start(project.getSourceFiles().length);

  for (const srcFile of project.getSourceFiles()) {
    ejectEnumFromSourceFile(srcFile, progLogger);
  }

  progLogger.finish();

  project.saveSync();
}

// Ejects enums from single source file.  It is exported for the purpose of testing.
export function ejectEnumFromSourceFile(
  srcFile: SourceFile,
  progLogger?: ProgressLogger
) {
  const ctx: EjectionContext = {
    rootSrcFile: srcFile,
    probe: new EjectionProbe(),
    progLogger,
  };

  // convert top-level statements
  ejectEnumFromStatementedNode(srcFile, ctx);
  // convert nested statements
  srcFile.forEachDescendant(statementedNodesVisitor(ctx));

  if (ctx.probe.ejected) {
    const n = ctx.probe.numEjected;
    ctx.progLogger?.log(
      `${path.relative(
        process.cwd(),
        ctx.rootSrcFile.getFilePath()
      )}: ejected ${n} enum${n >= 2 ? "s" : ""}.`
    );

    // format file only if at least one ejection happened.
    srcFile.formatText();
  }
  ctx.progLogger?.notifyFinishFile();
}

function statementedNodesVisitor(ctx: EjectionContext): (node: Node) => void {
  return (node: Node) => {
    if (Node.isBlock(node) || Node.isModuleBlock(node)) {
      // body of function-like, `if`, `while`, `namespace`, and `case` / `default` clause in `switch` with explicit block
      ejectEnumFromStatementedNode(node as StatementedNode, ctx);
    } else if (
      (Node.isCaseClause(node) || Node.isDefaultClause(node)) &&
      node.getChildrenOfKind(SyntaxKind.Block).length === 0
    ) {
      // `case` or `default` clause in `switch` without explicit block
      ejectEnumFromStatementedNode(node as CaseOrDefaultClause, ctx);
    }
  };
}

// Ejects enums from a StatementedNode (a node that has a block of statements).
function ejectEnumFromStatementedNode(
  node: StatementedNode,
  ctx: EjectionContext
) {
  for (const enumDecl of node.getEnums()) {
    if (!isEjectableEnum(enumDecl)) {
      ctx.progLogger?.log(
        `${path.relative(
          process.cwd(),
          ctx.rootSrcFile.getFilePath()
        )} > ${enumDecl.getName()}: it has a member whose value can't be known at compile-time. skipped.`
      );
      continue;
    }

    convertEnumDeclaration(node, enumDecl, enumDecl.getChildIndex());
    ctx.probe.notifyEjected();
  }
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

// Object to detect an ejection of enum.
class EjectionProbe {
  #numEjected: number;

  constructor() {
    this.#numEjected = 0;
  }

  get ejected(): boolean {
    return this.#numEjected > 0;
  }

  get numEjected(): number {
    return this.#numEjected;
  }

  notifyEjected() {
    this.#numEjected++;
  }
}

// Context of the conversion of single source file.
type EjectionContext = {
  rootSrcFile: SourceFile;
  probe: EjectionProbe;
  progLogger: ProgressLogger | undefined;
};

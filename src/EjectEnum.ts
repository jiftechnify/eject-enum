import * as path from "node:path";
import {
  type CodeBlockWriter,
  type CommentRange,
  type EnumDeclaration,
  type EnumMember,
  IndentationText,
  type InitializerExpressionGetableNode,
  Node,
  Project,
  type PropertySignature,
  type SourceFile,
  type StatementedNode,
  SyntaxKind,
  type TypeElementMemberedNode,
  VariableDeclarationKind,
} from "ts-morph";
import { initProgressLogger, type ProgressLogger } from "./ProgressLogger";

/**
 * Target of the rewrite. You can specify one of:
 *
 * - Paths to projects' tsconfig files to rewrite (`EjectEnumTarget.projects`)
 * - Paths to include into / exclude from the rewrite target (`EjectEnumTarget.srcPaths`)
 */
export type EjectEnumTarget =
  | {
      t: "projects";
      tsConfigPaths: readonly string[];
    }
  | {
      t: "src-paths";
      includePaths: readonly string[];
      excludePaths: readonly string[];
    };

export const EjectEnumTarget = {
  /**
   * Specifies projects' tsconfig paths as the rewrite target.
   *
   * @param tsconfigPaths tsconfig paths for projects to rewrite.
   */
  projects(tsconfigPaths: readonly string[]): EjectEnumTarget {
    return {
      t: "projects",
      tsConfigPaths: tsconfigPaths,
    };
  },

  /**
   * Directly specifies source file paths to include into (and optionally exclude from) the rewrite targets.
   *
   * @param paths Target paths specification.
   * @param paths.include Paths or globs to the files to rewrite.
   * @param paths.exclude Paths or globs to the files that should be excluded from the rewrite target.
   */
  srcPaths({ include, exclude = [] }: { include: readonly string[]; exclude?: readonly string[] }): EjectEnumTarget {
    return {
      t: "src-paths",
      includePaths: include,
      excludePaths: exclude,
    };
  },
} as const;

function addSourceFilesInTarget(project: Project, target: EjectEnumTarget) {
  switch (target.t) {
    case "projects":
      for (const tsConf of target.tsConfigPaths) {
        project.addSourceFilesFromTsConfig(tsConf);
      }
      break;
    case "src-paths":
      project.addSourceFilesAtPaths([...target.includePaths, ...target.excludePaths.map((path) => `!${path}`)]);
  }
}

/**
 * Additional options for the rewrite.
 */
export type EjectEnumOptions = {
  /**
   * If `true`, all outputs are suppressed.
   *
   * @defaultValue `false`
   */
  silent?: boolean;

  /**
   * If `true`, the expression of each enum member's initializer is preserved as trailing comment if the expression is not a literal.
   *
   * For example:
   * ```
   * // original
   * enum E {
   *   X = (1 + 2) * (3 + 4)
   * }
   * // ejected
   * const E = {
   *   X: 21 // (1 + 2) * (3 + 4)
   * } as const;
   *
   * type E = // snip
   * ```
   *
   * @defaultValue `true`
   */
  preserveExpr?: boolean;
};

/**
 * Ejects enums from all files specified by `target`.
 *
 * Rewrites each enum found in the target to {@link https://www.typescriptlang.org/docs/handbook/enums.html#objects-vs-enums | the safer alternative}. for example:
 *
 * ```
 * // before rewrite
 * enum YesNo {
 *   No,
 *   Yes,
 * }
 *
 * // after rewrite
 * const YesNo = {
 *   No: 0,
 *   Yes: 1,
 * } as const;
 *
 * type YesNo = typeof YesNo[keyof typeof YesNo];
 * ```
 *
 * @param target Target specification of the rewrite.
 * @param options Additional options for the rewrite.
 */
export async function ejectEnum(
  target: EjectEnumTarget,
  { silent = false, preserveExpr = true }: EjectEnumOptions = {},
) {
  const project = new Project({
    manipulationSettings: { indentationText: IndentationText.TwoSpaces },
  });
  addSourceFilesInTarget(project, target);

  const ctx: ProjectEjectionContext = {
    progLogger: initProgressLogger(silent),
    options: { silent, preserveExpr },
  };

  ctx.progLogger?.start(project.getSourceFiles().length);

  for (const srcFile of project.getSourceFiles()) {
    ejectEnumFromSourceFile(srcFile, ctx);
  }

  ctx.progLogger?.finish();

  await project.save();
}

// Ejects enums from single source file.  It is exported for the purpose of testing.
export function ejectEnumFromSourceFile(srcFile: SourceFile, projCtx: ProjectEjectionContext) {
  const ctx: FileEjectionContext = {
    ...projCtx,
    rootSrcFile: srcFile,
    probe: new EjectionProbe(),
  };

  // rewrite enum-member typed properties
  //
  // NOTE: must be done before rewriting enums themselves,
  // bacause rewriting enums removes them entirely and causes dangling references to enum members.
  srcFile.forEachDescendant(visitAndRewriteTypeElementMemberedNodes(ctx));

  // rewrite top-level statements
  ejectEnumFromStatementedNode(srcFile, ctx);
  // rewrite nested statements
  srcFile.forEachDescendant(visitAndRewriteStatementedNodes(ctx));

  if (ctx.probe.ejected) {
    const n = ctx.probe.numEjected;
    ctx.progLogger?.log(
      `${path.relative(process.cwd(), ctx.rootSrcFile.getFilePath())}: ejected ${n} enum${n >= 2 ? "s" : ""}.`,
    );

    // format file only if at least one ejection happened.
    srcFile.formatText();
  }
  ctx.progLogger?.notifyFinishFile();
}

function visitAndRewriteStatementedNodes(ctx: FileEjectionContext): (node: Node) => void {
  return (node: Node) => {
    if (Node.isStatemented(node)) {
      ejectEnumFromStatementedNode(node, ctx);
    }
  };
}

// Ejects enums from a StatementedNode (a node that has a block of statements).
function ejectEnumFromStatementedNode(node: StatementedNode, ctx: FileEjectionContext) {
  for (const enumDecl of node.getEnums()) {
    if (!isEjectableEnum(enumDecl)) {
      ctx.progLogger?.log(
        `${path.relative(
          process.cwd(),
          ctx.rootSrcFile.getFilePath(),
        )} > ${enumDecl.getName()}: it has a member whose value can't be known at compile-time. skipped.`,
      );
      continue;
    }

    rewriteEnumDeclaration(node, enumDecl, ctx);
    ctx.probe.notifyEjected();
  }
}

function isEjectableEnum(enumDecl: EnumDeclaration): boolean {
  return enumDecl
    .getMembers()
    .map((m) => m.getValue())
    .every((v) => v !== undefined);
}

function rewriteEnumDeclaration(parent: StatementedNode, enumDecl: EnumDeclaration, ctx: FileEjectionContext) {
  const idx = enumDecl.getChildIndex();
  const members = enumDecl.getMembers();
  const { name, isExported, docs } = enumDecl.getStructure();
  const hasDocs = docs !== undefined && docs.length > 0;

  // insert a variable declaration whose initializer is an object literal equivalent to the target enum
  parent.insertVariableStatement(idx, {
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
      {
        name,
        initializer: enumEquivObjLitWriter(members, ctx),
      },
    ],
    leadingTrivia: hasDocs ? commentWriter(leadingCommentsAssociatedWithDecl(enumDecl)) : "",
    isExported: isExported ?? false,
  });

  // insert a type alias declaration of an enum-equivalent type after the object variable decl.
  parent.insertTypeAlias(idx + 1, {
    name,
    type: `(typeof ${name})[keyof typeof ${name}]`,
    isExported: isExported ?? false,
  });

  // remove the original enum decl.
  enumDecl.remove();
}

function enumEquivObjLitWriter(enumMembers: EnumMember[], ctx: FileEjectionContext): (writer: CodeBlockWriter) => void {
  return (writer) => {
    writer
      .inlineBlock(() => {
        enumMembers.forEach((m) => {
          // copy leading comments for the member
          commentWriter(m.getLeadingCommentRanges())(writer);

          const value = m.getValue();
          switch (typeof value) {
            case "number":
              writer.write(`${m.getName()}: ${value},`);
              break;
            case "string":
              writer.write(`${m.getName()}: `).quote().write(value).quote().write(",");
              break;
            default:
              break;
          }

          // write the original expression as a trailing comment if the member is initialized with a const enum expression.
          if (ctx.options.preserveExpr && isConstExprMember(m)) {
            writer
              .space()
              .write(`// ${compactInitializerText(m)}`)
              .newLine();
          } else {
            writer.newLine();
          }
        });
      })
      .space()
      .write("as const");
  };
}

// Writer function that writes code comments based on `CommentRange`s.
function commentWriter(comments: CommentRange[]): (writer: CodeBlockWriter) => void {
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
        lines.slice(1).forEach((l) => {
          writer.space().write(l.trimStart()).newLine();
        });
      });
  };
}

// Get leading comments that are considered to be associated with the EnumDeclaration.
// To be exact, first doc comment (starts with `/**`) and all the comments below that.
// Comments above that doc comment are considered to be independent of the EnumDecl in the context of statement indexing.
function leadingCommentsAssociatedWithDecl(enumDecl: EnumDeclaration): CommentRange[] {
  const firstDocIdx = enumDecl.getLeadingCommentRanges().findIndex((cr) => cr.getText().startsWith("/**"));
  return firstDocIdx >= 0 ? enumDecl.getLeadingCommentRanges().slice(firstDocIdx) : [];
}

// Check if the EnumMember has initializer and is initialized with a const enum expression.
function isConstExprMember(m: EnumMember): boolean {
  const ini = m.getInitializer();
  if (ini === undefined) {
    return false;
  }
  return !ini.isKind(SyntaxKind.NumericLiteral) && !ini.isKind(SyntaxKind.StringLiteral);
}

// Get initializer's source text and compact it to single line.
function compactInitializerText(ini: InitializerExpressionGetableNode): string {
  const txt = ini.getInitializer()?.getText() ?? "";
  return txt.replace(/\n\s*/g, " ").trim();
}

function visitAndRewriteTypeElementMemberedNodes(ctx: FileEjectionContext): (node: Node) => void {
  return (node: Node) => {
    if (Node.isTypeElementMembered(node)) {
      // rewrite references to enum-membered types in type literal or interface declaration
      prependTypeofToEnumMemberedPropType(node, ctx);
    }
  };
}

// Rewrites PropertySignatures that reference to enum members, by prepending `typeof`.
function prependTypeofToEnumMemberedPropType(parent: TypeElementMemberedNode, _ctx: FileEjectionContext) {
  for (const prop of parent.getProperties()) {
    if (propTypeIsEnumLiteral(prop)) {
      const idx = prop.getChildIndex();
      const structure = prop.getStructure();
      const typeName = structure.type;

      if (typeof typeName !== "string") {
        continue;
      }

      // insert a new property signature with `typeof` prepended to the type reference
      parent.insertProperty(idx, {
        ...structure,
        type: `typeof ${typeName}`,
      });

      // remove the original property signature
      prop.remove();
    }
  }
}

// Checks if the property signature's type part is a reference to an enum member (a.k.a. enum literal).
function propTypeIsEnumLiteral(prop: PropertySignature): boolean {
  const tyNode = prop.getTypeNode();
  if (!Node.isTypeReference(tyNode)) {
    return false;
  }
  return tyNode.getType().isEnumLiteral();
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

// Context of the rewrite for a project
type ProjectEjectionContext = {
  progLogger: ProgressLogger | undefined;
  options: Required<EjectEnumOptions>;
};

// Context of the rewrite for a single source file.
type FileEjectionContext = ProjectEjectionContext & {
  rootSrcFile: SourceFile;
  probe: EjectionProbe;
};

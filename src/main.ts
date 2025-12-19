import path from "node:path";
import type { Argv as YargsArgv } from "yargs";
import { hideBin } from "yargs/helpers";
import yargs from "yargs/yargs";
import type { EjectEnumOptions } from "./index";
import { EjectEnumTarget, ejectEnum } from "./index";

const argvParser = yargs(hideBin(process.argv))
  .option("project", {
    alias: "p",
    type: "string",
    array: true,
    description: "Paths to TS config files",
    default: [] as string[],
  })
  .option("include", {
    alias: "i",
    type: "string",
    array: true,
    description: "Paths to include in the conversion target",
    default: [] as string[],
  })
  .option("exclude", {
    alias: "e",
    type: "string",
    array: true,
    description:
      "Paths to exclude from the conversion target.\nYou CAN'T exclude paths included by TS configs of --project by this option!",
    default: [] as string[],
  })
  .option("silent", {
    type: "boolean",
    description: "Suppress outputs",
    default: false,
  })
  .option("preserve-expr", {
    type: "boolean",
    description: "Preserve the expression of each enum member's initializer as trailing comment",
    default: true,
  })
  .usage("usage: $0 [--project path/to/tsconfig.json] [--include path/to/include [--exclude path/to/exclude]]")
  .help();

// entrypoint of the CLI.
export function main() {
  const argv = argvParser.parseSync();

  let target: EjectEnumTarget;
  try {
    target = targetFromArgv(
      argv,
      argv._.map((a) => a.toString()),
    );
  } catch (e) {
    console.error(`${e}`);
    argvParser.showHelp();
    process.exit(1);
  }

  ejectEnum(target, optionsFromArgv(argv));
}

type ParsedArgv = typeof argvParser extends YargsArgv<infer T> ? T : never;
type TargetRelatedKeys = "project" | "include" | "exclude";

// throws if a pre-condition about the arguments (at least one target is specified) is not satisfied.
export function targetFromArgv(
  argv: Pick<ParsedArgv, TargetRelatedKeys>,
  positionalArgs: readonly string[],
): EjectEnumTarget {
  const [jsons, nonJsons]: [string[], string[]] = [[], []];
  for (const p of positionalArgs) {
    if (path.extname(p) === ".json") {
      jsons.push(p);
    } else {
      nonJsons.push(p);
    }
  }

  // JSON files are specified in positinal args -> consider them as TS configs
  if (jsons.length > 0) {
    return EjectEnumTarget.tsConfig([...argv.project, ...jsons]);
  }

  /* no JSON files are specified in positional args */

  if (argv.project.length === 0 && argv.include.length === 0 && nonJsons.length === 0) {
    throw Error("No targets are specified");
  }

  return argv.project.length > 0
    ? EjectEnumTarget.tsConfig(argv.project)
    : EjectEnumTarget.paths({
        include: [...argv.include, ...nonJsons], // consider non-JSON paths as include paths
        exclude: argv.exclude,
      });
}

export function optionsFromArgv(argv: Omit<ParsedArgv, TargetRelatedKeys>): EjectEnumOptions {
  return { silent: argv.silent, preserveExpr: argv["preserve-expr"] };
}

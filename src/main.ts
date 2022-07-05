import { hideBin } from "yargs/helpers";
import yargs from "yargs/yargs";
import { ejectEnum, EjectEnumTarget } from "./EjectEnum";

// entrypoint of the CLI.
export function main() {
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
    .usage(
      "usage: $0 [--project path/to/tsconfig.json] [--include path/to/include [--exclude path/to/exclude]]"
    )
    .help();

  const argv = argvParser.parseSync();

  let target: EjectEnumTarget;
  try {
    target = optionsFromArgv(argv);
  } catch (e) {
    console.error(`${e}`);
    argvParser.showHelp();
    process.exit(1);
  }

  ejectEnum(target);
}

type ParsedArgv = {
  project: string[];
  include: string[];
  exclude: string[];
};

// gets EjectEnumOptions from parsed command arguments.
// throws if pre-conditions about the arguments are not satisfied.
export function optionsFromArgv(argv: ParsedArgv): EjectEnumTarget {
  if (argv.project.length === 0 && argv.include.length === 0) {
    throw Error("specify at least one of --project or --include");
  }

  return argv.project.length > 0
    ? EjectEnumTarget.tsConfig(argv.project)
    : EjectEnumTarget.paths({
        include: argv.include,
        exclude: argv.exclude,
      });
}

import { hideBin } from "yargs/helpers";
import yargs from "yargs/yargs";
import { ejectEnum, EjectEnumOptions, EjectTarget } from "./EjectEnum";

// entrypoint of the CLI.
export function main() {
  const argvParser = yargs(hideBin(process.argv))
    .option("project", {
      alias: "p",
      type: "string",
      array: true,
      description: "Paths to TS config paths",
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

  let options: EjectEnumOptions;
  try {
    options = optionsFromArgv(argv);
  } catch (e) {
    console.error(`${e}`);
    argvParser.showHelp();
    process.exit(1);
  }

  ejectEnum(options);
}

type ParsedArgv = {
  project: string[];
  include: string[];
  exclude: string[];
};

// gets EjectEnumOptions from parsed command arguments.
// throws if pre-conditions about the arguments are not satisfied.
export function optionsFromArgv(argv: ParsedArgv): EjectEnumOptions {
  if (argv.project.length === 0 && argv.include.length === 0) {
    throw Error("specify at least one of --project or --include");
  }

  return {
    target:
      argv.project.length > 0
        ? EjectTarget.tsConfig(argv.project)
        : EjectTarget.paths({ include: argv.include, exclude: argv.exclude }),
  };
}

import { hideBin } from "yargs/helpers";
import yargs from "yargs/yargs";
import { ejectEnum } from "./EjectEnum";
import type { EjectEnumOptions } from "./EjectEnum";

export function main() {
  const argvParser = yargs(hideBin(process.argv))
    .option("write", {
      alias: "w",
      type: "boolean",
      description: "Overwrite source files with converted codes",
      default: false,
    })
    .usage("usage: $0 [options] <target paths...>")
    .help();

  const argv = argvParser.parseSync();
  if (argv._.length === 0) {
    argvParser.showHelp();
    process.exit(1);
  }

  const options: EjectEnumOptions = {
    targetPaths: argv._.map((a) => a.toString()),
    write: argv.write,
  };

  ejectEnum(options);
}

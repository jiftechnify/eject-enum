import { ejectEnum } from "./EjectEnum";

export function main() {
  if (process.argv.length <= 2) {
    console.error("usage: eject-enum <target>");
    process.exit(1);
  }
  ejectEnum(process.argv[2] as string, false);
}

const { build } = require("esbuild");
const fs = require("fs-extra");
const cp = require("child_process");

const DIST_DIR = "./dist";
const ENTRY_POINTS = ["src/index.ts"];

const buildCJS = async () =>
  build({
    entryPoints: ENTRY_POINTS,
    bundle: true,
    outdir: DIST_DIR,
    format: "cjs",
  });

const buildESM = async () =>
  build({
    entryPoints: ENTRY_POINTS,
    bundle: true,
    outdir: DIST_DIR,
    outExtension: { ".js": ".esm.js" },
    format: "esm",
  });

/** @type { () => Promise<void> } */
const buildTypes = async () =>
  new Promise((resolve, reject) => {
    const proc = cp.spawn(
      "yarn",
      [
        "tsc",
        "--declaration",
        "--emitDeclarationOnly",
        "--declarationDir",
        DIST_DIR,
      ],
      {
        stdio: "inherit",
      }
    );
    proc.on("exit", (code) => {
      if (code != null && code !== 0) {
        reject(Error(`tsc exited with code ${code}`));
      } else {
        resolve();
      }
    });
  });

// remove outputs of the last build
fs.rmSync(DIST_DIR, { force: true, recursive: true });

Promise.all([buildCJS(), buildESM(), buildTypes()]).catch((e) => {
  console.error(`failed to build: ${e}`);
  process.exit(1);
});

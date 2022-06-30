const { build } = require("esbuild");
const fs = require("fs-extra");
const cp = require("child_process");

const DIST_DIR = "./dist";
const ENTRY_POINTS = ["src/index.ts"];

const sharedBuildOptions = {
  entryPoints: ENTRY_POINTS,
  outdir: DIST_DIR,
  bundle: true,
  external: ["ts-morph"],
  platform: "node",
};

const buildCJS = async () =>
  build({
    ...sharedBuildOptions,
    format: "cjs",
  });

const buildESM = async () =>
  build({
    ...sharedBuildOptions,
    format: "esm",
    outExtension: { ".js": ".esm.js" },
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

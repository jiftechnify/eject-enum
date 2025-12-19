import cp from "node:child_process";
import { build } from "esbuild";
import fs from "fs-extra";

const DIST_DIR = "./dist";
const BUILD_TS_CONFIG_PATH = "./tsconfig.build.json";

const sharedBuildOptions = {
  outdir: DIST_DIR,
  bundle: true,
  platform: "node",
};

const buildCJS = async () =>
  build({
    ...sharedBuildOptions,
    entryPoints: ["src/index.ts"],
    format: "cjs",
    outExtension: { ".js": ".cjs" },
    external: ["ts-morph"],
  });

const buildESM = async () =>
  build({
    ...sharedBuildOptions,
    entryPoints: ["src/index.ts"],
    format: "esm",
    outExtension: { ".js": ".mjs" },
    external: ["ts-morph"],
  });

const buildCLIMain = async () => {
  build({
    ...sharedBuildOptions,
    entryPoints: ["src/main.ts"],
    format: "cjs",
    external: ["ts-morph", "yargs", "./index"],
  });
};

/** @type { () => Promise<void> } */
const buildTypes = async () =>
  new Promise((resolve, reject) => {
    const proc = cp.spawn("pnpm", ["exec", "tsc", "-p", BUILD_TS_CONFIG_PATH, "--declarationDir", DIST_DIR], {
      stdio: "inherit",
    });
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

Promise.all([buildCJS(), buildESM(), buildCLIMain(), buildTypes()]).catch((e) => {
  console.error(`failed to build: ${e}`);
  process.exit(1);
});

# eject-enum

Eject `enum`s from your TypeScript codebase.

## What is this?

**eject-enum** is a code rewriting tool for TypeScript codebases that
rewrites each TypeScript `enum` in your codebase to
[the safer alternative](https://www.typescriptlang.org/docs/handbook/enums.html#objects-vs-enums).

**Before rewriting**:

```ts
/**
 * Signals of traffic light.
 */
export enum TrafficLight {
    /** Stop. */
    Red,
    /** Stop unless you can't do so safely. */
    Yellow,
    /** Go. */
    Green,
}
```

**After rewriting**:

```ts
/**
 * Signals of traffic light.
 */
export const TrafficLight = {
    /** Stop. */
    Red: 0,
    /** Stop unless you can't do so safely. */
    Yellow: 1,
    /** Go. */
    Green: 2,
} as const;

export type TrafficLight = (typeof TrafficLight)[keyof typeof TrafficLight];
```

## Usage

> [!Note]
> 
> **It is recommended to run code formatting tools after rewriting by
> eject-enum**, as it doesn't consider any code formatting configurations of
> your project when rewriting.

### As a CLI

You can execute **eject-enum** as a CLI tool:

```bash
# npm
npx eject-enum [options...]

# pnpm
pnpx eject-enum [options...]

# Bun
bunx eject-enum [options...]

# Deno >=2.6 (cf. https://deno.com/blog/v2.6#run-package-binaries-with-dx)
dx eject-enum [options...]
```

CLI Options:

```bash
# rewrite all files in projects specified by tsconfigs.
npx eject-enum path/to/tsconfig.json path/to/tsconfig2.json

# rewrite all Typescript files under the `src` and `test` directories,
# except files under the `src/foo` directory.
npx eject-enum "src/**/*.ts" "test/**/*.ts" --exclude "src/foo/**/*.ts"
```

### As a Library

You can use **eject-enum** as a library from your scripts as well.

```bash
npm install --save-dev eject-enum
```

```ts
import { ejectEnum, EjectEnumTarget } from "eject-enum";

// rewrite all files in projects specified by paths to tsconfigs.
ejectEnum(
    EjectEnumTarget.projects([
        "path/to/tsconfig.json",
        "path/to/tsconfig2.json",
    ]),
);

// rewrite all Typescript files under the `src` and `test` directories
// except files under the `src/foo` directory.
ejectEnum(
    EjectEnumTarget.srcPaths({
        include: ["src/**/*.ts", "test/**/*.ts"],
        exclude: ["src/foo/**/*.ts"],
    }),
);
```

## Features

- [x] Rewrite enums in the top-level as well as nested in functions, namespaces
      and body of control flows (`if`, `while`, `switch`).
- [x] Rewrite enums that have
      [constant enum expressions](https://www.typescriptlang.org/docs/handbook/enums.html#computed-and-constant-members)
      as member's value.
- [x] Preserve comments as much as possible.
- [x] Preserve original expressions of enum members in the original code as
      comments.
- [x] Rewrite
      [an enum member used as a type](https://www.typescriptlang.org/docs/handbook/enums.html#union-enums-and-enum-member-types).

## Limitations

**eject-enum** have some limitations about code rewriting. They originate from
limitations of the TS Compiler API/ts-morph.

- Can't rewrite enums that have computed enum members.
  - e.g. referring variables, members of other enums (even constant members)
- Can't preserve original trailing comments of enum members.

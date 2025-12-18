# eject-enum
Eject enums from your TypeScript codebases.

## What is this?
**eject-enum** is an automatic code rewriting tool for TypeScript codebases that rewrites each TypeScript enum in your codes to [the safer alternative](https://www.typescriptlang.org/docs/handbook/enums.html#objects-vs-enums).

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

export type TrafficLight = typeof TrafficLight[keyof typeof TrafficLight];
```

## Usage
### Installation

```bash
# global
npm install -g eject-enum
yarn global add eject-enum

# local
npm install --save-dev eject-enum
yarn add --dev eject-enum
```

### Execution

```bash
# if you installed locally, prepend `npx` or `yarn`.

# rewrite all files in projects specified by TS configs.
eject-enum path/to/tsconfig.json path/to/tsconfig2.json

# rewrite all TS files under the `src` and `test` directories,
# except files under the `src/foo` directory.
eject-enum "src/**/*.ts" "test/**/*.ts" --exclude "src/foo/**/*.ts"
```

You can execute **eject-enum** from scripts as well.

```ts
/* ejectEnum.ts */
import { ejectEnum, EjectEnumTarget } from 'eject-enum';

// rewrite all files in projects specified by TS configs.
ejectEnum(EjectEnumTarget.tsConfig(["path/to/tsconfig.json", "path/to/tsconfig2.json"]));

// rewrite all TS files under the `src` and `test` directories
// except files under the `src/foo` directory.
ejectEnum(
    EjectEnumTarget.paths({ 
        include: ["src/**/*.ts", "test/**/*.ts"], 
        exclude: ["src/foo/**/*.ts"] 
    }),
);
```

```bash
# execute the script with ts-node
npx ts-node ejectEnum.ts
# or using esbuild-register
node -r esbuild-register ejectEnum.ts
```

> **Note**
>
> **It is recommended to run code formatting tools after rewriting by eject-enum**, as it doesn't consider any code formatting configurations of your project when rewriting.

## Features (to come)

- [x] Rewrite enums in the top-level as well as nested in functions, namespaces and body of control flows (`if`, `while`, `switch`).
- [x] Rewrite enums that have [constant enum expressions](https://www.typescriptlang.org/docs/handbook/enums.html#computed-and-constant-members) as member's value.
- [x] Preserve comments as much as possible.
- [x] Preserve original expressions of enum members in the original code as comments.
- [ ] Rewrite [an enum member used as a type](https://www.typescriptlang.org/docs/handbook/enums.html#union-enums-and-enum-member-types).
- [ ] Deno support.

## Limitations
**eject-enum** have some limitations about code rewriting. They originate from limitations of the TS Compiler API/ts-morph.

- Can't rewrite enums that have computed enum members.
    - e.g. referring variables, members of other enums (even constant members)
- Can't preserve original trailing comments of enum members.

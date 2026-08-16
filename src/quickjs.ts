import "./text-encoding.js";

import { URL, URLSearchParams } from "whatwg-url";
import * as std from "qjs:std";

import { runCli } from "./cli.js";

Object.assign(globalThis, { URL, URLSearchParams });

const args = scriptArgs[0]?.endsWith(".js") ? scriptArgs.slice(1) : scriptArgs;
const exitCode = runCli(args, {
  writeError: message => std.err.puts(`${message}\n`),
  writeOutput: message => std.out.puts(`${message}\n`)
});

std.exit(exitCode);

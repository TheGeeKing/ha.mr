import { runCli } from "./cli.js";

process.exitCode = runCli(process.argv.slice(2), {
  writeError: (message) => console.error(message),
  writeOutput: (message) => console.log(message)
});

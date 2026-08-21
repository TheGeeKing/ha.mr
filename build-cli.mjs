import { execFileSync } from "node:child_process";

const executableName = process.platform === "win32" ? "hamr.exe" : "hamr";
const outputPath = `dist/${executableName}`;
const quickJsExecutable = process.platform === "win32" ? "qjs.exe" : "qjs";

execFileSync(quickJsExecutable, ["--compile", "dist/hamr.quickjs.js", "--out", outputPath], {
  stdio: "inherit"
});

console.log(`Built ${outputPath}`);

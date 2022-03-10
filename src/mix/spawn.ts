import { spawn } from "child_process";

export function spawnPromise(command: string, commandArgs: string[]) {
  return new Promise((resolve, reject) => {
    const process = spawn(command, commandArgs);
    const log: string[] = [];
    process.stdout.on("data", (buffer) => log.push(buffer.toString()));
    process.stderr.on("data", (buffer) => log.push(buffer.toString()));
    process.on("close", (code) => {
      if (code !== 0) {
        if (log.length) {
          return reject(log.join("\n"));
        }

        return reject(code);
      }

      if (log.length) {
        return resolve(log.join("\n"));
      }

      resolve("");
    });
  });
}

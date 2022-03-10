const path = require("path");

import { spawnPromise } from "./spawn";

function invokeCommand(command: string, args: string) {
  return spawnPromise(
    command,
    typeof args === "string" ? args.split(" ") : args
  );
}

export function lame(options: string) {
  const command = process.env.LAME_PATH || path.join("/opt/bin/lame");
  return invokeCommand(command, options);
}

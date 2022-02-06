import { synthesize } from "./synthesizer";

synthesize(
  { body: { pieceId: "8fdc99924d284cfc506dd6cdd9e5e13f" } },
  "" as any,
  () => {
    console.log("finished");
  }
);

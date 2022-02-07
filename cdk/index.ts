import { App } from "@aws-cdk/core";

import { ReimagineStack } from "./stack";

const app = new App();

new ReimagineStack(app, "ReimagineStack", {
  env: { region: "us-west-2" },
});

app.synth();

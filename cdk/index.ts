import * as cdk from "aws-cdk-lib";

import { ReimagineApi } from "./stack";

const app = new cdk.App();

new ReimagineApi.Stack(app, "ReimagineApi", {
  env: { region: "us-east-1", account: "801215208692" },
});

app.synth();

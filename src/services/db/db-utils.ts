import * as AWS from "aws-sdk";

export const documentClient = new AWS.DynamoDB.DocumentClient({
  convertEmptyValues: true,
  ...((process.env.JEST_WORKER_ID || process.env.NODE_ENV === "dev") && {
    endpoint: "localhost:4566",
    sslEnabled: false,
    region: "local-env",
  }),
});

export const tableName =
  process.env.DYNAMODB_TABLE_NAME || "ReimagineTestTable";

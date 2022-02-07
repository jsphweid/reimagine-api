import * as AWS from "aws-sdk";

export const documentClient = new AWS.DynamoDB.DocumentClient({
  convertEmptyValues: true,
  ...(process.env.JEST_WORKER_ID && {
    endpoint: "localhost:8000",
    sslEnabled: false,
    region: "local-env",
  }),
});

export const tableName = process.env.DYNAMODB_TABLE_NAME as string;

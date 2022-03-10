// mix-81b9baea-b4da-495e-a303-6ed9015ddb60.mp3

const AWS = require("aws-sdk");

const remoteConfig = { region: "us-east-1" };
const remoteDDB = new AWS.DynamoDB.DocumentClient(remoteConfig);
const remoteS3 = new AWS.S3(remoteConfig);
const remoteBucketName = "reimagineapi-bucket83908e77-1i3m8jvjhy3ua";
const remoteTableName = "ReimagineApi-ReimagineTable014161FC-12OTLYSIYPNM2";
const prodUser = "google-oauth2|107262559032876162394";

async function run() {
  remoteDDB
    .scan({ TableName: remoteTableName })
    .promise()
    .then(async (res) => {
      for (const item of res.Items) {
        const PK = item["PK"];
        const SK = item["SK"];
        if (
          item["ObjectKey"] === "mix-81b9baea-b4da-495e-a303-6ed9015ddb60.mp3"
        ) {
          console.log("would delete item", PK, SK);
          await remoteDDB
            .delete({ TableName: remoteTableName, Key: { PK, SK } })
            .promise();
        }
      }
    });
}

run();

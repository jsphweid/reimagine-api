const AWS = require("aws-sdk");

const remoteConfig = { region: "us-east-1" };
const remoteDDB = new AWS.DynamoDB.DocumentClient(remoteConfig);
const remoteS3 = new AWS.S3(remoteConfig);
const remoteBucketName = "reimagineapi-bucket83908e77-1i3m8jvjhy3ua";
const remoteTableName = "ReimagineApi-ReimagineTable014161FC-12OTLYSIYPNM2";
const prodUser = "google-oauth2|107262559032876162394";

const localConfig = { endpoint: "http://localhost:4566", region: "local-env" };
const localDDB = new AWS.DynamoDB.DocumentClient(localConfig);
const localS3 = new AWS.S3(localConfig);
const localBucketName = "reimagine-test-bucket";
const localTableName = "ReimagineTestTable";
const devUser = "google-oauth2|107262559032876162394";

function changeItem(obj) {
  return Object.entries(obj).reduce(
    (prev, [key, value]) => ({
      ...prev,
      [key]: value === prodUser ? devUser : value,
    }),
    {}
  );
}

async function transferS3(objectKeys) {
  for (const key of objectKeys) {
    console.info("transferring object", key);
    const obj = await remoteS3
      .getObject({ Key: key, Bucket: remoteBucketName })
      .promise();
    await localS3.upload({
      Bucket: localBucketName,
      Key: key,
      Body: obj.Body,
    });
  }
}

function transferDynamoDB() {
  const objectKeys = [];
  remoteDDB
    .scan({ TableName: remoteTableName })
    .promise()
    .then(async (res) => {
      for (const item of res.Items) {
        console.info("uploading item", item);
        await localDDB
          .put({ TableName: localTableName, Item: changeItem(item) })
          .promise();
        if (item["ObjectKey"]) {
          objectKeys.push(item["ObjectKey"]);
        }
      }

      await transferS3(objectKeys);
    });
}

transferDynamoDB();

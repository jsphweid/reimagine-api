process.env.DYNAMODB_TABLE_NAME = "ReimagineTestTable";

module.exports = {
  tables: [
    {
      AttributeDefinitions: [
        { AttributeName: "PK", AttributeType: "S" },
        { AttributeName: "SK", AttributeType: "S" },
        { AttributeName: "GSI1-PK", AttributeType: "S" },
        { AttributeName: "GSI1-SK", AttributeType: "S" },
        { AttributeName: "GSI2-PK", AttributeType: "S" },
      ],
      TableName: process.env.DYNAMODB_TABLE_NAME,
      KeySchema: [
        { AttributeName: "PK", KeyType: "HASH" },
        { AttributeName: "SK", KeyType: "RANGE" },
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 1,
        WriteCapacityUnits: 1,
      },
      GlobalSecondaryIndexes: [
        {
          IndexName: "GSI2",
          KeySchema: [
            { AttributeName: "GSI2-PK", KeyType: "HASH" },
            { AttributeName: "GSI1-SK", KeyType: "RANGE" },
          ],
          Projection: { ProjectionType: "ALL" },
          ProvisionedThroughput: {
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1,
          },
        },
        {
          IndexName: "GSI1",
          KeySchema: [
            { AttributeName: "GSI1-PK", KeyType: "HASH" },
            { AttributeName: "GSI1-SK", KeyType: "RANGE" },
          ],
          Projection: { ProjectionType: "ALL" },
          ProvisionedThroughput: {
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1,
          },
        },
      ],
    },
  ],
};

import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as s3 from "@aws-cdk/aws-s3";
import * as apiGateway from "@aws-cdk/aws-apigateway";

import { Duration } from "@aws-cdk/core";

interface ReimagineStackProps extends cdk.StackProps {
  env: { region: string };
}

export class ReimagineStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: ReimagineStackProps) {
    super(scope, id, props);

    const table = new dynamodb.Table(this, "ReimagineTable", {
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    table.addGlobalSecondaryIndex({
      projectionType: dynamodb.ProjectionType.ALL,
      partitionKey: { name: "GSI1-PK", type: dynamodb.AttributeType.STRING },
      indexName: "GSI1",
    });

    table.addGlobalSecondaryIndex({
      projectionType: dynamodb.ProjectionType.ALL,
      partitionKey: { name: "GSI2-PK", type: dynamodb.AttributeType.STRING },
      indexName: "GSI2",
    });

    table.addGlobalSecondaryIndex({
      projectionType: dynamodb.ProjectionType.ALL,
      partitionKey: { name: "GSI3-PK", type: dynamodb.AttributeType.STRING },
      indexName: "GSI3",
    });

    // sparse
    table.addGlobalSecondaryIndex({
      projectionType: dynamodb.ProjectionType.ALL,
      partitionKey: { name: "GSI4-PK", type: dynamodb.AttributeType.STRING },
      indexName: "GSI4",
    });

    const bucket = new s3.Bucket(this, "Bucket", {
      bucketName: "reimagine-files-bucket",
    });

    // Graphql Lambda that allows one to interact with the DB
    const apiLambda = new lambda.Function(this, "ApiLambda", {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset("../build"),
      handler: "api-lambda/index.handler",
      memorySize: 512,
      timeout: Duration.seconds(20),
      environment: {
        DYNAMODB_TABLE_NAME: table.tableName,
        FILES_BUCKET: bucket.bucketName,
      },
    });

    table.grantFullAccess(apiLambda);
    bucket.grantReadWrite(apiLambda);

    new apiGateway.LambdaRestApi(this, "graphqlEndpoint", {
      handler: apiLambda,
    });

    // TODO: add route53 stuff
  }
}

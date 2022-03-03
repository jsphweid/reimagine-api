import {
  aws_certificatemanager,
  aws_route53,
  aws_route53_targets,
  Duration,
  Stack as _Stack,
  StackProps,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apiGateway from "aws-cdk-lib/aws-apigateway";

export namespace ReimagineApi {
  export class Stack extends _Stack {
    constructor(scope: Construct, id: string, props: StackProps) {
      super(scope, id, props);

      const table = new dynamodb.Table(this, "ReimagineTable", {
        partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
        sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      });

      table.addGlobalSecondaryIndex({
        projectionType: dynamodb.ProjectionType.ALL,
        partitionKey: { name: "GSI1-PK", type: dynamodb.AttributeType.STRING },
        sortKey: { name: "GSI1-SK", type: dynamodb.AttributeType.STRING },
        indexName: "GSI1",
      });

      table.addGlobalSecondaryIndex({
        projectionType: dynamodb.ProjectionType.ALL,
        partitionKey: { name: "GSI2-PK", type: dynamodb.AttributeType.STRING },
        sortKey: { name: "GSI1-SK", type: dynamodb.AttributeType.STRING },
        indexName: "GSI2",
      });

      table.addGlobalSecondaryIndex({
        projectionType: dynamodb.ProjectionType.ALL,
        partitionKey: {
          name: "RecordingCount",
          type: dynamodb.AttributeType.NUMBER,
        },
        sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
        indexName: "GSI3",
      });

      const bucket = new s3.Bucket(this, "Bucket");

      const apiLambda = new lambda.Function(this, "ApiLambda", {
        runtime: lambda.Runtime.NODEJS_14_X,
        code: lambda.Code.fromAsset("../build"),
        handler: "index.handler",
        memorySize: 1024,
        timeout: Duration.seconds(30),
        environment: {
          DYNAMODB_TABLE_NAME: table.tableName,
          S3_BUCKET_NAME: bucket.bucketName,
          CLIENT_ORIGIN_URL: "https://carryoaky.com",
          AUTH0_AUDIENCE: "https://api.carryoaky.com",
          AUTH0_DOMAIN: "carryoaky.us.auth0.com",
        },
      });

      table.grantFullAccess(apiLambda);
      bucket.grantReadWrite(apiLambda);

      const certificate = aws_certificatemanager.Certificate.fromCertificateArn(
        this,
        "Certificate",
        "arn:aws:acm:us-east-1:801215208692:certificate/f1f55c0e-2b32-4aed-aaf2-c33210717861"
      );

      const api = new apiGateway.LambdaRestApi(this, "graphqlEndpoint", {
        handler: apiLambda,
        proxy: false,
        domainName: {
          domainName: "api.carryoaky.com",
          certificate,
        },
        defaultCorsPreflightOptions: {
          allowOrigins: apiGateway.Cors.ALL_ORIGINS,
          allowMethods: apiGateway.Cors.ALL_METHODS,
        },
      });

      // this just creates the /graphql endpoint which is purely cosmetic
      const graphql = api.root.addResource("graphql");
      graphql.addMethod("GET");
      graphql.addMethod("POST");

      const zone = aws_route53.HostedZone.fromLookup(this, "Zone", {
        domainName: "carryoaky.com",
      });

      new aws_route53.ARecord(this, "ARecord", {
        zone,
        recordName: "api",
        target: aws_route53.RecordTarget.fromAlias(
          new aws_route53_targets.ApiGateway(api)
        ),
      });
    }
  }
}

import * as AWS from "aws-sdk";

const s3 = new AWS.S3({
  ...(process.env.NODE_ENV === "dev" && {
    s3ForcePathStyle: true,
    endpoint: "http://localhost:4566",
    sslEnabled: false,
    region: "local-env",
  }),
});

export namespace ObjectStorage {
  const bucketName = process.env.S3_BUCKET_NAME || "reimagine-test-bucket";
  const region = process.env.AWS_REGION || "local-env";

  export const uploadBuffer = (body: AWS.S3.Body, key: string): Promise<any> =>
    s3
      .upload({
        Bucket: bucketName,
        Key: key,
        Body: body,
      })
      .promise();

  export const getPresignedUrl = (key: string) => {
    s3.getSignedUrlPromise;
    return s3.getSignedUrl("getObject", {
      Bucket: bucketName,
      Key: key,
      Expires: 60 * 5, // 5 minutes
    });
  };

  export const getItem = (objectKey: string): Promise<Buffer | null> =>
    s3
      .getObject({
        Bucket: bucketName,
        Key: objectKey,
      })
      .promise()
      .then((response) =>
        response.Body ? Buffer.from(response.Body as any) : null
      );

  export const deleteObjects = (keys: string[]): Promise<any> =>
    s3
      .deleteObjects({
        Bucket: bucketName,
        Delete: { Objects: keys.map((k) => ({ Key: k })) },
      })
      .promise();
}

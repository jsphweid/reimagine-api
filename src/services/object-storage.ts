import * as AWS from "aws-sdk";

const s3 = new AWS.S3();

export namespace ObjectStorage {
  const bucketName = process.env.FILES_BUCKET as string;
  const region = process.env.AWS_REGION as string;

  export const uploadBuffer = (body: AWS.S3.Body, key: string): Promise<any> =>
    s3
      .upload({
        Bucket: bucketName,
        Key: key,
        Body: body,
        ContentType: "image/png",
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

  export const getItem = (objectKey: string): Promise<AWS.S3.Body | null> =>
    s3
      .getObject({
        Bucket: bucketName,
        Key: objectKey,
      })
      .promise()
      .then((response) => response.Body || null);

  export const urlFromKey = (objectKey: string): string =>
    // TODO: eventually this should not exist as it relies on the item
    // being public which is bad
    `https://${bucketName}.s3-${region}.amazonaws.com/${objectKey}`;
}
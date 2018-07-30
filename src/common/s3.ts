import * as AWS from 'aws-sdk'
const s3 = new AWS.S3()

export async function uploadItemToS3(buffer: Buffer, key: string) {
  const config = {
    Body: buffer,
    Bucket: 'reimagine.io-warehouse',
    Key: key
  }

  return s3
    .putObject(config)
    .promise()
    .catch(error => {
      console.log('could not upload object to s3:', error)
      return null
    })
}

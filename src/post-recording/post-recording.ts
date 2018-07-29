import * as md5 from 'md5'
import getPgClient from '../common/postgres'
import { uploadItemToS3 } from '../common/s3'
import { Context, Callback } from 'aws-lambda'

async function postRecording(
  base64Blob: any,
  segmentId: string,
  samplingRate: number
): Promise<{ id: string; error?: string }> {
  try {
    const client = await getPgClient()
    const selectResult = await client.query(
      `SELECT segment.id, piece.id as "pieceId", piece.name as name FROM segment INNER JOIN piece ON segment."pieceId" = piece.id where segment.id = '${segmentId}';`
    )
    if (!selectResult.rows || !selectResult.rows.length)
      throw `Couldn't find segment in database.`
    const { pieceId, name } = selectResult.rows[0]
    const trimmedBlob = base64Blob.replace('data:audio/wav;base64,', '')
    const recordingId = md5(trimmedBlob)
    const fileBuffer: Buffer = Buffer.from(trimmedBlob, 'base64')
    const s3Key: string = `recordings/piece-${pieceId}-${name}/segment-${segmentId}/${recordingId}.wav`
    const s3uploadSucceeded = await uploadItemToS3(fileBuffer, s3Key)
    if (!s3uploadSucceeded) throw 'Could not upload object to s3.'

    const insertResult = await client.query(
      `INSERT INTO recording (id, "segmentId", date, "s3Key", "samplingRate") VALUES ('${recordingId}', '${segmentId}', now(), '${s3Key}', ${samplingRate});`
    )
    if (!insertResult.rows) throw `Couldn't put recording record in rds.`
    return { id: recordingId }
  } catch (e) {
    console.log('e', e)
    return { id: null, error: JSON.stringify(e) }
  }
}

export async function handler(
  event: any,
  context: Context,
  callback: Callback
) {
  context.callbackWaitsForEmptyEventLoop = false

  const { base64Blob, segmentId, samplingRate } = event

  const result = await postRecording(base64Blob, segmentId, samplingRate)

  if (result.error) return callback(new Error(result.error))

  callback(null, { id: result.id })
}

import * as md5 from 'md5'
import getPgClient from '../common/postgres'
import { Context, Callback } from 'aws-lambda'
import {
  RecordingFragmentSpec,
  CreateMixFromRecordingFragmentsMutationArgs
} from '../../__generatedTypes__/types'
import * as aws from 'aws-sdk'

export async function handler(
  event: CreateMixFromRecordingFragmentsMutationArgs,
  context: Context,
  callback: Callback
) {
  context.callbackWaitsForEmptyEventLoop = false

  const mixId = createMixId(event.recordings)

  if (await mixAlreadyExists(mixId)) {
    console.log(`id ${mixId} already exists.`)
    return callback(null, { id: mixId })
  }

  const result = await mixAndUpload(mixId, event.recordings)

  // const { base64Blob, segmentId, samplingRate } = event

  // const result = await postRecording(base64Blob, segmentId, samplingRate)

  // if (result.error) return callback(new Error(result.error))

  return callback(null, { id: mixId })
}

async function mixAndUpload(
  mixId: string,
  recordings: RecordingFragmentSpec[]
): Promise<string | null> {
  const OutputKey = `mixes/${mixId}.wav`
  const Payload = JSON.stringify({ Recordings: recordings, OutputKey })

  return new Promise(resolve => {
    new aws.Lambda({ region: 'us-east-1' }).invoke(
      { Payload, FunctionName: 'reimagine-go-api-dev-mixer' },
      (error, data) => {
        if (error) {
          console.log('error', error)
          resolve(null)
        } else {
          console.log('data', data)
          resolve('hi')
        }
      }
    )
  })
}

async function mixAlreadyExists(mixId: string) {
  const client = await getPgClient()
  const result = await client.query(`SELECT * FROM mix where id = '${mixId}';`)
  return result.rows > 0
}

function createMixId(recordings: RecordingFragmentSpec[]): string | null {
  const recordingsCopy = recordings.slice()
  recordingsCopy.sort((a, b) => {
    if (a.recordingId < b.recordingId) {
      return -1
    } else if (a.recordingId > b.recordingId) {
      return 1
    } else {
      return 0
    }
  })
  return md5(JSON.stringify(recordingsCopy))
}

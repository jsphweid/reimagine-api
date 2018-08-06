import * as md5 from 'md5'
import getPgClient from '../common/postgres'
import { Context, Callback } from 'aws-lambda'
import { CreateMixMutationArgs } from '../../__generatedTypes__/types'
import * as aws from 'aws-sdk'
import { pickRandomItem } from '../common/helpers'

interface RecordingFragmentSpecType {
  s3Key: string
  offsetTime: number
}

export async function handler(
  event: CreateMixMutationArgs,
  context: Context,
  callback: Callback
) {
  context.callbackWaitsForEmptyEventLoop = false

  const recordings: RecordingFragmentSpecType[] = await getRecordingFragments(
    event.pieceId
  )
  const mixId = createMixId(recordings)

  if (await mixAlreadyExists(mixId)) {
    console.log(`id ${mixId} already exists.`)
    return callback(null, { id: mixId })
  }

  const result = await mixAndUpload(mixId, recordings)
  console.log('result', result)
  return callback(null, { id: mixId })
}

async function getRecordingFragments(
  pieceId: string
): Promise<RecordingFragmentSpecType[]> {
  const client = await getPgClient()
  const result = await client.query(`
    select "s3Key", "segmentId", "offsetTime"
    from recording
    inner join segment on segment.id = recording."segmentId"
    where "pieceId" = '${pieceId}';
  `)
  const obj: { [key: string]: RecordingFragmentSpecType[] } = {}

  result.rows.forEach(({ s3Key, segmentId, offsetTime }) => {
    if (obj[segmentId]) {
      obj[segmentId].push({ s3Key, offsetTime })
    } else {
      obj[segmentId] = [{ s3Key, offsetTime }]
    }
  })

  return Object.values(obj).map(recordingFragments =>
    pickRandomItem(recordingFragments)
  )
}

// S3Key     string   `json:"s3Key"`
// StartTime *float64 `json:"startTime"`
// EndTime   *float64 `json:"endTime"`
// Offset    *float64 `json:"offset"`

interface GolangRecordingInfoType {
  S3Key: string
  StartTime?: number
  EndTime?: number
  Offset?: number
}

async function mixAndUpload(
  mixId: string,
  recordings: RecordingFragmentSpecType[]
): Promise<any> {
  const outputKey = `mixes/${mixId}.wav`

  const recordingsTransformed: GolangRecordingInfoType[] = recordings.map(
    ({ s3Key, offsetTime }) => ({ S3Key: s3Key, Offset: offsetTime })
  )
  const Payload = JSON.stringify({
    recordings: recordingsTransformed,
    outputKey
  })

  const lambda = new aws.Lambda({ region: 'us-east-1' })
  console.log('Payload', Payload)
  return lambda
    .invoke({
      FunctionName:
        'arn:aws:lambda:us-east-1:801215208692:function:reimagine-go-api-dev-mixer',
      Payload,
      LogType: 'Tail',
      InvocationType: 'Event'
    })
    .promise()
}

async function mixAlreadyExists(mixId: string) {
  const client = await getPgClient()
  const result = await client.query(`SELECT * FROM mix where id = '${mixId}';`)
  return result.rows > 0
}

function createMixId(recordings: RecordingFragmentSpecType[]): string | null {
  const recordingsCopy = recordings.slice()
  recordingsCopy.sort((a, b) => {
    if (a.s3Key < b.s3Key) {
      return -1
    } else if (a.s3Key > b.s3Key) {
      return 1
    } else {
      return 0
    }
  })
  return md5(JSON.stringify(recordingsCopy))
}

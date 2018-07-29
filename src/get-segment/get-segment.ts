import getPgClient from '../common/postgres'
import { pickRandomItem } from '../common/helpers'
import { Context, Callback } from 'aws-lambda'

async function getRandomSegmentId(): Promise<string> {
  const client = await getPgClient()
  const result = await client.query(`
		SELECT id, count
		FROM segment
		LEFT JOIN (SELECT "segmentId", COUNT(*) FROM recording GROUP BY "segmentId") counts
		ON segment.id = counts."segmentId"
		ORDER BY COALESCE(count, 0) ASC
		LIMIT 200;
	`)
  const idsThatHaveNoRecordings = result.rows
    .filter(row => !row.count)
    .map(row => row.id)
  return idsThatHaveNoRecordings.length
    ? pickRandomItem(idsThatHaveNoRecordings)
    : pickRandomItem(result.rows.map(row => row.id))
}

export async function handler(
  event: any,
  context: Context,
  callback: Callback
) {
  context.callbackWaitsForEmptyEventLoop = false
  const segmentId = event.id || (await getRandomSegmentId())

  const client = await getPgClient()
  const result = await client.query(
    `select * from segment where id = '${segmentId}'`
  )

  if (!result.rows.length) return callback(new Error('Unable to get segment'))
  const drilledResult = result.rows[0]

  callback(null, {
    ...drilledResult,
    midiJson: JSON.stringify(drilledResult.midiJson)
  })
}

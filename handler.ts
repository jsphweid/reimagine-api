import { APIGatewayEvent, Callback, Context, Handler } from 'aws-lambda'
import { segmentizeMidi, SegmentInfoType } from 'midi-segmentizer'
import * as AWS from 'aws-sdk'
import { Client } from 'pg'

export async function segmentize(event: any, context: Context, cb: Callback) {
	const rds = new AWS.RDS({ apiVersion: '2014-10-31' })
	const client = new Client({
		user: 'reimagine_admin',
		host: 'reimagineinstance.czbydqdgzi5u.us-east-1.rds.amazonaws.com',
		database: 'reimagine_db',
		password: 'reimaginejoseph',
		port: 5432
	})

	console.log('connecting')
	await client.connect()
	console.log('connected...')
	const sql = 'select * from segments;'
	client.query(sql, (error, response) => {
		console.log('error', error)
		console.log('response', response)
		client.end()
	})

	// const { fileBuffers } = event
	// const fileResults: SegmentInfoType[][] = fileBuffers.map(fileBuffer => segmentizeMidi(fileBuffer))
	// fileResults.forEach(fileResult => {
	// 	fileResult.forEach(segment => {
	// 		console.log('segment', segment)
	// 	})
	// })
}

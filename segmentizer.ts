import { Callback, Context } from 'aws-lambda'
import { segmentizeMidi, SegmentInfoType } from 'midi-segmentizer'
import * as AWS from 'aws-sdk'
const s3 = new AWS.S3()
import { Client } from 'pg'
import * as md5 from 'md5'

function formSegmentsStatement(processedFileBuffers: ProcessedFileBufferType[]): string {
	const innerStatements: string[] = []
	processedFileBuffers.forEach(segmentsAndMd5 => {
		segmentsAndMd5.segments.forEach((segment: SegmentInfoType) => {
			const pieceMd5 = `'${segmentsAndMd5.md5Id}'`
			const jsonString = JSON.stringify(segment.midiJson)
			const segmentMd5 = `'${md5(jsonString)}'`
			const json = `'${jsonString}'`
			innerStatements.push(
				`(${segmentMd5}, ${pieceMd5}, ${segment.difficulty}, now(), ${json}, ${segment.offset})`
			)
		})
	})

	return `INSERT INTO segment (id, pieceId, difficulty, date, midiJson, offsetTime) VALUES ${innerStatements.join(
		', '
	)};`
}

function formPiecesStatement(processedFileBuffers: ProcessedFileBufferType[]): string {
	const innerStatements = processedFileBuffers.map((processedFileBuffer: ProcessedFileBufferType) => {
		const s3Key = generateS3Name(processedFileBuffer)
		const name = processedFileBuffer.segments[0].midiName
		return `('${processedFileBuffer.md5Id}', '${name}', now(), '${s3Key}')`
	})
	return `INSERT INTO piece (id, name, date, s3Key) VALUES ${innerStatements.join(', ')};`
}

function generateS3Name(processedFileBuffer: ProcessedFileBufferType) {
	const { md5Id, segments } = processedFileBuffer
	const name = segments[0].midiName
	return `originalMidiFiles/${name}-${md5Id}.mid`
}

async function uploadFilesToS3(processedFileBuffers: ProcessedFileBufferType[]) {
	const putObjectConfigs: any[] = processedFileBuffers.map(processedFileBuffer => ({
		Body: Buffer.from(processedFileBuffer.fileBuffer, 'base64'),
		Bucket: 'reimagine.io-warehouse',
		Key: generateS3Name(processedFileBuffer)
	}))
	putObjectConfigs.forEach(putObjectConfig => {
		s3.putObject(putObjectConfig)
	})

	for (let putObjectConfig of putObjectConfigs) {
		const a = await s3.putObject(putObjectConfig).promise()
	}
}

interface ProcessedFileBufferType {
	md5Id: string
	segments: SegmentInfoType[]
	fileBuffer: string
}

function processFileBuffer(fileBuffer: string): ProcessedFileBufferType {
	const md5Id: string = md5(fileBuffer)
	const segments: SegmentInfoType[] = segmentizeMidi(fileBuffer)
	return segments.length ? { md5Id, segments, fileBuffer } : null
}

function conditionallyParseJson(maybeJson: any): any {
	try {
		return JSON.parse(maybeJson)
	} catch (e) {
		return maybeJson
	}
}

export async function segmentize(event: any, context: Context, callback: Callback) {
	let client
	try {
		const { fileBuffers } = conditionallyParseJson(event.body)
		if (!fileBuffers) {
			throw 'no "fileBuffers" in the post...'
		}
		const processedFileBuffers: ProcessedFileBufferType[] = fileBuffers
			.map((fileBuffer: string) => processFileBuffer(fileBuffer))
			.filter(Boolean)

		if (!processedFileBuffers.length) {
			throw 'no good midi files...'
		}
		const segmentsStatement = formSegmentsStatement(processedFileBuffers)
		const piecesStatement = formPiecesStatement(processedFileBuffers)

		client = new Client({
			user: 'reimagine_admin',
			host: 'reimagineinstance.czbydqdgzi5u.us-east-1.rds.amazonaws.com',
			database: 'reimagine_db',
			password: 'reimaginejoseph',
			port: 5432
		})

		await client.connect()
		const segmentsResult = await client.query(segmentsStatement)
		const piecesResult = await client.query(piecesStatement)
		if (segmentsResult && piecesResult) {
			uploadFilesToS3(processedFileBuffers)
			callback(null, {
				statusCode: 200,
				body: JSON.stringify({ segmentsResult, piecesResult })
			})
		}
	} catch (e) {
		callback(new Error(JSON.stringify(e)))
	}

	client.end()
}

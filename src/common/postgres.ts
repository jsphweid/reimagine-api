import { Client } from 'pg'
let pgClient

export default async function getPgClient() {
	if (pgClient) return pgClient
	const client = new Client({
		user: 'reimagine_admin',
		host: 'reimagineinstance.czbydqdgzi5u.us-east-1.rds.amazonaws.com',
		database: 'reimagine_db',
		password: 'reimaginejoseph',
		port: 5432
	})
	await client.connect()
	pgClient = client
	return client
}

# Reimagine-API

### DynamoDB

piece
	get all (could put a sparse index on piece but w/e)
recording
	get by id (PK/SK both recordingId)
	get by userId (GSI-PK=userId, GSI1-SK starts with Recording#)
	get by segmentId (GSI-PK=segmentId, GSI1-SK starts with Recording#)
segment
	get random 
	get by segmentId (PK/SK both segmentId)
	get all by pieceId (GSI1-PK=pieceId, GSI1-SK starts with Segment#)
mixes
	get by mix Id (PK/SK both recordingId)
	get by piece Id (GSI1-PK is pieceId, GSI1-SK starts with Mix#)
	get by recording id  (PK is recordingId, SK starts with Mix#)

import { documentClient, tableName } from "./db-utils";

// by default we care about the most recent recordings more (greatest first)
const DEFAULT_SCAN_INDEX_FORWARD = false;

export interface Recording {
  id: string;
  segmentId: string;
  userId: string | null;
  objectKey: string;
  sampleRate: number;
  dateCreated: Date;
  duration: number;
}

function mapRecording(item: any): Recording {
  return {
    id: item["PK"],
    userId: item["GSI2-PK"] || null,
    segmentId: item["GSI1-PK"],
    duration: item["Duration"],
    sampleRate: item["SampleRate"],
    objectKey: item["ObjectKey"],
    dateCreated: new Date(item["DateCreated"]),
  };
}

export async function _getRecordingById(
  recordingId: string
): Promise<Recording | null> {
  return documentClient
    .get({
      TableName: tableName,
      Key: { PK: recordingId, SK: recordingId },
    })
    .promise()
    .then((res) => (res.Item ? mapRecording(res.Item) : null));
}

export async function _saveRecording(recording: Recording): Promise<Recording> {
  // TODO: add transact write and bump segment record count by 1
  const date = recording.dateCreated.toISOString();

  return documentClient
    .transactWrite({
      TransactItems: [
        {
          Update: {
            TableName: tableName,
            Key: { PK: recording.segmentId, SK: recording.segmentId },
            ExpressionAttributeValues: { ":inc": 1 },
            UpdateExpression: "ADD RecordingCount :inc",
          },
        },
        {
          Put: {
            TableName: tableName,
            Item: {
              PK: recording.id,
              SK: recording.id,
              Type: "Recording",
              DateCreated: date,
              Duration: recording.duration,
              ObjectKey: recording.objectKey,
              SampleRate: recording.sampleRate,
              "GSI1-PK": recording.segmentId,
              "GSI1-SK": `Recording#${date}#${recording.id}`,
              "GSI2-PK": recording.userId || undefined,
            },
          },
        },
      ],
    })
    .promise()
    .then(() => recording);
}

export async function _getRecordingsByUserId(
  userId: string
): Promise<Recording[]> {
  // TODO: handle pagination
  return documentClient
    .query({
      TableName: tableName,
      IndexName: "GSI2",
      KeyConditionExpression: "#PK = :userId and begins_with(#SK, :startsWith)",
      ExpressionAttributeNames: {
        "#PK": "GSI2-PK",
        "#SK": "GSI1-SK",
      },
      ExpressionAttributeValues: {
        ":userId": userId,
        ":startsWith": "Recording#",
      },
      ScanIndexForward: DEFAULT_SCAN_INDEX_FORWARD,
    })
    .promise()
    .then((res) => {
      return res.Items ? res.Items.map(mapRecording) : [];
    });
}

export async function _getRecordingsBySegmentId(
  segmentId: string
): Promise<Recording[]> {
  // TODO: handle pagination
  return documentClient
    .query({
      TableName: tableName,
      IndexName: "GSI1",
      KeyConditionExpression:
        "#PK = :segmentId and begins_with(#SK, :startsWith)",
      ExpressionAttributeNames: {
        "#PK": "GSI1-PK",
        "#SK": "GSI1-SK",
      },
      ExpressionAttributeValues: {
        ":segmentId": segmentId,
        ":startsWith": "Recording#",
      },
      ScanIndexForward: DEFAULT_SCAN_INDEX_FORWARD,
    })
    .promise()
    .then((res) => {
      return res.Items ? res.Items.map(mapRecording) : [];
    });
}

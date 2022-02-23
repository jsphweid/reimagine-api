import { documentClient, tableName } from "./db-utils";
import { Utils } from "../../utils";

interface Mix {
  id: string;
  arrangementId: string;
  objectKey: string;
  duration: number;
  dateCreated: Date;
}

function mapMix(item: any): Mix {
  return {
    id: item["PK"],
    duration: item["Duration"],
    arrangementId: item["GSI1-PK"],
    objectKey: item["ObjectKey"],
    dateCreated: new Date(item["DateCreated"]),
  };
}

function mapMixToDbItem(mix: Mix, recordingId: string, date: string) {
  return {
    PK: recordingId,
    SK: `Mix#${date}#${mix.id}`,
    "GSI1-PK": mix.id,
    "GSI1-SK": recordingId,
    Duration: mix.duration,
    Type: "MixRecording",
    // manually project these below for easy retrieval later
    ArrangementId: mix.arrangementId,
    ObjectKey: mix.objectKey,
  };
}

export async function _saveMix(
  mix: Mix & { recordingIds: string[] }
): Promise<Mix> {
  // TODO: error handling
  // NOTE: no validation of recordingIds used
  const date = mix.dateCreated.toISOString();

  await documentClient
    .put({
      TableName: tableName,
      Item: {
        PK: mix.id,
        SK: mix.id,
        Type: "Mix",
        DateCreated: date,
        Duration: mix.duration,
        ObjectKey: mix.objectKey,
        "GSI1-PK": mix.arrangementId,
        "GSI1-SK": `Mix#${date}#${mix.id}`,
      },
    })
    .promise();
  const items = mix.recordingIds.map((id) => mapMixToDbItem(mix, id, date));
  await Utils.dynamoDbBatchWrite(tableName, items);
  return mix;
}

export async function _getMixesByArrangementId(
  arrangementId: string
): Promise<Mix[]> {
  // TODO: handle pagination
  return documentClient
    .query({
      TableName: tableName,
      IndexName: "GSI1",
      KeyConditionExpression:
        "#PK = :arrangementId and begins_with(#SK, :startsWith)",
      ExpressionAttributeNames: {
        "#PK": "GSI1-PK",
        "#SK": "GSI1-SK",
      },
      ExpressionAttributeValues: {
        ":arrangementId": arrangementId,
        ":startsWith": "Mix#",
      },
    })
    .promise()
    .then((res) => (res.Items ? res.Items.map(mapMix) : []));
}

export async function _getMixesByRecordingId(
  recordingId: string
): Promise<Mix[]> {
  // TODO: handle pagination
  return documentClient
    .query({
      TableName: tableName,
      KeyConditionExpression:
        "#PK = :recordingId and begins_with(#SK, :startsWith)",
      ExpressionAttributeNames: {
        "#PK": "PK",
        "#SK": "SK",
      },
      ExpressionAttributeValues: {
        ":recordingId": recordingId,
        ":startsWith": "Mix#",
      },
    })
    .promise()
    .then((res) =>
      res.Items
        ? res.Items.map((item) => ({
            id: item["GSI1-PK"],
            arrangementId: item["ArrangementId"],
            duration: item["Duration"],
            objectKey: item["ObjectKey"],
            dateCreated: new Date(item["SK"].split("#")[1]),
          }))
        : []
    );
}

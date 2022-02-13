import { documentClient, tableName } from "./db-utils";
import { Utils } from "../../utils";

interface Mix {
  id: string;
  pieceId: string;
  objectKey: string;
  dateCreated: Date;
}

function mapMix(item: any): Mix {
  return {
    id: item["PK"],
    pieceId: item["GSI1-PK"],
    objectKey: item["ObjectKey"],
    dateCreated: new Date(item["DateCreated"]),
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
        ObjectKey: mix.objectKey,
        "GSI1-PK": mix.pieceId,
        "GSI1-SK": `Mix#${date}#${mix.id}`,
      },
    })
    .promise();

  await Promise.all(
    Utils.chunkArray(mix.recordingIds, 25).map((recordingIds) =>
      documentClient
        .batchWrite({
          RequestItems: {
            [tableName]: recordingIds.map((recordingId) => ({
              PutRequest: {
                Item: {
                  PK: recordingId,
                  SK: `Mix#${date}#${mix.id}`,
                  "GSI1-PK": mix.id,
                  "GSI1-SK": recordingId,
                  // manually project these below for easy retrieval later
                  PieceId: mix.pieceId,
                  ObjectKey: mix.objectKey,
                },
              },
            })),
          },
        })
        .promise()
    )
  );

  return mix;
}

export async function _getMixesByPieceId(pieceId: string): Promise<Mix[]> {
  // TODO: handle pagination
  return documentClient
    .query({
      TableName: tableName,
      IndexName: "GSI1",
      KeyConditionExpression:
        "#PK = :pieceId and begins_with(#SK, :startsWith)",
      ExpressionAttributeNames: {
        "#PK": "GSI1-PK",
        "#SK": "GSI1-SK",
      },
      ExpressionAttributeValues: {
        ":pieceId": pieceId,
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
            pieceId: item["PieceId"],
            objectKey: item["ObjectKey"],
            dateCreated: new Date(item["SK"].split("#")[1]),
          }))
        : []
    );
}

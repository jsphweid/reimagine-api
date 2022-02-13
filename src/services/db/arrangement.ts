import { documentClient, tableName } from "./db-utils";

interface Arrangement {
  id: string;
  pieceId: string;
  dateCreated: Date;
}

function mapArrangement(item: any): Arrangement {
  return {
    id: item["PK"],
    pieceId: item["GSI1-PK"],
    dateCreated: new Date(item["DateCreated"]),
  };
}

export async function _saveArrangement(
  arrangement: Arrangement
): Promise<Arrangement> {
  const date = arrangement.dateCreated.toISOString();
  await documentClient
    .put({
      TableName: tableName,
      Item: {
        PK: arrangement.id,
        SK: arrangement.id,
        Type: "Arrangement",
        DateCreated: date,
        "GSI1-PK": arrangement.pieceId,
        "GSI1-SK": `Arrangement#${date}#${arrangement.id}`,
      },
    })
    .promise();
  return arrangement;
}

export async function _getArrangementById(
  arrangementId: string
): Promise<Arrangement | null> {
  return documentClient
    .get({
      TableName: tableName,
      Key: { PK: arrangementId, SK: arrangementId },
    })
    .promise()
    .then((res) => (res.Item ? mapArrangement(res.Item) : null));
}

export async function _getArrangementsByPieceId(
  pieceId: string
): Promise<Arrangement[]> {
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
        ":startsWith": "Arrangement#",
      },
    })
    .promise()
    .then((res) => (res.Items ? res.Items.map(mapArrangement) : []));
}
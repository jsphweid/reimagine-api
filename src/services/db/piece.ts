import { documentClient, tableName } from "./db-utils";

interface Piece {
  id: string;
  dateCreated: Date;
}

export async function _savePiece(piece: Piece): Promise<Piece> {
  const date = piece.dateCreated.toISOString();
  return documentClient
    .put({
      TableName: tableName,
      Item: {
        PK: piece.id,
        SK: piece.id,
        Type: "Piece",
        DateCreated: date,
      },
    })
    .promise()
    .then(() => piece);
}

export async function _getAllPieces(): Promise<Piece[]> {
  // TODO: will grow to be very slow and doesn't support pagination!
  return documentClient
    .scan({
      TableName: tableName,
      FilterExpression: "#col = :val",
      ExpressionAttributeNames: {
        "#col": "Type",
      },
      ExpressionAttributeValues: {
        ":val": "Piece",
      },
    })
    .promise()
    .then((res) =>
      res.Items
        ? res.Items.map((item) => ({
            id: item.PK,
            dateCreated: new Date(item.DateCreated),
          }))
        : []
    );
}

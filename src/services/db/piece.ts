import { documentClient, tableName } from "./db-utils";

interface Piece {
  id: string;
  name: string;
  dateCreated: Date;
}

export function map(item: any): Piece {
  return {
    id: item.PK,
    name: item.PieceName,
    dateCreated: new Date(item.DateCreated),
  };
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
        PieceName: piece.name,
        DateCreated: date,
      },
    })
    .promise()
    .then(() => piece);
}

// TODO: write test
export async function _getPieceById(pieceId: string): Promise<Piece | null> {
  return documentClient
    .get({
      TableName: tableName,
      Key: { PK: pieceId, SK: pieceId },
    })
    .promise()
    .then((res) => (res.Item ? map(res.Item) : null));
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
            name: item.PieceName,
            dateCreated: new Date(item.DateCreated),
          }))
        : []
    );
}

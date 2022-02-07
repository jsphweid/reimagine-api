import { documentClient, tableName } from "./db-utils";

interface Segment {
  id: string;
  pieceId: string;
  lowestNote: number;
  highestNote: number;
  difficulty: number;
  midiJson: string;
  offsetTime: number;
  dateCreated: Date;
}

function mapSegment(item: any): Segment {
  return {
    id: item["PK"],
    pieceId: item["GSI1-PK"],
    lowestNote: item["Analysis"]["LowestNote"],
    highestNote: item["Analysis"]["HighestNote"],
    difficulty: item["Analysis"]["Difficulty"],
    midiJson: item["MidiJson"],
    offsetTime: item["OffsetTime"],
    dateCreated: new Date(item["DateCreated"]),
  };
}

export async function saveSegment(segment: Segment): Promise<Segment> {
  const date = segment.dateCreated.toISOString();
  return documentClient
    .put({
      TableName: tableName,
      Item: {
        PK: segment.id,
        SK: segment.id,
        Type: "Segment",
        DateCreated: date,
        Analysis: {
          LowestNote: segment.lowestNote,
          HighestNote: segment.highestNote,
          Difficulty: segment.difficulty,
        },
        MidiJson: segment.midiJson,
        OffsetTime: segment.offsetTime,
        "GSI1-PK": segment.pieceId,
        "GSI1-SK": `Segment#${date}#${segment.id}`,
      },
    })
    .promise()
    .then(() => segment);
}

export async function getSegmentById(
  segmentId: string
): Promise<Segment | null> {
  return documentClient
    .get({
      TableName: tableName,
      Key: { PK: segmentId, SK: segmentId },
    })
    .promise()
    .then((res) => (res.Item ? mapSegment(res.Item) : null));
}

export async function getRandomSegment() {
  // TODO: implement
}

export async function getSegmentsByPieceId(
  pieceId: string
): Promise<Segment[]> {
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
        ":startsWith": "Segment#",
      },
    })
    .promise()
    .then((res) => {
      return res.Items ? res.Items.map(mapSegment) : [];
    });
}

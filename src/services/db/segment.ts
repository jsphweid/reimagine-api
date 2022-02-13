import { documentClient, tableName } from "./db-utils";

interface Segment {
  id: string;
  arrangementId: string;
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
    arrangementId: item["GSI1-PK"],
    lowestNote: item["Analysis"]["LowestNote"],
    highestNote: item["Analysis"]["HighestNote"],
    difficulty: item["Analysis"]["Difficulty"],
    midiJson: item["MidiJson"],
    offsetTime: item["OffsetTime"],
    dateCreated: new Date(item["DateCreated"]),
  };
}

export async function _saveSegment(segment: Segment): Promise<Segment> {
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
        "GSI1-PK": segment.arrangementId,
        "GSI1-SK": `Segment#${date}#${segment.id}`,
      },
    })
    .promise()
    .then(() => segment);
}

export async function _getSegmentById(
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

export async function _getRandomSegment() {
  // TODO: implement
}

export async function _getSegmentsByArrangementId(
  arrangementId: string
): Promise<Segment[]> {
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
        ":startsWith": "Segment#",
      },
    })
    .promise()
    .then((res) => {
      return res.Items ? res.Items.map(mapSegment) : [];
    });
}

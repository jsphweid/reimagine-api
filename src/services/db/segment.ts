import { Note } from "midi-segmentizer";

import { Utils } from "../../utils";
import { documentClient, tableName } from "./db-utils";

export interface Segment {
  id: string;
  bpm: number;
  arrangementId: string;
  lowestNote: number;
  highestNote: number;
  difficulty?: number | null;
  notes: Note[];
  offset: number;
  numRecordings?: number;
  dateCreated: Date;
}

function mapSegment(item: any): Segment {
  return {
    id: item["PK"],
    arrangementId: item["GSI1-PK"],
    lowestNote: item["Analysis"]["LowestNote"],
    highestNote: item["Analysis"]["HighestNote"],
    difficulty: item["Analysis"]["Difficulty"],
    notes: item["Notes"],
    offset: item["OffsetTime"],
    bpm: item["BPM"],
    numRecordings: item["RecordingCount"],
    dateCreated: new Date(item["DateCreated"]),
  };
}

function mapSegmentToDbItem(segment: Segment) {
  const date = segment.dateCreated.toISOString();
  return {
    PK: segment.id,
    SK: segment.id,
    Type: "Segment",
    DateCreated: date,
    Analysis: {
      LowestNote: segment.lowestNote,
      HighestNote: segment.highestNote,
      Difficulty: segment.difficulty,
    },
    BPM: segment.bpm,
    Notes: segment.notes,
    OffsetTime: segment.offset,
    RecordingCount: 0,
    "GSI1-PK": segment.arrangementId,
    "GSI1-SK": `Segment#${date}#${segment.id}`,
  };
}

export async function _saveSegments(segments: Segment[]): Promise<Segment[]> {
  const items = segments.map(mapSegmentToDbItem);
  try {
    await Utils.dynamoDbBatchWrite(tableName, items);
  } catch (e) {
    console.info("Couldn't batch save segments... reverting by deleting any");
    console.info(e);
    const keys = segments.map(({ id }) => ({ PK: id, SK: id }));
    await Utils.dynamoDbBatchDelete(tableName, keys);
    console.info("Revert successful");
    throw new Error("Could not save segments!");
  }
  return items.map(mapSegment);
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

export async function _getNextSegment(): Promise<Segment> {
  // uses a sparse index to get a segment that hasn't been recorded much
  // NOTE: for now we'll just assume this always works
  // TODO: this whole system of choosing the next segment could be independent
  let i = 0;
  let segment: Segment | null = null;
  while (true) {
    if (i > 100) {
      throw new Error("Couldn't find a new segment in enough tries.");
    }
    if (segment) {
      return segment;
    }
    await documentClient
      .scan({
        TableName: tableName,
        IndexName: "GSI3",
        FilterExpression: "#col = :val",
        ExpressionAttributeNames: {
          "#col": "RecordingCount",
        },
        ExpressionAttributeValues: {
          ":val": i,
        },
      })
      .promise()
      .then((res) => {
        if (res.Items?.length) {
          const randomItem = Utils.pickRandom(res.Items);
          segment = mapSegment(randomItem);
        }
      });
    i++;
  }
}

export async function _deleteSegmentsByArrangementId(arrangementId: string) {
  // TODO: write tests
  const segments = await _getSegmentsByArrangementId(arrangementId);
  const keys = segments.map((s) => ({ PK: s.id, SK: s.id }));
  await Utils.dynamoDbBatchDelete(tableName, keys);
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

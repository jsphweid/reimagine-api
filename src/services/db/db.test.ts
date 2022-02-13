import * as AWS from "aws-sdk";

import { DB } from ".";
import { Utils } from "../../utils";

AWS.config.region = "us-west-2";

const documentClient = new AWS.DynamoDB.DocumentClient({
  endpoint: "localhost:8000",
  sslEnabled: false,
  region: "local-env",
});
const tableName = process.env.DYNAMODB_TABLE_NAME as string;

const clearTable = async () => {
  let items: any[] = [];
  const scan = async (startKey?: AWS.DynamoDB.Key) => {
    const response = await documentClient
      .scan({
        TableName: tableName,
        ExclusiveStartKey: startKey,
      })
      .promise();
    response.Items?.forEach((item) => {
      items.push(item);
    });
    if (typeof response.LastEvaluatedKey !== "undefined") {
      await scan(response.LastEvaluatedKey);
    }
  };
  await scan();

  const chunks = Utils.chunkArray(items, 25);
  for (const chunk of chunks) {
    await documentClient
      .batchWrite({
        RequestItems: {
          [tableName]: chunk.map((item) => ({
            DeleteRequest: {
              Key: { PK: item.PK, SK: item.SK },
            },
          })),
        },
      })
      .promise();
  }
};

describe("DB tests", () => {
  afterEach(async () => {
    await clearTable();
  });

  test("userSettings", async () => {
    const userId = "abc123";
    const initialSettings = { notesOnSegmentPlay: true };
    const update = { notesOnSegmentPlay: false, notesOnRecord: false };
    const expectedFinalSettings = { ...initialSettings, ...update };

    expect(await DB.getUserSettings(userId)).toBeNull();

    expect(await DB.upsertUserSettings(userId, initialSettings)).toEqual(
      initialSettings
    );

    expect(await DB.getUserSettings(userId)).toEqual(initialSettings);

    expect(await DB.upsertUserSettings(userId, update)).toEqual(
      expectedFinalSettings
    );

    expect(await DB.getUserSettings(userId)).toEqual(expectedFinalSettings);
  });

  test("recording", async () => {
    const rec1 = {
      id: "rec1",
      segmentId: "seg1",
      userId: "user1",
      objectKey: "objectkey1",
      samplingRate: 44100,
      dateCreated: new Date(),
    };

    const rec2 = {
      id: "rec2",
      segmentId: "seg2",
      userId: null,
      objectKey: "objectkey2",
      samplingRate: 44100,
      dateCreated: new Date(),
    };

    await DB.saveRecording(rec1);
    await DB.saveRecording(rec2);

    expect(await DB.getRecordingById(rec1.id)).toEqual(rec1);
    expect(await DB.getRecordingById(rec2.id)).toEqual(rec2);
    expect(await DB.getRecordingsByUserId(rec1.userId)).toEqual([rec1]);
    expect(await DB.getRecordingsBySegmentId(rec1.segmentId)).toEqual([rec1]);
    expect(await DB.getRecordingsBySegmentId(rec2.segmentId)).toEqual([rec2]);
  });

  test("segment", async () => {
    const seg1 = {
      id: "seg1",
      pieceId: "piece1",
      lowestNote: 1,
      highestNote: 2,
      difficulty: 3,
      midiJson: "{}",
      offsetTime: 1.111,
      dateCreated: new Date(),
    };
    const seg2 = {
      id: "seg2",
      pieceId: "piece2",
      lowestNote: 2,
      highestNote: 3,
      difficulty: 4,
      midiJson: "{}",
      offsetTime: 2.222,
      dateCreated: new Date(),
    };

    await DB.saveSegment(seg1);
    await DB.saveSegment(seg2);

    expect(await DB.getSegmentById(seg1.id)).toEqual(seg1);
    expect(await DB.getSegmentById(seg2.id)).toEqual(seg2);
    expect(await DB.getSegmentsByPieceId(seg1.pieceId)).toEqual([seg1]);
    expect(await DB.getSegmentsByPieceId(seg2.pieceId)).toEqual([seg2]);
  });

  test("mix", async () => {
    const mix1 = {
      id: "mix1",
      pieceId: "pieceId1",
      objectKey: "objectKey1",
      dateCreated: new Date(),
    };
    const mix2 = {
      id: "mix2",
      pieceId: "pieceId2",
      objectKey: "objectKey2",
      dateCreated: new Date(),
    };

    await DB.saveMix({ ...mix1, recordingIds: ["r1", "r2", "r3"] });
    await DB.saveMix({ ...mix2, recordingIds: ["r2", "r3", "r4"] });

    expect(await DB.getMixesByPieceId(mix1.pieceId)).toEqual([mix1]);
    expect(await DB.getMixesByPieceId(mix2.pieceId)).toEqual([mix2]);
    expect(await DB.getMixesByRecordingId("r1")).toEqual([mix1]);
    expect(await DB.getMixesByRecordingId("r2")).toEqual([mix1, mix2]);
    expect(await DB.getMixesByRecordingId("r3")).toEqual([mix1, mix2]);
    expect(await DB.getMixesByRecordingId("r4")).toEqual([mix2]);
  });
});

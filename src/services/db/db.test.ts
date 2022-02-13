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
    const update = { notesOnSegmentPlay: false, notesOnRecord: false };

    // should retrieve the default response since it doesn't exist
    expect(await DB.getUserSettings(userId)).toEqual({
      notesOnSegmentPlay: true,
    });

    const combined = { notesOnRecordingPlay: true, notesOnSegmentPlay: true };
    expect(
      await DB.upsertUserSettings(userId, { notesOnRecordingPlay: true })
    ).toEqual(combined);

    expect(await DB.getUserSettings(userId)).toEqual(combined);
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
      arrangementId: "arrangement1",
      lowestNote: 1,
      highestNote: 2,
      difficulty: 3,
      midiJson: "{}",
      offsetTime: 1.111,
      dateCreated: new Date(),
    };
    const seg2 = {
      id: "seg2",
      arrangementId: "arrangement2",
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
    expect(await DB.getSegmentsByArrangementId(seg1.arrangementId)).toEqual([
      seg1,
    ]);
    expect(await DB.getSegmentsByArrangementId(seg2.arrangementId)).toEqual([
      seg2,
    ]);
  });

  test("mix", async () => {
    const mix1 = {
      id: "mix1",
      arrangementId: "arrangementId1",
      objectKey: "objectKey1",
      dateCreated: new Date(),
    };
    const mix2 = {
      id: "mix2",
      arrangementId: "arrangementId2",
      objectKey: "objectKey2",
      dateCreated: new Date(),
    };

    await DB.saveMix({ ...mix1, recordingIds: ["r1", "r2", "r3"] });
    await DB.saveMix({ ...mix2, recordingIds: ["r2", "r3", "r4"] });

    expect(await DB.getMixesByArrangementId(mix1.arrangementId)).toEqual([
      mix1,
    ]);
    expect(await DB.getMixesByArrangementId(mix2.arrangementId)).toEqual([
      mix2,
    ]);
    expect(await DB.getMixesByRecordingId("r1")).toEqual([mix1]);
    expect(await DB.getMixesByRecordingId("r2")).toEqual([mix1, mix2]);
    expect(await DB.getMixesByRecordingId("r3")).toEqual([mix1, mix2]);
    expect(await DB.getMixesByRecordingId("r4")).toEqual([mix2]);
  });

  test("arrangement", async () => {
    const arr1 = {
      id: "arr1",
      pieceId: "pieceId1",
      dateCreated: new Date(),
    };
    const arr2 = {
      id: "arr2",
      pieceId: "pieceId2",
      dateCreated: new Date(),
    };

    await DB.saveArrangement(arr1);
    await DB.saveArrangement(arr2);

    expect(await DB.getArrangementById(arr1.id)).toEqual(arr1);
    expect(await DB.getArrangementById(arr2.id)).toEqual(arr2);
    expect(await DB.getArrangementsByPieceId(arr1.pieceId)).toEqual([arr1]);
    expect(await DB.getArrangementsByPieceId(arr2.pieceId)).toEqual([arr2]);
  });

  test("piece", async () => {
    const piece1 = { id: "piece1", dateCreated: new Date() };
    const piece2 = { id: "piece2", dateCreated: new Date() };

    await DB.savePiece(piece1);
    await DB.savePiece(piece2);

    // make sure there is at least something else in DB
    await DB.saveArrangement({
      id: "mix2",
      pieceId: piece1.id,
      dateCreated: new Date(),
    });

    const res = await DB.getAllPieces();
    expect(res).toHaveLength(2);
    expect(res).toContainEqual(piece1);
    expect(res).toContainEqual(piece2);
  });
});

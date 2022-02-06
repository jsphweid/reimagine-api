import { Client } from "pg";
import { pickRandomItem, synthesizeSegments } from "../common/helpers";
import { Context, Callback } from "aws-lambda";
import { RecordingType, SegmentDataType } from "../common/types";
const aws = require("aws-sdk");
const s3 = new aws.S3();
const wav = require("node-wav");
import * as fs from "fs";

function makeSegments(rows: any[]): Map<string, RecordingType[]> {
  const segments: Map<string, RecordingType[]> = new Map();
  rows.forEach((item: RecordingType) => {
    const bin = segments.get(item.segmentId);
    if (bin) {
      const newBin = bin.slice();
      newBin.push(item);
      segments.set(item.segmentId, newBin);
    } else {
      segments.set(item.segmentId, [item]);
    }
  });
  return segments;
}

export async function synthesize(
  event: any,
  context: Context,
  callback: Callback
) {
  try {
    const { pieceId } = event.body;
    // it gets everything it can
    const client = new Client({
      user: "reimagine_admin",
      host: "reimagineinstance.czbydqdgzi5u.us-east-1.rds.amazonaws.com",
      database: "reimagine_db",
      password: "reimaginejoseph",
      port: 5432,
    });
    await client.connect();
    const result = await client.query(`
	        SELECT "s3Key", "offsetTime", "segmentId"
	        FROM recording
	        LEFT JOIN segment on recording."segmentId" = segment.id
	        WHERE segment."pieceId" = '${pieceId}'
	        GROUP BY "segmentId", "s3Key", "offsetTime";
	    `);

    if (!result.rows && !result.rows.length)
      throw `couldn't find that pieceId => ${pieceId}`;
    const selections: RecordingType[] = [];
    const segments: Map<string, RecordingType[]> = makeSegments(result.rows);
    segments.forEach((value, key) => {
      selections.push(pickRandomItem(value));
    });
    const getRequests = selections.map((selection: RecordingType) => ({
      Bucket: "reimagine.io-warehouse",
      Key: selection.s3Key,
    }));

    return Promise.all(
      getRequests.map((getRequest) => s3.getObject(getRequest).promise())
    )
      .then((responses) => {
        const arrsOfData: SegmentDataType[] = responses.map(
          (response, index) => ({
            startIndex: selections[index].offsetTime * 44100,
            arr: wav.decode(response.Body).channelData[0],
          })
        );

        const finalAudioArr: Float32Array = synthesizeSegments(arrsOfData);
        const finalBuffer = wav.encode([finalAudioArr], {
          sampleRate: 44100,
          float: true,
          bitDepth: 32,
        });
        fs.writeFileSync("./file.wav", finalBuffer);
        callback();
      })
      .catch((error) => {
        console.log("error", error);
        callback();
      });
  } catch (e) {
    console.log("e", e);
    return { error: JSON.stringify(e) };
  }
}

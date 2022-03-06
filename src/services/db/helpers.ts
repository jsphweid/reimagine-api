import { DB } from ".";
import { Utils } from "../../utils";
import { Recording } from "./recording";

export async function _getArrangementIdFromRecording(
  recording: Recording
): Promise<string | null> {
  // probably should just denomarlize so we don't have to do all this
  const segment = await DB.getSegmentById(recording.segmentId);
  if (!segment) return null;
  const arrangement = await DB.getArrangementById(segment.arrangementId);
  return arrangement?.id ?? null;
}

export async function _getRandomRecording(segmentId: string) {
  const recordings = await DB.getRecordingsBySegmentId(segmentId);
  return recordings.length ? Utils.pickRandom(recordings) : null;
}

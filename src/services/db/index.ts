import { _getMixesByPieceId, _getMixesByRecordingId, _saveMix } from "./mix";
import {
  _getRecordingById,
  _getRecordingsBySegmentId,
  _getRecordingsByUserId,
  _saveRecording,
} from "./recording";
import {
  _getRandomSegment,
  _getSegmentById,
  _getSegmentsByPieceId,
  _saveSegment,
} from "./segment";
import { _getUserSettings, _upsertUserSettings } from "./user-settings";

export namespace DB {
  export const saveMix = _saveMix;
  export const getMixesByPieceId = _getMixesByPieceId;
  export const getMixesByRecordingId = _getMixesByRecordingId;

  export const getUserSettings = _getUserSettings;
  export const upsertUserSettings = _upsertUserSettings;

  export const saveSegment = _saveSegment;
  export const getSegmentById = _getSegmentById;
  export const getRandomSegment = _getRandomSegment;
  export const getSegmentsByPieceId = _getSegmentsByPieceId;

  export const getRecordingById = _getRecordingById;
  export const saveRecording = _saveRecording;
  export const getRecordingsByUserId = _getRecordingsByUserId;
  export const getRecordingsBySegmentId = _getRecordingsBySegmentId;
}

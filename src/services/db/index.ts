import {
  _deleteArrangementById,
  _getArrangementById,
  _getArrangementsByPieceId,
  _saveArrangement,
} from "./arrangement";
import {
  _getMixesByArrangementId,
  _getMixesByRecordingId,
  _saveMix,
} from "./mix";
import { _getAllPieces, _getPieceById, _savePiece } from "./piece";
import {
  _getRecordingById,
  _getRecordingsBySegmentId,
  _getRecordingsByUserId,
  _saveRecording,
} from "./recording";
import {
  _deleteSegmentsByArrangementId,
  _getNextSegment,
  _getSegmentById,
  _getSegmentsByArrangementId,
  _saveSegments,
} from "./segment";
import { _getUserSettings, _upsertUserSettings } from "./user-settings";
// TODO: cleanup this BS

export namespace DB {
  export const saveMix = _saveMix;
  export const getMixesByArrangementId = _getMixesByArrangementId;
  export const getMixesByRecordingId = _getMixesByRecordingId;

  export const getUserSettings = _getUserSettings;
  export const upsertUserSettings = _upsertUserSettings;

  export const saveSegments = _saveSegments;
  export const getSegmentById = _getSegmentById;
  export const getNextSegment = _getNextSegment;
  export const getSegmentsByArrangementId = _getSegmentsByArrangementId;
  export const deleteSegmentsByArrangementId = _deleteSegmentsByArrangementId;

  export const getRecordingById = _getRecordingById;
  export const saveRecording = _saveRecording;
  export const getRecordingsByUserId = _getRecordingsByUserId;
  export const getRecordingsBySegmentId = _getRecordingsBySegmentId;

  export const getArrangementsByPieceId = _getArrangementsByPieceId;
  export const saveArrangement = _saveArrangement;
  export const getArrangementById = _getArrangementById;
  export const deleteArrangementById = _deleteArrangementById;

  export const getAllPieces = _getAllPieces;
  export const getPieceById = _getPieceById;
  export const savePiece = _savePiece;
}

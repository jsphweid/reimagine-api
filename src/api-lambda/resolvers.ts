import { segmentizeMidi } from "midi-segmentizer";

import { Resolvers } from "../generated";
import Executor from "../executor";
import { DB } from "../services/db";
import { Utils } from "../utils";
import { ObjectStorage } from "../services/object-storage";

export const resolvers: Resolvers = {
  Query: {
    getUserSettingsByUserId: (_, args, context) => {
      Executor.run(context.executor, (e) => e.assertUserIdOrAdmin(args.userId));
      return DB.getUserSettings(args.userId);
    },
    getMixesByArrangementId: async (_, args) => {
      const mixes = await DB.getMixesByArrangementId(args.arrangementId);
      return mixes.map(Utils.serialize);
    },
    getMixesByRecordingId: async (_, args) => {
      const res = await DB.getMixesByRecordingId(args.recordingId);
      return res.map(Utils.serialize);
    },
    getArrangementsByPieceId: async (_, args) => {
      const res = await DB.getArrangementsByPieceId(args.pieceId);
      return res.map(Utils.serialize);
    },
    getArrangementByIds: async (_, args) => {
      const res = await Promise.all(
        args.arrangementIds.map(DB.getArrangementById)
      );
      return res.map(Utils.serialize);
    },
    getRecordingsByIds: async (_, args) => {
      const res = await Promise.all(args.recordingIds.map(DB.getRecordingById));
      return res.map(Utils.serialize);
    },
    getRecordingsByUserId: async (_, args, context) => {
      Executor.run(context.executor, (e) => e.assertUserIdOrAdmin(args.userId));
      const res = await DB.getRecordingsByUserId(args.userId);
      return res.map(Utils.serialize);
    },
    getSegmentById: async (_, args) => {
      const res = await DB.getSegmentById(args.segmentId);
      return res ? Utils.serialize(res) : null;
    },
    getAllPieces: async () => {
      const res = await DB.getAllPieces();
      return res ? res.map(Utils.serialize) : [];
    },
  },
  Mutation: {
    updateUserSettings: (_, args, context) => {
      Executor.run(context.executor, (e) => e.assertUserIdOrAdmin(args.userId));
      return DB.upsertUserSettings(args.userId, args.input);
    },
    createSimpleArrangement: async (_, args, context) => {
      Executor.run(context.executor, (e) => e.assertIsAdmin());
      const segments = segmentizeMidi(args.base64Blob);
      if (!segments) {
        throw new Error("Invalid MIDI file.");
      }
      const id = Utils.generateGUID();
      const arrangement = await DB.saveArrangement(
        { id, pieceId: args.pieceId, dateCreated: context.now },
        segments.map((s) => ({
          ...s,
          arrangementId: id,
          id: Utils.generateGUID(),
          dateCreated: context.now,
        }))
      );
      return Utils.serialize(arrangement);
    },
    createPiece: async (_, args, context) => {
      Executor.run(context.executor, (e) => e.assertIsAdmin());
      const piece = {
        id: Utils.generateGUID(),
        name: args.name,
        dateCreated: context.now,
      };
      await DB.savePiece(piece);
      return Utils.serialize(piece);
    },
    createRecording: async (_, args, context) => {
      // TODO: should rate limit somehow
      const { base64Blob, samplingRate, segmentId } = args;
      const id = Utils.generateGUID();
      const isoDate = context.now.toISOString();
      const objectKey = `recording-${isoDate}-${Utils.generateGUID()}.wav`;
      const recording = {
        id: id,
        segmentId: segmentId,
        objectKey,
        samplingRate,
        userId: context.executor?.userId || null,
        dateCreated: context.now,
      };
      await ObjectStorage.uploadBuffer(
        Buffer.from(base64Blob, "base64"),
        objectKey
      );
      await DB.saveRecording(recording);
      return Utils.serialize(recording);
    },
    deleteArrangement: async (_, args, context) => {
      Executor.run(context.executor, (e) => e.assertIsAdmin());
      // NOTE: for now this doesn't delete relevant recordings
      // in S3 just the arrangement and its segments

      // TODO: should this handle both deletions?
      await DB.deleteSegmentsByArrangementId(args.arrangementId);
      await DB.deleteArrangementById(args.arrangementId);
      return "Successful";
    },
  },
};

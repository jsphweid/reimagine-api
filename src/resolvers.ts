import { segmentizeMidi } from "midi-segmentizer";

import { Resolvers } from "./generated";
import Executor from "./executor";
import { DB } from "./services/db";
import { Utils } from "./utils";
import { ObjectStorage } from "./services/object-storage";
import { Recording } from "./services/db/recording";

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
      return res.map(Utils.attachedPresigned).map(Utils.serialize);
    },
    getRecordingsByUserId: async (_, args, context) => {
      Executor.run(context.executor, (e) => e.assertUserIdOrAdmin(args.userId));
      const res = await DB.getRecordingsByUserId(args.userId);
      return res
        .map(Utils.attachedPresigned)
        .map(Utils.serialize)
        .map((v) => v!); // NOTE: makes types happy for now
    },
    getSegmentById: async (_, args) => {
      const res = await DB.getSegmentById(args.segmentId);
      return res ? Utils.serialize(res) : null;
    },
    getAllPieces: async () => {
      const res = await DB.getAllPieces();
      return res ? res.map(Utils.serialize) : [];
    },
    getNextSegment: async () => {
      // TODO: rate limit somehow
      const res = await DB.getNextSegment();
      return Utils.serialize(res);
    },
  },
  Mutation: {
    updateUserSettings: (_, args, context) => {
      Executor.run(context.executor, (e) => e.assertUserIdOrAdmin(args.userId));
      return DB.upsertUserSettings(args.userId, args.input);
    },
    createRandomMix: async (_, __, context) => {
      // NOTE: very heavy handed way of doing this but should be fine while low load
      Executor.run(context.executor, (e) => e.assertIsAdmin());
      const pieces = await DB.getAllPieces();
      const groups = await Promise.all(
        pieces.map((p) => p.id).map(DB.getArrangementsByPieceId)
      );
      const arrangements = Utils.flatten(groups);
      for (const arrangement of arrangements) {
        const segments = await DB.getSegmentsByArrangementId(arrangement.id);
        const choices: Recording[] = [];
        for (const segment of segments) {
          const recordings = await DB.getRecordingsBySegmentId(segment.id);
          choices.push(Utils.pickRandom(recordings));
        }

        if (segments.length === choices.length) {
          // We have at least one of each!
        }
      }

      return null;
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
      const { base64Blob, sampleRate, segmentId } = args;

      if (!base64Blob.startsWith("data:audio/wav;base64")) {
        throw new Error("For now only .wav recordings can be uploaded.");
      }

      const id = Utils.generateGUID();
      const objectKey = `recording-${Utils.generateGUID()}.wav`;
      const recording = {
        id: id,
        segmentId: segmentId,
        objectKey,
        sampleRate,
        userId: context.executor?.userId || null,
        dateCreated: context.now,
      };
      await ObjectStorage.uploadBuffer(
        Buffer.from(base64Blob.replace("data:audio/wav;base64,", ""), "base64"),
        objectKey
      );
      await DB.saveRecording(recording);
      return Utils.serialize(Utils.attachedPresigned(recording));
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

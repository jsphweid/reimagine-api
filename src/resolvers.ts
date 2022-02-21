import { segmentizeMidi } from "midi-segmentizer";
import { getGraphQLRateLimiter } from "graphql-rate-limit";

import { Resolvers } from "./generated";
import Executor from "./executor";
import { DB } from "./services/db";
import { Utils } from "./utils";
import { ObjectStorage } from "./services/object-storage";
import { makeMix } from "./wav";

const _rateLimiter = getGraphQLRateLimiter({
  identifyContext: (ctx) => ctx.id,
});

const limit: ReturnType<typeof getGraphQLRateLimiter> = async (obj1, obj2) => {
  const errorMessage = await _rateLimiter(obj1, obj2);
  if (errorMessage) {
    throw new Error(errorMessage);
  }
  return undefined;
};

export const resolvers: Resolvers = {
  Query: {
    getUserSettingsByUserId: (_, args, context) => {
      Executor.run(context.executor, (e) => e.assertUserIdOrAdmin(args.userId));
      return DB.getUserSettings(args.userId);
    },
    getMixesByArrangementId: async (_, args) => {
      const mixes = await DB.getMixesByArrangementId(args.arrangementId);
      return mixes.map(Utils.serialize).map(Utils.attachPresigned);
    },
    getMixesByRecordingId: async (_, args) => {
      const res = await DB.getMixesByRecordingId(args.recordingId);
      return res.map(Utils.serialize).map(Utils.attachPresigned);
    },
    getArrangementsByPieceId: async (_, args) => {
      const res = await DB.getArrangementsByPieceId(args.pieceId);
      return res.map(Utils.serialize);
    },
    getArrangementByIds: async (_, args) => {
      const res = await Promise.all(
        args.arrangementIds.map(DB.getArrangementById)
      );
      return res.map(Utils.maybeSerialize);
    },
    getRecordingsByIds: async (_, args) => {
      const res = await Promise.all(args.recordingIds.map(DB.getRecordingById));
      return res.map(Utils.maybeAttachedPresigned).map(Utils.maybeSerialize);
    },
    getRecordingsByUserId: async (_, args, context) => {
      Executor.run(context.executor, (e) => e.assertUserIdOrAdmin(args.userId));
      const res = await DB.getRecordingsByUserId(args.userId);
      return res.map(Utils.attachPresigned).map(Utils.serialize);
    },
    getSegmentById: async (_, args) => {
      const res = await DB.getSegmentById(args.segmentId);
      return res ? Utils.serialize(res) : null;
    },
    getAllPieces: async () => {
      const res = await DB.getAllPieces();
      return res ? res.map(Utils.serialize) : [];
    },
    getNextSegment: async (parent, args, context, info) => {
      await limit({ parent, args, context, info }, { max: 5, window: "10s" });
      const res = await DB.getNextSegment();
      return Utils.serialize(res);
    },
    getMixesByUserId: async (parent, args, context, info) => {
      await limit({ parent, args, context, info }, { max: 5, window: "10s" });
      Executor.run(context.executor, (e) => e.assertUserIdOrAdmin(args.userId));
      const recordings = await DB.getRecordingsByUserId(args.userId);
      const recordingIds = Utils.removeDuplicates(recordings).map((r) => r.id);
      const mixes = Utils.flatten(
        await Promise.all(recordingIds.map(DB.getMixesByRecordingId))
      );
      const res = Utils.removeDuplicates(mixes)
        .map(Utils.serialize)
        .map(Utils.attachPresigned);

      return res.sort((a, b) => (b.dateCreated < a.dateCreated ? -1 : 1));
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
        const choices = [];
        for (const segment of segments) {
          const recordings = await DB.getRecordingsBySegmentId(segment.id);
          const choice = Utils.pickRandom(recordings);

          if (!choice) {
            break;
          }

          choices.push({
            ...choice,
            offset: segment.offset,
            recordingId: choice.id,
          });
        }

        if (segments.length === choices.length) {
          // We have at least one of each!
          const buffer = await makeMix(choices);
          const objectKey = `mix-${Utils.generateGUID()}.wav`;
          await ObjectStorage.uploadBuffer(buffer, objectKey);
          const id = Utils.generateGUID();
          const dateCreated = new Date();
          await DB.saveMix({
            id,
            arrangementId: arrangement.id,
            objectKey,
            dateCreated,
            recordingIds: choices.map((c) => c.recordingId),
          });
          return Utils.serialize({
            id,
            dateCreated,
            url: ObjectStorage.getPresignedUrl(objectKey),
          });
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
    createRecording: async (parent, args, context, info) => {
      await limit({ parent, args, context, info }, { max: 3, window: "10s" });
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
      return Utils.serialize(Utils.attachPresigned(recording));
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

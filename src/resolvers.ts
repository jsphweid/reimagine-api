import { segmentizeMidi } from "midi-segmentizer";
import { getGraphQLRateLimiter } from "graphql-rate-limit";

import { Resolvers } from "./generated";
import Executor from "./executor";
import { DB } from "./services/db";
import { Utils } from "./utils";
import { ObjectStorage } from "./services/object-storage";
import * as Wav from "./wav";
import { DEFAULT_USER_SETTINGS } from "./services/db/user-settings";

const _rateLimiter = getGraphQLRateLimiter({
  identifyContext: (ctx) => ctx.id,
});

const limit: ReturnType<typeof getGraphQLRateLimiter> = async (obj1, obj2) => {
  const errorMessage = await _rateLimiter(obj1, obj2);
  const isAdmin = obj1.context.executor?.isAdmin();
  if (errorMessage && !isAdmin) {
    throw new Error(errorMessage);
  }
  return undefined;
};

export const resolvers: Resolvers = {
  Mix: {
    arrangement: async (source) => {
      // TODO: use mapper
      const arrId: string = (source as any).arrangementId;
      return DB.getArrangementById(arrId).then(Utils.maybeSerialize);
    },
  },
  Piece: {
    arrangements: async (source) => {
      // TODO: use mapper
      const pieceId: string = (source as any).id;
      const arrangements = await DB.getArrangementsByPieceId(pieceId);
      return arrangements.map(Utils.serialize);
    },
  },
  Arrangement: {
    piece: async (source) => {
      // TODO: use mapper
      const pieceId: string = (source as any).pieceId;
      return DB.getPieceById(pieceId).then(Utils.maybeSerialize);
    },
    mixes: async (source) => {
      // TODO: use mapper
      const arrangementId: string = (source as any).id;
      const res = await DB.getMixesByArrangementId(arrangementId);
      return res.map(Utils.attachPresigned).map(Utils.serialize);
    },
    segments: async (source) => {
      // TODO: use mapper
      const arrangementId: string = (source as any).id;
      const segments = await DB.getSegmentsByArrangementId(arrangementId);
      return Utils.sortSegments(segments).map(Utils.serialize);
    },
    myRecordings: async (source, _, context) => {
      // TODO: use mapper
      const arrangementId: string = (source as any).id;
      const segments = await DB.getSegmentsByArrangementId(arrangementId);
      const segmentIds = new Set(segments.map((s) => s.id));
      const userId = context.executor?.userId;
      if (!userId) return null;
      const recordings = await DB.getRecordingsByUserId(userId);
      return recordings
        .filter((r) => segmentIds.has(r.segmentId))
        .map(Utils.attachPresigned)
        .map(Utils.serialize);
    },
  },
  Query: {
    getUserSettingsByUserId: (_, args, context) => {
      const userId = args.userId;
      if (userId) {
        Executor.run(context.executor, (e) => e.assertUserIdOrAdmin(userId));
        return DB.getUserSettings(userId);
      } else {
        return DEFAULT_USER_SETTINGS;
      }
    },
    getPieceById: async (_, args) => {
      const res = await DB.getPieceById(args.pieceId);
      return Utils.maybeSerialize(res);
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
    getArrangementById: async (_, args) => {
      const res = await DB.getArrangementById(args.arrangementId);
      return Utils.maybeSerialize(res);
    },
    getArrangementByIds: async (_, args) => {
      const res = await Promise.all(
        args.arrangementIds.map(DB.getArrangementById)
      );
      return res.map(Utils.maybeSerialize);
    },
    getArrangementByRecordingId: async (_, args) => {
      const recording = await DB.getRecordingById(args.recordingId);
      if (!recording) return null;
      const arrangementId = await DB.getArrangementIdFromRecording(recording);
      if (!arrangementId) return null;
      return Utils.maybeSerialize(await DB.getArrangementById(arrangementId));
    },
    getRecordingById: async (_, args) => {
      const res = await DB.getRecordingById(args.recordingId);
      return Utils.maybeSerialize(Utils.maybeAttachedPresigned(res));
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
    getMixesWithMe: async (parent, args, context, info) => {
      await limit({ parent, args, context, info }, { max: 5, window: "10s" });
      const userId = context.executor?.userId;
      if (!userId) return [];
      const recordings = await DB.getRecordingsByUserId(userId);
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
    createMix: async (parent, args, context, info) => {
      await limit({ parent, args, context, info }, { max: 3, window: "10s" });
      const { allowPartial, fill, recordingIds } = args;
      if (recordingIds.length === 0) {
        throw new Error("Must have at least 1 recording...");
      }
      const recordings = await Promise.all(
        recordingIds.map(DB.getRecordingById)
      ).then((res) => res.filter(Utils.isTruthy));

      if (recordings.length !== recordingIds.length) {
        throw new Error("Couldn't find all the necessary recordings.");
      }

      const existingSegIds = new Set();

      recordings.forEach((r) => {
        if (existingSegIds.has(r.segmentId)) {
          throw new Error("Can't mix two recordings with the same segment.");
        } else {
          existingSegIds.add(r.segmentId);
        }
      });

      const arrId = await DB.getArrangementIdFromRecording(recordings[0]);
      const segments = await DB.getSegmentsByArrangementId(arrId!);
      const range = allowPartial ? Utils.getRange(recordings, segments) : null;
      const segmentsLookup = Utils.createLookup(segments);

      let missingSegs = segments.filter((seg) => !existingSegIds.has(seg.id));

      if (missingSegs && !allowPartial) {
        throw new Error(
          `Can't create a complete mix because you're missing ${missingSegs.length} recordings... Consider setting 'allowPartial`
        );
      }

      // we may only care about segments in a range
      if (range) {
        missingSegs = missingSegs.filter(
          (seg) => range.min <= seg.offset && seg.offset <= range.max
        );
      }

      const choices = recordings.map((r) => ({
        ...r,
        offset: segmentsLookup[r.segmentId]!.offset,
        recordingId: r.id,
      }));

      if (fill) {
        for (const segment of missingSegs) {
          const recording = await DB.getRandomRecording(segment.id);

          if (!recording) {
            throw new Error("There aren't enough recordings to make a mix...");
          }

          choices.push({
            ...recording,
            offset: segment.offset,
            recordingId: recording.id,
          });
        }
      }

      // TODO: refactor this since it's mostly the same as other fn...
      const { buffer, duration } = await Wav.makeMix(choices);
      const objectKey = `mix-${Utils.generateGUID()}.wav`;
      await ObjectStorage.uploadBuffer(buffer, objectKey);
      const id = Utils.generateGUID();
      const dateCreated = new Date();
      const mix = await DB.saveMix({
        id,
        isPartial: choices.length === segments.length,
        arrangementId: arrId!,
        duration,
        objectKey,
        dateCreated,
        recordingIds: choices.map((c) => c.recordingId),
      });
      return Utils.attachPresigned(Utils.serialize(mix));
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
          const choice = await DB.getRandomRecording(segment.id);

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
          const { buffer, duration } = await Wav.makeMix(choices);
          const objectKey = `mix-${Utils.generateGUID()}.wav`;
          await ObjectStorage.uploadBuffer(buffer, objectKey);
          const id = Utils.generateGUID();
          const dateCreated = new Date();
          const mix = await DB.saveMix({
            id,
            isPartial: false,
            arrangementId: arrangement.id,
            duration,
            objectKey,
            dateCreated,
            recordingIds: choices.map((c) => c.recordingId),
          });
          return Utils.attachPresigned(Utils.serialize(mix));
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
        {
          id,
          name: args.name,
          pieceId: args.pieceId,
          dateCreated: context.now,
        },
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
      const buffer = Buffer.from(
        base64Blob.replace("data:audio/wav;base64,", ""),
        "base64"
      );
      const duration = Wav.getDuration(buffer);
      const recording = {
        id,
        segmentId,
        objectKey,
        sampleRate,
        duration,
        userId: context.executor?.userId || null,
        dateCreated: context.now,
      };
      await ObjectStorage.uploadBuffer(buffer, objectKey);
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

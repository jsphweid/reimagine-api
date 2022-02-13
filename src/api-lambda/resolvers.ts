import { Resolvers } from "../generated";
import Executor from "../executor";
import { DB } from "../services/db";
import { Utils } from "../utils";
import { ObjectStorage } from "../services/object-storage";

// TODO: maybe have a date scalar
export const mapDateCreated = <T extends { dateCreated: Date }>(
  obj: T | null
) =>
  obj
    ? {
        ...obj,
        dateCreated: obj.dateCreated.toISOString(),
      }
    : null;

export const resolvers: Resolvers = {
  Query: {
    getUserSettingsByUserId: (_, args, context) => {
      Executor.run(context.executor, (e) => e.assertUserIdOrAdmin(args.userId));
      return DB.getUserSettings(args.userId);
    },
    getMixesByPieceId: async (_, args) => {
      const mixes = await DB.getMixesByPieceId(args.pieceId);
      return mixes.map(mapDateCreated);
    },
    getMixesByRecordingId: async (_, args) => {
      const res = await DB.getMixesByRecordingId(args.recordingId);
      return res.map(mapDateCreated);
    },
    getRecordingsByIds: async (_, args) => {
      const res = await Promise.all(args.recordingIds.map(DB.getRecordingById));
      return res.map(mapDateCreated);
    },
    getRecordingsByUserId: async (_, args, context) => {
      Executor.run(context.executor, (e) => e.assertUserIdOrAdmin(args.userId));
      const res = await DB.getRecordingsByUserId(args.userId);
      return res.map(mapDateCreated);
    },
    getSegmentById: async (_, args) => {
      const res = await DB.getSegmentById(args.segmentId);
      return res ? mapDateCreated(res) : null;
    },
  },
  Mutation: {
    updateUserSettings: (_, args, context) => {
      Executor.run(context.executor, (e) => e.assertUserIdOrAdmin(args.userId));
      return DB.upsertUserSettings(args.userId, args.input);
    },
    postRecording: async (_, args, context) => {
      // TODO: should rate limit somehow
      const { base64Blob, samplingRate, segmentId } = args;
      const id = Utils.generateGUID();
      const now = new Date();
      const isoDate = now.toISOString();
      const objectKey = `recording-${isoDate}-${Utils.generateGUID()}.wav`;
      const recording = {
        id: id,
        segmentId: segmentId,
        objectKey,
        samplingRate,
        userId: context.executor?.userId || null,
        dateCreated: now,
      };
      await ObjectStorage.uploadBuffer(
        Buffer.from(base64Blob, "base64"),
        objectKey
      );
      await DB.saveRecording(recording);
      return { ...recording, dateCreated: isoDate };
    },
  },
};

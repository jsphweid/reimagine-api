import { gql } from "apollo-server-lambda";

export const typeDefs = gql`
  # type RecordingFragmentSpec {
  #   recordingId: String!
  #   startTime: Float
  #   endTime: Float
  #   offsetTime: Float
  # }

  type Segment {
    id: String
    humanHash: String
    pieceId: String
    difficulty: Int
    midiJson: String
    offsetTime: Float
    dateCreated: String
  }

  type Recording {
    id: String
    segmentId: String
    objectKey: String
    dateCreated: String
  }

  type Mix {
    id: String
    url: String
    dateCreated: String
  }

  type UserSettings {
    metronomeOnSegmentPlay: Boolean
    notesOnSegmentPlay: Boolean
    metronomeOnRecord: Boolean
    notesOnRecord: Boolean
    metronomeOnRecordingPlay: Boolean
    notesOnRecordingPlay: Boolean
  }

  input UserSettingsInput {
    metronomeOnSegmentPlay: Boolean
    notesOnSegmentPlay: Boolean
    metronomeOnRecord: Boolean
    notesOnRecord: Boolean
    metronomeOnRecordingPlay: Boolean
    notesOnRecordingPlay: Boolean
  }

  type Mutation {
    updateUserSettings(userId: String!, input: UserSettingsInput!): UserSettings

    postRecording(
      base64Blob: String!
      segmentId: String!
      samplingRate: Int!
    ): Recording

    # postMidi(fileBuffers: [String!]!): [String]
    # createMixFromRecordingFragments(
    #   recordings: [RecordingFragmentSpec]!
    # ): String
  }

  type Query {
    getUserSettingsByUserId(userId: String!): UserSettings
    getRecordingsByIds(recordingIds: [String!]!): [Recording]
    getRecordingsByUserId(userId: String!): [Recording]
    getMixesByPieceId(pieceId: String!): [Mix]
    getMixesByRecordingId(recordingId: String!): [Mix]

    # not passing a segmentId returns a random segment...
    getSegmentById(segmentId: String!): Segment
    getRandomSegment: Segment
  }
`;

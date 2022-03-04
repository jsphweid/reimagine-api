import { gql } from "apollo-server-lambda";

export const typeDefs = gql`
  type Note {
    time: Float!
    midi: Int!
    duration: Float!
    velocity: Float!
    lyric: String
  }

  type Segment {
    id: String!
    bpm: Float!
    arrangementId: String!
    difficulty: Int
    notes: [Note!]!
    offset: Float!
    highestNote: Int!
    lowestNote: Int!
    dateCreated: String!
  }

  type Recording {
    id: String!
    duration: Float!
    segmentId: String!
    objectKey: String!
    dateCreated: String!
    url: String!
  }

  type Mix {
    id: String!
    url: String!
    duration: Float!
    dateCreated: String!
    arrangement: Arrangement
  }

  type Arrangement {
    id: String!
    name: String!
    piece: Piece
    dateCreated: String!
  }

  type Piece {
    id: String!
    name: String
    dateCreated: String!
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

    createRecording(
      base64Blob: String!
      segmentId: String!
      sampleRate: Int!
    ): Recording

    createRandomMix: Mix
    createPiece(name: String!): Piece
    createSimpleArrangement(
      pieceId: String!
      name: String!
      base64Blob: String!
    ): Arrangement
    deleteArrangement(arrangementId: String!): String
  }

  type Query {
    getUserSettingsByUserId(userId: String): UserSettings
    getRecordingsByIds(recordingIds: [String!]!): [Recording]
    getRecordingsByUserId(userId: String!): [Recording!]
    getMixesByArrangementId(arrangementId: String!): [Mix!]
    getMixesByRecordingId(recordingId: String!): [Mix!]
    getMixesByUserId(userId: String!): [Mix!]
    getArrangementByIds(arrangementIds: [String!]!): [Arrangement]
    getArrangementsByPieceId(pieceId: String!): [Arrangement!]
    getAllPieces: [Piece]

    # not passing a segmentId returns a random segment...
    getSegmentById(segmentId: String!): Segment
    getNextSegment: Segment
  }
`;

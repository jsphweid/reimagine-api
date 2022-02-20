import { gql } from "apollo-server-lambda";

export const typeDefs = gql`
  type Segment {
    id: String!
    arrangementId: String!
    difficulty: Int
    midiJson: String!
    offset: Float
    highestNote: Int
    lowestNote: Int
    dateCreated: String!
  }

  type Recording {
    id: String!
    segmentId: String!
    objectKey: String!
    dateCreated: String!
    url: String!
  }

  type Mix {
    id: String!
    url: String!
    dateCreated: String!
  }

  type Arrangement {
    id: String!
    name: String
    pieceId: String!
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
    createSimpleArrangement(pieceId: String!, base64Blob: String!): Arrangement
    deleteArrangement(arrangementId: String!): String
  }

  type Query {
    getUserSettingsByUserId(userId: String!): UserSettings
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

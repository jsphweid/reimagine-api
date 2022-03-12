import { gql } from "apollo-server-lambda";

export const typeDefs = gql`
  type Note {
    time: Float!
    midi: Int!
    duration: Float!
    velocity: Float!
    lyric: String
  }

  input NoteInput {
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
    recordings: [Recording!]
  }

  input SegmentInput {
    bpm: Float!
    difficulty: Int
    notes: [NoteInput!]!
    offset: Float!
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
    isPartial: Boolean!
    duration: Float!
    dateCreated: String!
    arrangement: Arrangement
    recordings: [Recording!]
  }

  type Arrangement {
    id: String!
    name: String!
    piece: Piece
    pieceId: String!
    mixes: [Mix!]
    segments: [Segment!]
    myRecordings: [Recording!]
    dateCreated: String!
  }

  type Piece {
    id: String!
    name: String
    arrangements: [Arrangement!]
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

    createMix(
      recordingIds: [String!]!
      fill: Boolean
      allowPartial: Boolean
    ): Mix
    createRandomMix: Mix
    createPiece(name: String!): Piece
    createSimpleArrangement(
      pieceId: String!
      name: String!
      base64Blob: String!
    ): Arrangement
    createArrangement(
      pieceId: String!
      name: String!
      segments: [SegmentInput!]!
    ): Arrangement
    deleteArrangement(arrangementId: String!): String
  }

  type Query {
    getMyUserSettings: UserSettings!
    getRecordingById(recordingId: String!): Recording
    getRecordingsByIds(recordingIds: [String!]!): [Recording]
    getRecordingsByUserId(userId: String!): [Recording!]
    getMixesByArrangementId(arrangementId: String!): [Mix!]
    getMixesByRecordingId(recordingId: String!): [Mix!]
    getMixesWithMe: [Mix!]!
    getArrangementById(arrangementId: String!): Arrangement
    getArrangementByRecordingId(recordingId: String!): Arrangement
    getArrangementByIds(arrangementIds: [String!]!): [Arrangement]
    getArrangementsByPieceId(pieceId: String!): [Arrangement!]
    getAllPieces: [Piece!]
    getPieceById(pieceId: String!): Piece
    getSegmentsByArrangementId(arrangementId: String!): [Segment!]

    # not passing a segmentId returns a random segment...
    getSegmentById(segmentId: String!): Segment
    getNextSegment: Segment
  }
`;

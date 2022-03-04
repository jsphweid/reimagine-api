import { documentClient, tableName } from "./db-utils";
import { Utils } from "../../utils";

interface UserSettings {
  metronomeOnSegmentPlay?: boolean | null;
  notesOnSegmentPlay?: boolean | null;
  metronomeOnRecord?: boolean | null;
  notesOnRecord?: boolean | null;
  metronomeOnRecordingPlay?: boolean | null;
  notesOnRecordingPlay?: boolean | null;
}

export const DEFAULT_USER_SETTINGS = {
  notesOnSegmentPlay: true,
  metronomeOnSegmentPlay: true,
};

export async function _getUserSettings(userId: string): Promise<UserSettings> {
  const res = await documentClient
    .get({
      TableName: tableName,
      Key: { PK: userId, SK: userId },
    })
    .promise();
  if (res.Item) {
    return res.Item.Preferences;
  }

  return _upsertUserSettings(userId, DEFAULT_USER_SETTINGS, false);
}

export async function _upsertUserSettings(
  userId: string,
  settings: UserSettings,
  checkExisting = true
): Promise<UserSettings> {
  const now = new Date().toISOString();
  const existing = checkExisting ? await _getUserSettings(userId) : {};
  const Preferences = {
    ...existing,
    ...settings,
  };
  await documentClient
    .put({
      TableName: tableName,
      Item: {
        PK: userId,
        SK: userId,
        Preferences,
        DateCreated: Utils.objectIsEmpty(existing) ? now : undefined,
        DateUpdated: now,
      },
    })
    .promise();
  return Preferences;
}

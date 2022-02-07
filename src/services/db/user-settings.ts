import { documentClient, tableName } from "./db-utils";

interface UserSettings {
  metronomeOnSegmentPlay: boolean;
  notesOnSegmentPlay: boolean;
  metronomeOnRecord: boolean;
  notesOnRecord: boolean;
  metronomeOnRecordingPlay: boolean;
  notesOnRecordingPlay: boolean;
}

export function getUserSettings(userId: string): Promise<UserSettings | null> {
  return documentClient
    .get({
      TableName: tableName,
      Key: { PK: userId, SK: userId },
    })
    .promise()
    .then((res) => (res.Item ? res.Item.Preferences : null));
}

export async function upsertUserSettings(
  userId: string,
  settings: Partial<UserSettings>
): Promise<Partial<UserSettings>> {
  const existing = await getUserSettings(userId);
  const Preferences = {
    ...existing,
    ...settings,
  };
  await documentClient
    .put({
      TableName: tableName,
      Item: { PK: userId, SK: userId, Preferences },
    })
    .promise();
  return Preferences;
}

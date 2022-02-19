import { Midi } from "@tonejs/midi";
import { documentClient } from "./services/db/db-utils";
import { ObjectStorage } from "./services/object-storage";

export namespace Utils {
  export const chunkArray = <T>(arr: T[], size: number): T[][] => {
    const ret: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      ret.push(arr.slice(i, i + size));
    }
    return ret;
  };

  export const generateGUID = (): string => {
    // stolen from https://stackoverflow.com/a/2117523/4918389
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c == "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  export const getNowPrettyFormatted = (): string =>
    new Date()
      .toISOString()
      .replace(/T/, " ") // replace T with a space
      .replace(/\..+/, "");

  export const sleep = (seconds: number): Promise<void> =>
    new Promise((resolve) => {
      setTimeout(resolve, seconds * 1000);
    });

  export const base64Encode = (str: string): string =>
    Buffer.from(str).toString("base64");

  export const base64Decode = (str: string): string =>
    Buffer.from(str, "base64").toString("ascii");

  export const isInt = (n: any): boolean => Number(n) === n && n % 1 === 0;

  export const pickRandom = <T>(arr: T[]): T =>
    arr[Math.floor(Math.random() * arr.length)];

  // .filter(Utils.isTruthy) is a type-safe version of .filter(Boolean)
  export const isTruthy = <T>(item: T | null | undefined): item is T => !!item;

  export const objectIsEmpty = <T extends Object>(obj: T): boolean => {
    return (
      obj &&
      Object.keys(obj).length === 0 &&
      Object.getPrototypeOf(obj) === Object.prototype
    );
  };

  export function midiToJsonString(midi: Midi): string {
    return JSON.stringify(midi.toJSON());
  }

  export function jsonStringToMidi(str: string): Midi {
    const midiJson = new Midi();
    midiJson.fromJSON(JSON.parse(str));
    return midiJson;
  }

  export function serialize<T extends { dateCreated?: Date; midiJson?: Midi }>(
    obj: T | null
  ) {
    return obj
      ? {
          ...obj,
          dateCreated: obj.dateCreated
            ? obj.dateCreated.toISOString()
            : undefined,
          midiJson: obj.midiJson ? midiToJsonString(obj.midiJson) : undefined,
        }
      : null;
  }

  export const attachedPresigned = <T extends { objectKey: string }>(
    obj: T | null
  ) =>
    obj
      ? {
          ...obj,
          url: ObjectStorage.getPresignedUrl(obj.objectKey),
        }
      : null;

  export function dynamoDbBatchWrite(table: string, items: any[]) {
    return Promise.all(
      Utils.chunkArray(items, 25).map((batch) =>
        documentClient
          .batchWrite({
            RequestItems: {
              [table]: batch.map((item) => ({
                PutRequest: {
                  Item: item,
                },
              })),
            },
          })
          .promise()
      )
    );
  }

  export function dynamoDbBatchDelete(table: string, keys: {}[]) {
    return Promise.all(
      Utils.chunkArray(keys, 25).map((batch) =>
        documentClient
          .batchWrite({
            RequestItems: {
              [table]: batch.map((key) => ({
                DeleteRequest: {
                  Key: key,
                },
              })),
            },
          })
          .promise()
      )
    );
  }
}

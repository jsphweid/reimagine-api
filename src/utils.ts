import { Note } from "midi-segmentizer";
import { documentClient } from "./services/db/db-utils";
import { Recording } from "./services/db/recording";
import { Segment } from "./services/db/segment";
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

  type Truthy<T> = T extends false | "" | 0 | null | undefined ? never : T;

  function truthy<T>(value: T): value is Truthy<T> {
    return !!value;
  }

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

  export function serialize<T extends { dateCreated?: Date }>(obj: T) {
    return {
      ...obj,
      dateCreated: obj.dateCreated ? obj.dateCreated.toISOString() : undefined,
    };
  }

  export function maybeSerialize<T extends { dateCreated?: Date }>(
    obj: T | null
  ) {
    return obj ? serialize(obj) : null;
  }

  export function flatten<T>(arrs: T[][]): T[] {
    const res: T[] = [];
    for (const arr of arrs) {
      for (const item of arr) {
        res.push(item);
      }
    }
    return res;
  }

  export function removeDuplicates<T extends { id: string }>(arr: T[]): T[] {
    const seen = new Set();
    const res: T[] = [];
    for (const item of arr) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        res.push(item);
      }
    }
    return res;
  }

  export const attachPresigned = <T extends { objectKey: string }>(obj: T) => ({
    ...obj,
    url: ObjectStorage.getPresignedUrl(obj.objectKey),
  });

  export const maybeAttachedPresigned = <T extends { objectKey: string }>(
    obj: T | null
  ) => (obj ? attachPresigned(obj) : null);

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

  export function parseTokenFromAuthHeader(authHeader?: string) {
    return authHeader ? authHeader.split(" ")[1] : "";
  }

  export function createLookup<T extends { id: string }>(
    arr: T[]
  ): { [key: string]: T } {
    return arr.reduce(
      (prev, curr) => ({ ...prev, [curr.id]: curr }),
      {} as { [key: string]: T }
    );
  }

  export function getMaxNoteEnd(notes: Note[]): number {
    return notes.reduce(
      (prev, { time, duration }) => Math.max(prev, time + duration),
      0
    );
  }

  export function getRange(recordings: Recording[], segments: Segment[]) {
    const segmentsLookup = createLookup(segments);
    let min = Infinity;
    let max = -Infinity;
    recordings.forEach((r) => {
      const segment = segmentsLookup[r.segmentId]!;
      min = Math.min(min, segment.offset);
      max = Math.max(max, segment.offset + getMaxNoteEnd(segment.notes));
    });
    return { min, max };
  }

  export function sortSegments(segments: Segment[]) {
    // sort by offset, so segments towards the beginning of the arrangement come first
    // TODO: this should probably be done at the DB level since we the default ordering
    // is pretty clear
    return segments.sort((a, b) => (b.offset > a.offset ? -1 : 1));
  }
}

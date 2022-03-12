import { resample } from "wave-resampler";
import { decode, encode } from "node-wav";
import { writeFileSync, readFileSync } from "fs";

import { ObjectStorage } from "../services/object-storage";
import { lame } from "./lame";
import { spawnPromise } from "./spawn";

export interface Recording {
  sampleRate: number;
  objectKey: string;
  offset: number;
}

interface Mix {
  buffer: Buffer;
  duration: number;
}

export function getDurationOfWav(buffer: Buffer): number {
  const { sampleRate, channelData } = decode(buffer);
  return channelData[0].length / sampleRate;
}

export async function makeMix(recordings: Recording[]): Promise<Mix> {
  const buffers = (
    await Promise.all(
      recordings.map((r) => r.objectKey).map(ObjectStorage.getItem)
    )
  ).filter(Boolean) as Buffer[];

  const arrs = [] as Array<{
    offset: number;
    samples: number[];
    startIndex: number;
  }>;
  let len = 0;

  // find length and resample
  buffers.forEach((buffer, i) => {
    const { sampleRate, channelData } = decode(buffer);
    const samples =
      sampleRate === 44100
        ? Array.from(channelData[0])
        : Array.from(resample(channelData[0], sampleRate, 44100));
    const offset = recordings[i].offset;
    const startIndex = Math.ceil(offset * 44100);
    arrs.push({ samples, offset, startIndex });
    len = Math.max(len, Math.ceil(startIndex + samples.length));
  });

  // mix!
  let res = new Float32Array(len);
  arrs.forEach((arr) => {
    for (let i = 0; i < arr.samples.length; i++) {
      res[i + arr.startIndex] += arr.samples[i];
    }
  });

  // trim
  let firstNonZero: number | null = null;
  let lastNonZero: number | null = null;
  for (let i = 0; i < len; i++) {
    if (firstNonZero === null && res[i] !== 0) {
      firstNonZero = i;
    }
    if (res[i] > 0) {
      lastNonZero = i;
    }
  }
  if (firstNonZero && lastNonZero && firstNonZero < lastNonZero) {
    const newLen = lastNonZero - firstNonZero;
    const shortened = new Float32Array(newLen);
    for (let i = 0; i < newLen; i++) {
      shortened[i] = res[i + firstNonZero];
    }
    len = newLen;
    res = shortened;
  }

  // normalize
  let worst = 0;
  for (let i = 0; i < res.length; i++) {
    worst = Math.max(worst, Math.abs(res[i]));
  }
  for (let i = 0; i < res.length; i++) {
    res[i] /= worst;
  }

  // convert to mp3 and return
  writeFileSync("/tmp/temp.wav", encode([res], { sampleRate: 44100 }));
  await lame("--preset standard /tmp/temp.wav /tmp/temp.mp3");
  const buffer = readFileSync("/tmp/temp.mp3");
  await spawnPromise("ls", ["-la"]);
  return {
    buffer,
    duration: len / 44100,
  };
}

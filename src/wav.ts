import { resample } from "wave-resampler";
import { encode, decode } from "node-wav";

import { ObjectStorage } from "./services/object-storage";

interface Recording {
  sampleRate: number;
  objectKey: string;
  offset: number;
}

export async function makeMix(recordings: Recording[]): Promise<Buffer> {
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
  let maxLen = 0;

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
    maxLen = Math.max(maxLen, Math.ceil(startIndex + samples.length));
  });

  // mix!
  const res = new Float32Array(maxLen);
  arrs.forEach((arr) => {
    for (let i = 0; i < arr.samples.length; i++) {
      res[i + arr.startIndex] += arr.samples[i];
    }
  });

  return encode([res], { sampleRate: 44100 });
}

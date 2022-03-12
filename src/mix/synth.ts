import { encode } from "node-wav";

import { Segment } from "../services/db/segment";

const VOLUME = 0.3;

function midiToFreq(midiNote: number): number {
  return Math.pow(2, (midiNote - 69) / 12) * 440;
}

function createSamples(duration: number, frequency: number): Float32Array {
  const sampleRate = 44100;
  const arr = new Float32Array(duration * sampleRate);
  const angularFrequency = frequency * 2 * Math.PI;

  for (let i = 0; i < arr.length; i++) {
    arr[i] = Math.sin((i / sampleRate) * angularFrequency) * VOLUME;
  }

  if (arr.length > 1000) {
    for (let i = 1000; i >= 0; i--) {
      const j = arr.length - i;
      arr[j] = arr[j] * (i / 1000);
    }
  }

  return arr;
}

export function synthSegment(segment: Segment): Buffer {
  let len = 0;
  segment.notes.forEach((note) => {
    len = Math.max(len, (note.time + note.duration) * 44100);
  });

  const res = new Float32Array(len);
  segment.notes.forEach((note) => {
    const samples = createSamples(note.duration, midiToFreq(note.midi));
    const startOffset = note.time * 44100;
    for (let i = 0; i < samples.length; i++) {
      res[i + startOffset] = samples[i];
    }
  });
  return encode([res], { sampleRate: 44100 });
}

import { SegmentDataType } from './types'

export function pickRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function synthesizeSegments(
  segmentData: SegmentDataType[]
): Float32Array {
  const maxLength = Math.max(
    ...segmentData.map(segment => segment.arr.length + segment.startIndex)
  )
  const sumArr = new Float32Array(maxLength)
  segmentData.forEach(segment => {
    const endIndex = segment.startIndex + segment.arr.length
    for (let i = 0, j = segment.startIndex; j < endIndex; i++, j++) {
      sumArr[j] += segment.arr[i]
    }
  })
  return sumArr
}

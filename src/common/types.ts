export interface RecordingType {
	s3Key: string
	offsetTime: number
	segmentId: string
}

export interface SegmentDataType {
	startIndex: number
	arr: number[]
}

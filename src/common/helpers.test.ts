import { synthesizeSegments } from './helpers'

describe('synthesizeSegments', () => {
	it('should make basic array', () => {
		const input = [
			{ startIndex: 3, arr: [2, 1, 5, 7] },
			{ startIndex: 2, arr: [2, 7] },
			{ startIndex: 5, arr: [6, 4, 3, 1, 2, 3, 1, 3, 5] },
			{ startIndex: 20, arr: [1] }
		]
		const expectedOutput = new Float32Array([0, 0, 2, 9, 1, 11, 11, 3, 1, 2, 3, 1, 3, 5, 0, 0, 0, 0, 0, 0, 1])
		expect(synthesizeSegments(input)).toEqual(expectedOutput)
	})

	it('should make small arr', () => {
		const input = [{ startIndex: 2, arr: [1, 1] }, { startIndex: 4, arr: [2, 2, 2] }]
		expect(synthesizeSegments(input)).toEqual(new Float32Array([0, 0, 1, 1, 2, 2, 2]))
	})

	it('should make small arr', () => {
		const input = [{ startIndex: 0, arr: [1, 1] }, { startIndex: 1, arr: [2, 2, 2] }]
		expect(synthesizeSegments(input)).toEqual(new Float32Array([1, 3, 2, 2]))
	})
})

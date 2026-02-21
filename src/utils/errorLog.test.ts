import { describe, expect, it } from 'vitest'
import { clearAppErrors, getRecentAppErrors, logAppError } from './errorLog'

describe('errorLog utility', () => {
	it('stores newest errors first and supports clearing', () => {
		clearAppErrors()
		logAppError('test.first', new Error('First'))
		logAppError('test.second', 'Second')

		const errors = getRecentAppErrors(10)
		expect(errors).toHaveLength(2)
		expect(errors[0].context).toBe('test.second')
		expect(errors[0].message).toBe('Second')
		expect(errors[1].context).toBe('test.first')
		expect(errors[1].errorName).toBe('Error')

		clearAppErrors()
		expect(getRecentAppErrors(10)).toHaveLength(0)
	})
})

import expect from 'expect';

import generateSuffixedPenaltyReference from './generateSuffixedPenaltyReference';

describe('generateSuffixedPenaltyReference', () => {
	let cases;

	before(() => {
		cases = [
			{ reference: '548210336IM', type: 'IM', output: '548210336IM' },
			{ reference: '870207585075', type: 'FPN', output: '870207585075_FPN' },
			{ reference: '870207585075', type: 'CDN', output: '870207585075_CDN' },
		];
	});

	it('it should append the penalty type for non-IM references', () => {
		cases.forEach((t) => {
			const expected = t.output;
			const actual = generateSuffixedPenaltyReference(t.reference, t.type);
			expect(expected).toBe(actual);
		});
	});
});

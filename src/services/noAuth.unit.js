import expect from 'expect';
import NoAuth from './noAuth';

describe('NoAuth', () => {
	it('retains the supplied token and grants access', () => {
		const authorizer = new NoAuth('opaque-token');

		expect(authorizer.token).toBe('opaque-token');
		expect(authorizer.isTokenValid()).toBe(true);
		expect(authorizer.getTokenEffect()).toBe('Allow');
		expect(authorizer.getPrincipalId()).toBe('Auth User');
	});
});

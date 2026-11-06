import sinon from 'sinon';
import expect from 'expect';

import Constants from './constants';
import createResponse from './createResponse';
import generatePaymentItems from './generatePaymentItems';
import generateSuffixedPenaltyReference from './generateSuffixedPenaltyReference';
import isDevEnv from './isDevEnv';
import NoAuth from '../services/noAuth';

describe('shared utility contracts', () => {
	beforeEach(async () => {
		await Constants.bootstrap();
	});

	afterEach(() => sinon.restore());

	it('serializes response bodies and applies defaults', () => {
		expect(createResponse({})).toEqual({
			statusCode: 200,
			headers: { 'Access-Control-Allow-Origin': '*' },
			body: '{}',
		});
		expect(createResponse({ body: { accepted: true }, statusCode: 202 })).toEqual({
			statusCode: 202,
			headers: { 'Access-Control-Allow-Origin': '*' },
			body: '{"accepted":true}',
		});
	});

	it('only suffixes non-immobilisation penalty references', () => {
		expect(generateSuffixedPenaltyReference('ABC-1', 'FPN')).toBe('ABC-1_FPN');
		expect(generateSuffixedPenaltyReference('ABC-2', 'CDN')).toBe('ABC-2_CDN');
		expect(generateSuffixedPenaltyReference('ABC-3_IM', 'IM')).toBe('ABC-3_IM');
	});

	it('builds group payment line items with penalty descriptions and references', () => {
		const constants = {
			receiverAddress: () => ({ city: 'Unit Test City' }),
			userId: () => 'unit-user',
		};
		const penalties = [
			{ PenaltyAmount: 10, PenaltyReference: 'PEN-1', VehicleRegistration: 'UNIT123' },
			{ PenaltyAmount: 25.5, PenaltyReference: 'PEN-2', VehicleRegistration: 'UNIT456' },
		];

		const result = generatePaymentItems(penalties, 'FPN', constants);

		expect(result).toHaveLength(2);
		expect(result[0]).toMatchObject({
			line_identifier: '1',
			amount: '10.00',
			net_amount: '10.00',
			allocated_amount: '10.00',
			sales_reference: 'PEN-1_FPN',
			product_description: 'Fixed Penalties',
			sales_person_reference: 'Enforcement',
			receiver_reference: 'UNIT123',
			user_id: 'unit-user',
		});
		expect(result[1]).toMatchObject({
			line_identifier: '2',
			amount: '25.50',
			sales_reference: 'PEN-2_FPN',
		});
		expect(result[0].invoice_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		expect(result[0].rule_start_date).toBe(result[0].invoice_date);
	});

	[
		['IM', 'Immobilisation', 'Impounding'],
		['CDN', 'Court Deposits', 'Enforcement'],
		['UNKNOWN', '', ''],
	].forEach(([penaltyType, productDescription, salesPersonReference]) => {
		it(`maps ${penaltyType} payment item labels`, () => {
			const [item] = generatePaymentItems([{
				PenaltyAmount: 10,
				PenaltyReference: 'PEN-3',
				VehicleRegistration: 'UNIT789',
			}], penaltyType, {
				receiverAddress: () => ({}),
				userId: () => 'unit-user',
			});

			expect(item.product_description).toBe(productDescription);
			expect(item.sales_person_reference).toBe(salesPersonReference);
		});
	});

	it('reports the configured development environment and other environments', () => {
		const originalEnv = process.env.ENV;
		process.env.ENV = 'DEV';
		expect(isDevEnv()).toBe(true);
		process.env.ENV = 'TEST';
		expect(isDevEnv()).toBe(false);
		if (originalEnv === undefined) {
			delete process.env.ENV;
		} else {
			process.env.ENV = originalEnv;
		}
	});

	it('returns the static local authorizer policy', () => {
		const auth = new NoAuth('unit-token');
		expect(auth.token).toBe('unit-token');
		expect(auth.isTokenValid()).toBe(true);
		expect(auth.getTokenEffect()).toBe('Allow');
		expect(auth.getPrincipalId()).toBe('Auth User');
	});
});

import expect from 'expect';
import Constants from './constants';
import buildTransactionOptions from './buildTransactionOptions';

const paymentObject = {
	penalty_type: 'FPN',
	penalty_amount: 12.5,
	penalty_reference: 'PEN-123',
	payment_code: 'PAY-123',
	vehicle_reg: 'UNIT123',
	slip_number: 'SLIP-1',
	batch_number: 'BATCH-1',
	receipt_date: '2026-01-05',
	cheque_date: '2026-01-04',
	cheque_number: 'CHEQUE-1',
	name_on_cheque: 'Unit Test',
	postal_order_number: 'PO-1',
};

describe('buildTransactionOptions', () => {
	before(async () => {
		await Constants.bootstrap();
	});

	it('builds card payloads with money, date, address and offline registration data', () => {
		const result = buildTransactionOptions({
			redirectUrl: 'https://example.invalid/return',
			paymentObject: { ...paymentObject, vehicle_reg: false },
			auth: { scope: 'CARD' },
		});

		expect(result).toMatchObject({
			redirect_uri: 'https://example.invalid/return',
			total_amount: '12.50',
			customer_reference: 'PAY-123',
			scope: 'CARD',
			country_code: 'GB',
			customer_manager_name: 'Unit Test Manager',
			customer_name: 'Unit Test Customer',
			customer_address: {
				line_1: '1 Test Street',
				city: 'Unit Test City',
				postcode: 'TE5 7ST',
			},
		});
		expect(result.payment_data[0]).toMatchObject({
			amount: '12.50',
			tax_amount: '0.00',
			sales_reference: 'PEN-123_FPN',
			product_description: 'Fixed Penalties',
			receiver_reference: 'OFFLINE',
			receiver_address: { city: 'Unit Test City' },
			sales_person_reference: 'Enforcement',
			user_id: 'unit-test-user',
		});
		expect(result.payment_data[0].invoice_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});

	['CARD', 'CNP'].forEach((scope) => {
		it(`creates the common card transaction shape for ${scope}`, () => {
			const result = buildTransactionOptions({
				redirectUrl: 'https://example.invalid/return',
				paymentObject,
				auth: { scope },
			});

			expect(result.scope).toBe(scope);
			expect(result.redirect_uri).toBe('https://example.invalid/return');
			expect(result.payment_data[0].receiver_reference).toBe('UNIT123');
		});
	});

	[
		['CASH', { slip_number: 'SLIP-1', batch_number: 'BATCH-1', receipt_date: '2026-01-05' }],
		['CHEQUE', {
			slip_number: 'SLIP-1',
			batch_number: 'BATCH-1',
			receipt_date: '2026-01-05',
			cheque_date: '2026-01-04',
			cheque_number: 'CHEQUE-1',
			name_on_cheque: 'Unit Test',
		}],
		['POSTAL_ORDER', {
			slip_number: 'SLIP-1',
			batch_number: 'BATCH-1',
			receipt_date: '2026-01-05',
			postal_order_number: 'PO-1',
		}],
	].forEach(([scope, instrumentData]) => {
		it(`includes the ${scope} instrument fields`, () => {
			const result = buildTransactionOptions({
				redirectUrl: 'https://example.invalid/return',
				paymentObject,
				auth: { scope },
			});

			expect(result).toMatchObject(instrumentData);
			expect(result.scope).toBe(scope);
			expect(result.total_amount).toBe('12.50');
		});
	});

	it('preserves product labels for immobilisation and court deposits', () => {
		const build = (penaltyType) => buildTransactionOptions({
			redirectUrl: 'https://example.invalid/return',
			paymentObject: { ...paymentObject, penalty_type: penaltyType },
			auth: { scope: 'CASH' },
		}).payment_data[0];

		expect(build('IM')).toMatchObject({
			product_description: 'Immobilisation',
			sales_person_reference: 'Impounding',
			sales_reference: 'PEN-123',
		});
		expect(build('CDN')).toMatchObject({
			product_description: 'Court Deposits',
			sales_person_reference: 'Enforcement',
			sales_reference: 'PEN-123_CDN',
		});
		expect(build('OTHER')).toMatchObject({
			product_description: '',
			sales_person_reference: '',
		});
	});

	it('returns null for unsupported payment scopes', () => {
		expect(buildTransactionOptions({
			paymentObject,
			auth: { scope: 'UNSUPPORTED' },
		})).toBe(null);
	});
});

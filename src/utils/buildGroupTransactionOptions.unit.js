import expect from 'expect';
import Constants from './constants';
import buildGroupTransactionOptions from './buildGroupTransactionOptions';

const paymentObject = {
	RedirectUrl: 'https://example.invalid/group',
	TotalAmount: 20,
	PenaltyType: 'FPN',
	PenaltyGroupId: 'GROUP-1',
	Penalties: [{
		PenaltyAmount: 10,
		PenaltyReference: 'PEN-1',
		VehicleRegistration: 'UNIT123',
	}],
	SlipNumber: 'SLIP-1',
	BatchNumber: 'BATCH-1',
	ReceiptDate: '2026-01-05',
	ChequeDate: '2026-01-04',
	ChequeNumber: 'CHEQUE-1',
	NameOnCheque: 'Unit Test',
	PostalOrderNumber: 'PO-1',
};

describe('buildGroupTransactionOptions', () => {
	before(async () => {
		await Constants.bootstrap();
	});

	['CARD', 'CNP'].forEach((scope) => {
		it(`builds redirect transaction details for ${scope}`, () => {
			const result = buildGroupTransactionOptions({
				paymentObject,
				auth: { scope },
			});

			expect(result).toMatchObject({
				redirect_uri: paymentObject.RedirectUrl,
				total_amount: '20.00',
				customer_reference: 'GROUP-1',
				scope,
				country_code: 'GB',
				customer_address: { city: 'Unit Test City' },
			});
			expect(result.payment_data[0]).toMatchObject({
				line_identifier: '1',
				amount: '10.00',
				sales_reference: 'PEN-1_FPN',
			});
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
		it(`includes ${scope} instrument details`, () => {
			const result = buildGroupTransactionOptions({ paymentObject, auth: { scope } });

			expect(result).toMatchObject(instrumentData);
			expect(result.customer_reference).toBe('GROUP-1');
			expect(result.payment_data).toHaveLength(1);
		});
	});

	it('returns null for unknown scopes', () => {
		expect(buildGroupTransactionOptions({ paymentObject, auth: { scope: 'OTHER' } })).toBe(null);
	});
});

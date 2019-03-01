import sinon from 'sinon';
import PaymentService from './paymentService';

let callbackSpy;

describe('Payment service', () => {
	describe('confirmPendingTransactions single receipt', () => {
		let confirmSinglePaymentStub;
		const penaltyId = 'b7129a87cf';
		const receiptReferences = ['ECMS-179271-137511'];

		beforeEach(() => {
			callbackSpy = sinon.spy();
		});

		afterEach(() => {
			confirmSinglePaymentStub.restore();
		});

		it('calls back with paid when a transaction has completed', async () => {
			confirmSinglePaymentStub = sinon.stub(PaymentService, 'confirmSinglePayment').callsFake(() => Promise.resolve({
				code: 801,
				auth_code: '809132',
			}));
			await PaymentService.confirmPendingTransactions(penaltyId, receiptReferences, callbackSpy);

			sinon.assert.calledWith(callbackSpy, null, sinon.match({
				statusCode: 200,
				body: JSON.stringify({ paid: [{ receiptRef: 'ECMS-179271-137511', authCode: '809132' }], cancelled: [], pending: [] }),
			}));
		});

		it('calls back with cancelled when no transactions have completed', async () => {
			confirmSinglePaymentStub = sinon.stub(PaymentService, 'confirmSinglePayment').callsFake(() => Promise.resolve({
				code: 807,
				auth_code: '809132',
			}));
			await PaymentService.confirmPendingTransactions(penaltyId, receiptReferences, callbackSpy);

			sinon.assert.calledWith(callbackSpy, null, sinon.match({
				statusCode: 200,
				body: JSON.stringify({ paid: [], cancelled: [{ receiptRef: 'ECMS-179271-137511' }], pending: [] }),
			}));
		});

		it('calls back with pending when an error occurs', async () => {
			confirmSinglePaymentStub = sinon.stub(PaymentService, 'confirmSinglePayment').callsFake(() => Promise.reject());
			await PaymentService.confirmPendingTransactions(penaltyId, receiptReferences, callbackSpy);

			sinon.assert.calledWith(callbackSpy, null, sinon.match({
				statusCode: 200,
				body: JSON.stringify({ paid: [], cancelled: [], pending: [{ receiptRef: 'ECMS-179271-137511' }] }),
			}));
		});
	});

	describe('confirmPendingTransactions multiple receipts', () => {
		let confirmSinglePaymentStub;
		const penaltyId = 'b7129a87cf';
		const responses = {
			'ECMS-621135-612142': {
				code: 801,
				authCode: '51234',
			},
			'ECMS-671632-174112': {
				code: 801,
				authCode: '16112',
			},
			'ECMS-792711-175131': {
				code: 807,
			},
			'ECMS-970071-171211': {
				code: 807,
			},
			'ECMS-678171-367111': {
				code: -1,
			},
			'ECMS-982271-578511': {
				error: new Error('Error authenticating'),
			},
		};

		beforeEach(() => {
			callbackSpy = sinon.spy();
		});

		afterEach(() => {
			confirmSinglePaymentStub.restore();
		});

		it('calls back with correct response when checking multiple receipts', async () => {
			confirmSinglePaymentStub = sinon.stub(PaymentService, 'confirmSinglePayment')
				.callsFake((penaltyType, receiptReference) => {
					const response = responses[receiptReference];
					if (response.error) {
						return Promise.reject(response.error);
					}
					return Promise.resolve({
						code: response.code,
						auth_code: response.authCode,
					});
				});

			await PaymentService.confirmPendingTransactions(
				penaltyId,
				Object.keys(responses),
				callbackSpy,
			);

			sinon.assert.calledWith(callbackSpy, null, sinon.match({
				statusCode: 200,
				body: JSON.stringify({
					paid: [{ receiptRef: 'ECMS-621135-612142', authCode: '51234' }, { receiptRef: 'ECMS-671632-174112', authCode: '16112' }],
					cancelled: [{ receiptRef: 'ECMS-792711-175131' }, { receiptRef: 'ECMS-970071-171211' }],
					pending: [{ receiptRef: 'ECMS-678171-367111' }, { receiptRef: 'ECMS-982271-578511' }],
				}),
			}));
		});
	});
});

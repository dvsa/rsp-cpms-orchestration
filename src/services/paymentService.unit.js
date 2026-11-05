import sinon from 'sinon';
import expect from 'expect';
import AWS from 'aws-sdk';

import PaymentService from './paymentService';
import Constants from '../utils/constants';
import * as cpmsAuthModule from '../utils/cpmsAuth';
import * as cpmsPaymentModule from '../utils/cpmsPayment';
import * as cpmsConfirmModule from '../utils/cpmsConfirm';
import * as cpmsChargebackModule from '../utils/cpmsChargeback';
import * as cpmsReversalModule from '../utils/cpmsReversal';

const responseBody = (response) => JSON.parse(response.body);
const { SQS } = AWS;

describe('PaymentService', () => {
	beforeEach(async () => {
		await Constants.bootstrap();
		sinon.stub(cpmsAuthModule, 'default').resolves('unit-token');
		sinon.stub(cpmsPaymentModule, 'default').resolves({ receipt_reference: 'CPMS-123' });
		sinon.stub(cpmsConfirmModule, 'default').resolves({ status: 'paid' });
		sinon.stub(cpmsChargebackModule, 'default').resolves({ status: 'reversed' });
		sinon.stub(cpmsReversalModule, 'default').resolves({ status: 'reversed' });
		sinon.stub(SQS.prototype, 'makeRequest').callsFake((operation, params) => ({
			promise: () => Promise.resolve({ MessageId: 'unit-message', params }),
		}));
		sinon.stub(console, 'log');
		sinon.stub(console, 'error');
	});

	afterEach(() => sinon.restore());

	it('creates card payments and queues the receipt for status checking', async () => {
		const payment = {
			penalty_type: 'FPN',
			redirect_url: 'https://example.invalid/complete',
			vehicle_reg: 'UNIT123',
			penalty_id: 'PEN-1',
		};
		const result = await PaymentService.cardPayment(payment);

		expect(result.statusCode).toBe(200);
		expect(responseBody(result)).toEqual({ receipt_reference: 'CPMS-123' });
		expect(cpmsAuthModule.default.calledOnceWithExactly('FPN', Constants.cardHolderPresentAuthBody())).toBe(true);
		expect(cpmsPaymentModule.default.calledOnceWithExactly({
			endpoint: '/payment/card',
			redirectUrl: payment.redirect_url,
			paymentObject: payment,
			auth: 'unit-token',
		})).toBe(true);
		expect(SQS.prototype.makeRequest.calledOnce).toBe(true);
		expect(SQS.prototype.makeRequest.firstCall.args[0]).toBe('sendMessage');
		expect(SQS.prototype.makeRequest.firstCall.args[1].MessageAttributes).toMatchObject({
			ReceiptReference: { StringValue: 'CPMS-123' },
			PenaltyId: { StringValue: 'PEN-1_FPN' },
			RegistrationNumber: { StringValue: 'UNIT123' },
			IsGroupPayment: { StringValue: 'false' },
		});
	});

	it('returns a client error when the card payment queue send fails', async () => {
		SQS.prototype.makeRequest.throws(new Error('queue unavailable'));

		const result = await PaymentService.cardPayment({
			penalty_type: 'FPN',
			penalty_id: 'PEN-2',
		});

		expect(result.statusCode).toBe(400);
		expect(responseBody(result)).toEqual({});
	});

	it('creates card-not-present payments and reports CPMS failures', async () => {
		const payment = { penalty_type: 'IM', redirect_url: 'https://example.invalid/cnp' };
		let result = await PaymentService.cardNotPresentPayment(payment);

		expect(result.statusCode).toBe(200);
		expect(cpmsAuthModule.default.calledWithExactly('IM', Constants.cardHolderNotPresentAuthBody())).toBe(true);
		expect(cpmsPaymentModule.default.calledWithExactly({
			endpoint: 'payment/cardholder-not-present',
			redirectUrl: payment.redirect_url,
			paymentObject: payment,
			auth: 'unit-token',
		})).toBe(true);

		cpmsPaymentModule.default.rejects(new Error('CPMS unavailable'));
		result = await PaymentService.cardNotPresentPayment(payment);
		expect(result.statusCode).toBe(400);
		expect(responseBody(result)).toEqual({});
	});

	[
		['cashPayment', 'CDN', 'payment/cash', 'cashPaymentAuthBody'],
		['chequePayment', 'FPN', 'payment/cheque', 'chequePaymentAuthBody'],
		['postalOrderPayment', 'IM', 'payment/postal-order', 'postalOrderAuthBody'],
	].forEach(([method, penaltyType, endpoint, authMethod]) => {
		it(`creates ${method} transactions and handles CPMS errors`, async () => {
			const payment = { penalty_type: penaltyType, redirect_url: 'https://example.invalid/payment' };
			let result = await PaymentService[method](payment);

			expect(result.statusCode).toBe(200);
			expect(cpmsAuthModule.default.calledWithExactly(penaltyType, Constants[authMethod]())).toBe(true);
			expect(cpmsPaymentModule.default.calledWithExactly({
				endpoint,
				redirectUrl: payment.redirect_url,
				paymentObject: payment,
				auth: 'unit-token',
			})).toBe(true);

			cpmsPaymentModule.default.rejects(new Error('payment rejected'));
			result = await PaymentService[method](payment);
			expect(result.statusCode).toBe(400);
			expect(responseBody(result)).toEqual({});
		});
	});

	it('confirms payments and maps CPMS response errors', async () => {
		let result = await PaymentService.confirmPayment({
			penalty_type: 'FPN',
			receipt_reference: 'CPMS-123',
		});

		expect(result.statusCode).toBe(200);
		expect(responseBody(result)).toEqual({ status: 'paid' });
		expect(cpmsConfirmModule.default.calledOnceWithExactly('CPMS-123', 'unit-token')).toBe(true);

		cpmsConfirmModule.default.rejects({ response: { data: { code: 801 }, status: 409 } });
		result = await PaymentService.confirmPayment({
			penalty_type: 'FPN',
			receipt_reference: 'CPMS-123',
		});
		expect(result.statusCode).toBe(400);
		expect(responseBody(result)).toEqual({ data: { code: 801 }, status: 409 });
	});

	it('reverses card payments and passes through failures', async () => {
		const request = { penalty_type: 'CDN', receipt_ref: 'CPMS-1', payment_ref: 'PAY-1' };
		let result = await PaymentService.reverseCard(request);

		expect(result.statusCode).toBe(200);
		expect(responseBody(result)).toEqual({ status: 'reversed' });
		expect(cpmsAuthModule.default.calledWithExactly('CDN', Constants.chargebackAuthBody())).toBe(true);
		expect(cpmsChargebackModule.default.calledOnceWithExactly({
			receipt_reference: 'CPMS-1',
			customer_reference: 'PAY-1',
			auth: 'unit-token',
		})).toBe(true);

		cpmsChargebackModule.default.rejects(new Error('chargeback rejected'));
		result = await PaymentService.reverseCard(request);
		expect(result.statusCode).toBe(400);
		expect(responseBody(result)).toEqual({});
	});

	it('reverses cheque payments and passes through failures', async () => {
		const request = { penalty_type: 'IM', receipt_ref: 'CPMS-2', payment_ref: 'PAY-2' };
		let result = await PaymentService.reverseCheque(request);

		expect(result.statusCode).toBe(200);
		expect(cpmsAuthModule.default.calledWithExactly('IM', Constants.reversalAuthBody())).toBe(true);
		expect(cpmsReversalModule.default.calledOnceWithExactly({
			receipt_reference: 'CPMS-2',
			customer_reference: 'PAY-2',
			auth: 'unit-token',
		})).toBe(true);

		cpmsReversalModule.default.rejects(new Error('reversal rejected'));
		result = await PaymentService.reverseCheque(request);
		expect(result.statusCode).toBe(400);
		expect(responseBody(result)).toEqual({});
	});

	it('propagates authentication failures before calling CPMS payment', async () => {
		cpmsAuthModule.default.rejects(new Error('authentication failed'));

		await expect(PaymentService.cashPayment({ penalty_type: 'FPN' }))
			.rejects.toThrow('authentication failed');
		expect(cpmsPaymentModule.default.notCalled).toBe(true);
	});
});

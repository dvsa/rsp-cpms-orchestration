import sinon from 'sinon';
import expect from 'expect';
import AWS from 'aws-sdk';

import GroupPaymentService from './groupPaymentService';
import Constants from '../utils/constants';
import * as cpmsAuthModule from '../utils/cpmsAuth';
import * as cpmsGroupPaymentModule from '../utils/cpmsGroupPayment';

const responseBody = (response) => JSON.parse(response.body);
const { SQS } = AWS;

describe('GroupPaymentService', () => {
	beforeEach(async () => {
		sinon.stub(console, 'log');
		sinon.stub(console, 'error');
		await Constants.bootstrap();
		sinon.stub(cpmsAuthModule, 'default').resolves('unit-token');
		sinon.stub(cpmsGroupPaymentModule, 'default').resolves({ receipt_reference: 'GROUP-123' });
		sinon.stub(SQS.prototype, 'makeRequest').callsFake((operation, params) => ({
			promise: () => Promise.resolve({ MessageId: 'group-message', params }),
		}));
	});

	afterEach(() => sinon.restore());

	const payment = {
		PenaltyGroupId: 'GROUP-1',
		VehicleRegistration: 'UNIT123',
		PenaltyType: 'FPN',
		RedirectUrl: 'https://example.invalid/complete',
	};

	it('uses CARD by default, submits the request and queues the group receipt', async () => {
		const result = await GroupPaymentService.groupPayment(payment);

		expect(result.statusCode).toBe(200);
		expect(responseBody(result)).toEqual({ receipt_reference: 'GROUP-123' });
		expect(cpmsAuthModule.default.calledOnceWithExactly('FPN', Constants.cardHolderPresentAuthBody())).toBe(true);
		expect(cpmsGroupPaymentModule.default.calledOnceWithExactly({
			endpoint: '/payment/card',
			redirectUrl: payment.RedirectUrl,
			paymentObject: payment,
			auth: 'unit-token',
		})).toBe(true);
		expect(SQS.prototype.makeRequest.firstCall.args[1].MessageAttributes).toMatchObject({
			PenaltyId: { StringValue: 'GROUP-1' },
			IsGroupPayment: { StringValue: 'true' },
		});
	});

	[
		['CARD', '/payment/card', 'cardHolderPresentAuthBody'],
		['CNP', '/payment/cardholder-not-present', 'cardHolderNotPresentAuthBody'],
		['CASH', '/payment/cash', 'cashPaymentAuthBody'],
		['CHEQUE', '/payment/cheque', 'chequePaymentAuthBody'],
		['POSTAL_ORDER', '/payment/postal-order', 'postalOrderAuthBody'],
	].forEach(([PaymentMethod, endpoint, authMethod]) => {
		it(`maps ${PaymentMethod} to its CPMS endpoint and authorization scope`, async () => {
			const request = { ...payment, PaymentMethod };
			const result = await GroupPaymentService.groupPayment(request);

			expect(result.statusCode).toBe(200);
			expect(cpmsAuthModule.default.calledWithExactly('FPN', Constants[authMethod]())).toBe(true);
			expect(cpmsGroupPaymentModule.default.calledWithExactly({
				endpoint,
				redirectUrl: request.RedirectUrl,
				paymentObject: request,
				auth: 'unit-token',
			})).toBe(true);
		});
	});

	it('rejects unknown payment methods without authenticating', async () => {
		const result = await GroupPaymentService.groupPayment({ ...payment, PaymentMethod: 'BITCOIN' });

		expect(result.statusCode).toBe(400);
		expect(result.body).toBe('"Bad PaymentMethod BITCOIN"');
		expect(cpmsAuthModule.default.notCalled).toBe(true);
	});

	it('returns an authentication error when CPMS auth returns false', async () => {
		cpmsAuthModule.default.resolves(false);

		const result = await GroupPaymentService.groupPayment(payment);

		expect(result.statusCode).toBe(400);
		expect(result.body).toBe('"Error authenticating"');
		expect(cpmsGroupPaymentModule.default.notCalled).toBe(true);
	});

	it('returns errors from CPMS and from the queue', async () => {
		cpmsGroupPaymentModule.default.rejects(new Error('CPMS rejected group'));
		let result = await GroupPaymentService.groupPayment(payment);
		expect(result.statusCode).toBe(400);
		expect(result.body).toBe('"CPMS rejected group"');

		cpmsGroupPaymentModule.default.resolves({ receipt_reference: 'GROUP-456' });
		SQS.prototype.makeRequest.throws(new Error('queue unavailable'));
		result = await GroupPaymentService.groupPayment(payment);
		expect(result.statusCode).toBe(400);
		expect(result.body).toBe('"queue unavailable"');
	});
});

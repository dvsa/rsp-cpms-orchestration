import sinon from 'sinon';
import expect from 'expect';
import axios from 'axios';

import Constants from './constants';
import cpmsAuth from './cpmsAuth';
import cpmsPayment from './cpmsPayment';
import cpmsGroupPayment from './cpmsGroupPayment';
import cpmsConfirm from './cpmsConfirm';
import cpmsChargeback from './cpmsChargeback';
import cpmsReversal from './cpmsReversal';
import cpmsGenerateReport from './cpmsGenerateReport';
import cpmsListReport from './cpmsListReport';
import cpmsCheckReport from './cpmsCheckReport';
import downloadReport from './downloadReport';
import cpmsDownloadReport from './cpmsDownloadReport';

const response = (data) => Promise.resolve({ data });
const rejection = (error) => Promise.reject(error);

describe('CPMS HTTP adapters', () => {
	beforeEach(async () => {
		await Constants.bootstrap();
		sinon.stub(console, 'log');
		sinon.stub(console, 'error');
	});

	afterEach(() => sinon.restore());

	it('authenticates supported penalty types and rejects missing tokens', async () => {
		const client = { post: sinon.stub().returns(response({ access_token: 'token-1' })) };
		const create = sinon.stub(axios, 'create').returns(client);
		const authBody = { scope: 'CARD', grant_type: 'client_credentials', user_id: 'unit-user' };
		const result = await cpmsAuth('FPN', authBody);

		expect(result).toEqual({ access_token: 'token-1' });
		expect(create.firstCall.args[0]).toMatchObject({
			baseURL: Constants.cpmsBaseUrl(),
			headers: { Accept: 'application/json', 'X-CPMS-Client': 'RSP' },
		});
		expect(client.post.calledOnceWithExactly('token', {
			client_id: Constants.fixedPenaltyClientId(),
			client_secret: Constants.fixedPenaltySecret(),
			...authBody,
		})).toBe(true);

		client.post.returns(response(undefined));
		await expect(cpmsAuth('IM', authBody)).rejects.toThrow('No auth token returned from CPMS');
		expect(client.post.lastCall.args[1].client_id).toBe(Constants.immobilisationClientId());
	});

	it('authenticates court deposits, rejects invalid types, and maps HTTP errors', async () => {
		const client = { post: sinon.stub().returns(response('court-token')) };
		const create = sinon.stub(axios, 'create').returns(client);
		const authBody = { scope: 'REPORT', grant_type: 'client_credentials', user_id: 'unit-user' };

		expect(await cpmsAuth('CDN', authBody)).toBe('court-token');
		expect(client.post.lastCall.args[1].client_id).toBe(Constants.courtDepositClientId());
		expect(await cpmsAuth('UNKNOWN', authBody)).toBe(false);
		expect(create.calledTwice).toBe(true);

		client.post.returns(rejection({ isAxiosError: true, response: { data: 'invalid client', status: 401 } }));
		await expect(cpmsAuth('FPN', authBody)).rejects.toEqual({
			statusCode: 400,
			headers: { 'Access-Control-Allow-Origin': '*' },
			body: '"Error authenticating"',
		});
	});

	it('submits individual transactions, rejects empty data, and converts CPMS errors', async () => {
		const client = {
			post: sinon.stub()
				.onFirstCall().returns(response({ receipt_reference: 'CPMS-1' }))
				.onSecondCall()
				.returns(response(undefined))
				.onThirdCall()
				.returns(rejection({
					isAxiosError: true,
					response: { data: 'payment declined', status: 422 },
				}))
				.onCall(3)
				.returns(rejection(new Error('local failure'))),
		};
		const create = sinon.stub(axios, 'create').returns(client);
		const transaction = {
			endpoint: '/payment/card',
			redirectUrl: 'https://example.invalid/complete',
			paymentObject: {
				penalty_type: 'FPN',
				penalty_amount: 10,
				penalty_reference: 'PEN-1',
				payment_code: 'PAY-1',
				vehicle_reg: 'UNIT123',
			},
			auth: { scope: 'CARD' },
		};

		expect(await cpmsPayment(transaction)).toEqual({ receipt_reference: 'CPMS-1' });
		expect(create.firstCall.args[0]).toMatchObject({
			baseURL: Constants.cpmsBaseUrl(),
			headers: {
				'Content-Type': 'application/vnd.dvsa-gov-uk.v2+json',
				'X-CPMS-Client': 'RSP',
			},
		});
		expect(client.post.firstCall.args[0]).toBe('/payment/card');
		expect(client.post.firstCall.args[1]).toMatchObject({
			total_amount: '10.00',
			customer_reference: 'PAY-1',
			payment_data: [{ sales_reference: 'PEN-1_FPN' }],
		});
		await expect(cpmsPayment(transaction)).rejects.toThrow('Call to CPMS returned no data');
		await expect(cpmsPayment(transaction)).rejects.toThrow('payment declined');
		await expect(cpmsPayment(transaction)).rejects.toThrow('local failure');
	});

	it('validates group transactions before posting and returns CPMS data', async () => {
		sinon.stub(Constants, 'customerManagerName').returns('manager');
		sinon.stub(Constants, 'customerName').returns('DVSA RSP');
		sinon.stub(Constants, 'customerAddress').returns({
			line_1: '1 Test Street',
			line_2: 'Test District',
			line_3: 'Test County',
			line_4: '',
			city: 'Unit Test City',
			postcode: 'TE5 7ST',
		});
		sinon.stub(Constants, 'receiverAddress').returns({
			line_1: '1 Test Street',
			line_2: 'Test District',
			line_3: 'Test County',
			line_4: '',
			city: 'Unit Test City',
			postcode: 'TE5 7ST',
		});
		sinon.stub(Constants, 'userId').returns('unit-user');
		const client = { post: sinon.stub().returns(response({ receipt_reference: 'GROUP-1' })) };
		const create = sinon.stub(axios, 'create').returns(client);
		const transaction = {
			endpoint: '/payment/card',
			redirectUrl: 'https://example.invalid/complete',
			paymentObject: {
				RedirectUrl: 'https://example.invalid/complete',
				TotalAmount: 10,
				PenaltyType: 'FPN',
				PenaltyGroupId: 'GROUP1',
				Penalties: [{
					PenaltyAmount: 10,
					PenaltyReference: 'PEN1',
					VehicleRegistration: 'UNIT123',
				}],
			},
			auth: { scope: 'CARD' },
		};

		expect(await cpmsGroupPayment(transaction)).toEqual({ receipt_reference: 'GROUP-1' });
		expect(create.calledOnce).toBe(true);
		expect(client.post.calledOnce).toBe(true);
		expect(client.post.firstCall.args[0]).toBe('/payment/card');
		expect(client.post.firstCall.args[1]).toMatchObject({
			customer_reference: 'GROUP1',
			customer_manager_name: 'manager',
			payment_data: [{ amount: '10.00', sales_reference: 'PEN1_FPN' }],
		});
	});

	it('rejects invalid group inputs, missing CPMS data, and CPMS errors', async () => {
		const client = {
			post: sinon.stub()
				.onFirstCall().returns(response(undefined))
				.onSecondCall()
				.returns(rejection(new Error('CPMS unavailable'))),
		};
		sinon.stub(axios, 'create').returns(client);
		const invalidTransaction = {
			endpoint: '/payment/card',
			paymentObject: {
				PenaltyType: 'FPN', PenaltyGroupId: 'bad', TotalAmount: 0, Penalties: [],
			},
			auth: { scope: 'CARD' },
		};

		await expect(cpmsGroupPayment(invalidTransaction)).rejects.toThrow('Invalid Input:');

		const validTransaction = {
			endpoint: '/payment/card',
			paymentObject: {
				RedirectUrl: 'https://example.invalid/complete',
				TotalAmount: 10,
				PenaltyType: 'FPN',
				PenaltyGroupId: 'GROUP1',
				Penalties: [{
					PenaltyAmount: 10,
					PenaltyReference: 'PEN1',
					VehicleRegistration: 'UNIT123',
				}],
			},
			auth: { scope: 'CARD' },
		};
		sinon.stub(Constants, 'customerManagerName').returns('manager');
		sinon.stub(Constants, 'customerName').returns('DVSA RSP');
		sinon.stub(Constants, 'customerAddress').returns({
			line_1: '1', line_2: '2', line_3: '3', line_4: '', city: 'City', postcode: 'TE5 7ST',
		});
		sinon.stub(Constants, 'receiverAddress').returns({
			line_1: '1', line_2: '2', line_3: '3', line_4: '', city: 'City', postcode: 'TE5 7ST',
		});
		sinon.stub(Constants, 'userId').returns('unit-user');

		await expect(cpmsGroupPayment(validTransaction)).rejects.toThrow('Call to CPMS returned no data');
		await expect(cpmsGroupPayment(validTransaction)).rejects.toThrow('CPMS unavailable');
	});

	it('confirms, chargebacks and reverses requests and reports their failures', async () => {
		const client = {
			put: sinon.stub().onFirstCall().returns(response({ status: 'paid' }))
				.onSecondCall()
				.returns(response(undefined))
				.onThirdCall()
				.returns(rejection(new Error('confirm failed'))),
			post: sinon.stub()
				.onFirstCall().returns(response({ status: 'charged back' }))
				.onSecondCall()
				.returns(response(undefined))
				.onThirdCall()
				.returns(rejection({
					response: { data: 'chargeback rejected', status: 409 },
				}))
				.onCall(3)
				.returns(response({ status: 'reversed' }))
				.onCall(4)
				.returns(response(undefined))
				.onCall(5)
				.returns(rejection({ response: { data: 'reversal rejected' } })),
		};
		const create = sinon.stub(axios, 'create').returns(client);

		expect(await cpmsConfirm('RCPT-1', 'token')).toEqual({ status: 'paid' });
		expect(client.put.firstCall.args[0]).toBe('gateway/RCPT-1/complete');
		await expect(cpmsConfirm('RCPT-1', 'token')).rejects.toThrow('No confirmation data returned from CPMS');
		await expect(cpmsConfirm('RCPT-1', 'token')).rejects.toThrow('confirm failed');

		expect(await cpmsChargeback({
			receipt_reference: 'RCPT-2',
			customer_reference: 'PAY-2',
			auth: { access_token: 'unit-token' },
		})).toEqual({ status: 'charged back' });
		expect(client.post.firstCall.args).toEqual([
			'payment/RCPT-2/chargeback',
			{ customer_reference: 'PAY-2', scope: 'CHARGE_BACK' },
		]);
		await expect(cpmsChargeback({
			receipt_reference: 'RCPT-2',
			customer_reference: 'PAY-2',
			auth: { access_token: 'unit-token' },
		})).rejects.toThrow('call to CPMS returned no data');
		await expect(cpmsChargeback({
			receipt_reference: 'RCPT-2',
			customer_reference: 'PAY-2',
			auth: { access_token: 'unit-token' },
		})).rejects.toMatchObject({ errorData: 'chargeback rejected', errorStatus: 409 });

		expect(await cpmsReversal({
			receipt_reference: 'RCPT-3',
			customer_reference: 'PAY-3',
			auth: { access_token: 'unit-token' },
		})).toEqual({ status: 'reversed' });
		expect(client.post.getCall(3).args).toEqual([
			'payment/RCPT-3/reversal',
			{ customer_reference: 'PAY-3', scope: 'CHEQUE_RD', cost_centre: '' },
		]);
		await expect(cpmsReversal({
			receipt_reference: 'RCPT-3',
			customer_reference: 'PAY-3',
			auth: { access_token: 'unit-token' },
		})).rejects.toThrow('Call to CPMS returned no data');
		await expect(cpmsReversal({
			receipt_reference: 'RCPT-3',
			customer_reference: 'PAY-3',
			auth: { access_token: 'unit-token' },
		})).rejects.toEqual({ data: 'reversal rejected' });
		expect(create.callCount).toBe(9);
	});

	it('generates, lists and checks reports with their expected requests and errors', async () => {
		const client = {
			post: sinon.stub().onFirstCall().returns(response({ report_ref: 'R-1' }))
				.onSecondCall()
				.returns(response(undefined))
				.onThirdCall()
				.returns(rejection({ response: { data: 'report rejected' } })),
			get: sinon.stub()
				.onFirstCall().returns(response([{ report_ref: 'R-2' }]))
				.onSecondCall()
				.returns(response(undefined))
				.onThirdCall()
				.returns(rejection({ response: { data: 'list failed' } }))
				.onCall(3)
				.returns(response({ status: 'complete' }))
				.onCall(4)
				.returns(response(undefined))
				.onCall(5)
				.returns(rejection({ response: { data: 'status failed' } })),
		};
		sinon.stub(axios, 'create').returns(client);

		const options = { report_code: 'DAILY', filters: { from: '2026-01-01', to: '2026-01-31' } };
		expect(await cpmsGenerateReport({ generateReportOptions: options, authToken: 'unit-token' }))
			.toEqual({ report_ref: 'R-1' });
		expect(client.post.firstCall.args).toEqual(['report', options]);
		await expect(cpmsGenerateReport({ generateReportOptions: options, authToken: 'unit-token' }))
			.rejects.toThrow('No generate report response returned from CPMS');
		await expect(cpmsGenerateReport({ generateReportOptions: options, authToken: 'unit-token' }))
			.rejects.toBe(JSON.stringify({ response: { data: 'report rejected' } }));

		expect(await cpmsListReport({ access_token: 'unit-token' })).toEqual([{ report_ref: 'R-2' }]);
		expect(client.get.firstCall.args[0]).toBe('report');
		await expect(cpmsListReport({ access_token: 'unit-token' })).rejects.toThrow('No report data returned from CPMS');
		await expect(cpmsListReport({ access_token: 'unit-token' }))
			.rejects.toBe(JSON.stringify({ response: { data: 'list failed' } }));

		expect(await cpmsCheckReport({ report_ref: 'R-3', authToken: 'unit-token' }))
			.toEqual({ status: 'complete' });
		expect(client.get.getCall(3).args[0]).toBe('report/R-3/status');
		await expect(cpmsCheckReport({ report_ref: 'R-3', authToken: 'unit-token' }))
			.rejects.toThrow('No report status returned from CPMS');
		await expect(cpmsCheckReport({ report_ref: 'R-3', authToken: 'unit-token' }))
			.rejects.toBe(JSON.stringify({ response: { data: 'status failed' } }));
	});

	it('downloads report streams from both CPMS report endpoints', async () => {
		const contents = { pipe: sinon.stub() };
		const client = {
			get: sinon.stub().onFirstCall().returns(response(contents))
				.onSecondCall()
				.returns(rejection({ response: { data: 'download failed' } }))
				.onThirdCall()
				.returns(response(contents))
				.onCall(3)
				.returns(rejection({ response: { data: 'payment report failed' } })),
		};
		const create = sinon.stub(axios, 'create').returns(client);

		expect(await downloadReport({ report_ref: 'R-4', authToken: 'unit-token' })).toBe(contents);
		expect(create.firstCall.args[0].headers.responseType).toBe('stream');
		expect(client.get.firstCall.args[0]).toBe('/report/R-4/download');
		await expect(downloadReport({ report_ref: 'R-4', authToken: 'unit-token' }))
			.rejects.toBe(JSON.stringify({ response: { data: 'download failed' } }));

		expect(await cpmsDownloadReport({
			report_reference: 'R-5',
			authToken: { access_token: 'unit-token' },
			auth: { access_token: 'unit-token' },
		})).toBe(contents);
		expect(client.get.getCall(2).args[0]).toBe('payment/report/R-5/download');
		await expect(cpmsDownloadReport({
			report_reference: 'R-5',
			authToken: { access_token: 'unit-token' },
			auth: { access_token: 'unit-token' },
		}))
			.rejects.toBe(JSON.stringify({ response: { data: 'payment report failed' } }));
	});
});

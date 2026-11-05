import sinon from 'sinon';
import { expect } from 'expect';
import AWS from 'aws-sdk';
import { createRequire } from 'module';

const requireModule = createRequire(`${process.cwd()}/src/utils/constants.unit.js`);

const originalEnvironment = {};
const environmentKeys = ['USE_SECRETS_MANAGER', 'SECRETS_MANAGER_SECRET_NAME', 'REGION', 'URL'];

const loadFreshConstants = () => {
	delete requireModule.cache[requireModule.resolve('./constants')];
	return requireModule('./constants').default;
};

describe('Constants configuration', () => {
	beforeEach(() => {
		environmentKeys.forEach((key) => {
			originalEnvironment[key] = process.env[key];
		});
		process.env.USE_SECRETS_MANAGER = 'false';
		sinon.stub(console, 'log');
		sinon.stub(console, 'error');
	});

	afterEach(() => {
		environmentKeys.forEach((key) => {
			if (originalEnvironment[key] === undefined) {
				delete process.env[key];
			} else {
				process.env[key] = originalEnvironment[key];
			}
		});
		sinon.restore();
	});

	it('loads and memoizes every mapped value from synthetic environment settings', async () => {
		const constants = loadFreshConstants();
		const configuration = await constants.bootstrap();

		expect(configuration).toMatchObject({
			URL: 'https://cpms.invalid',
			USERID: 'unit-test-user',
			FIXED_PENALTY_SCHEME: 'unit-fixed-client',
			FIXED_PENALTY_SECRET: 'unit-fixed-secret',
			IMMOBILISATION_SCHEME: 'unit-immobilisation-client',
			IMMOBILISATION_SECRET: 'unit-immobilisation-secret',
			COURT_DEPOSIT_SCHEME: 'unit-court-client',
			COURT_DEPOSIT_SECRET: 'unit-court-secret',
			SQS_URL: 'https://sqs.eu-west-1.amazonaws.com/000000000000/unit-test',
			COST_CENTRE: 'unit-cost-centre',
			CUSTOMER_NAME: 'Unit Test Customer',
			CUSTOMER_MANAGER_NAME: 'Unit Test Manager',
		});
		expect(configuration.ADDRESS_LINE4).toBe('Test Country');
		expect(constants.cpmsBaseUrl()).toBe('https://cpms.invalid');
		expect(constants.userId()).toBe('unit-test-user');
		expect(constants.fixedPenaltyClientId()).toBe('unit-fixed-client');
		expect(constants.fixedPenaltySecret()).toBe('unit-fixed-secret');
		expect(constants.immobilisationClientId()).toBe('unit-immobilisation-client');
		expect(constants.immobilisationSecret()).toBe('unit-immobilisation-secret');
		expect(constants.courtDepositClientId()).toBe('unit-court-client');
		expect(constants.courtDepositSecret()).toBe('unit-court-secret');
		expect(constants.costCentre()).toBe('unit-cost-centre');
		expect(constants.customerName()).toBe('Unit Test Customer');
		expect(constants.customerManagerName()).toBe('Unit Test Manager');
		expect(constants.sqsUrl()).toBe(configuration.SQS_URL);
		expect(constants.customerAddress()).toEqual({
			line_1: '1 Test Street',
			line_2: 'Test District',
			line_3: 'Test County',
			line_4: 'Test Country',
			city: 'Unit Test City',
			postcode: 'TE5 7ST',
		});
		expect(constants.receiverAddress()).toEqual(constants.customerAddress());
		expect(constants.cardHolderPresentAuthBody()).toEqual({
			scope: 'CARD',
			grant_type: 'client_credentials',
			user_id: 'unit-test-user',
		});
		expect(constants.cardHolderNotPresentAuthBody().scope).toBe('CNP');
		expect(constants.cashPaymentAuthBody().scope).toBe('CASH');
		expect(constants.chequePaymentAuthBody().scope).toBe('CHEQUE');
		expect(constants.postalOrderAuthBody().scope).toBe('POSTAL_ORDER');
		expect(constants.chargebackAuthBody().scope).toBe('CHARGE_BACK');
		expect(constants.reversalAuthBody().scope).toBe('CHEQUE_RD');
		expect(constants.reportingAuthBody().scope).toBe('REPORT');

		process.env.URL = 'https://changed.invalid';
		expect(await constants.bootstrap()).toBe(configuration);
		expect(constants.cpmsBaseUrl()).toBe('https://cpms.invalid');
	});

	it('loads Secrets Manager configuration and rejects failed requests', async () => {
		const constants = loadFreshConstants();
		const secret = { URL: 'https://secret.invalid', USERID: 'secret-user' };
		process.env.USE_SECRETS_MANAGER = 'true';
		process.env.SECRETS_MANAGER_SECRET_NAME = 'unit-test-secret';
		process.env.REGION = 'eu-west-1';
		const send = sinon.stub(AWS.Request.prototype, 'send').callsFake(function sendSecret(callback) {
			callback(null, { SecretString: JSON.stringify(secret) });
			return this;
		});

		const configuration = await constants.bootstrap();
		expect(configuration).toEqual(secret);
		expect(constants.cpmsBaseUrl()).toBe(secret.URL);
		expect(await constants.bootstrap()).toBe(configuration);
		expect(send.calledOnce).toBe(true);

		const failedConstants = loadFreshConstants();
		const failure = new Error('Secrets Manager unavailable');
		send.callsFake(function failSecret(callback) {
			callback(failure);
			return this;
		});
		await expect(failedConstants.bootstrap()).rejects.toBe(failure);
	});

	it('rejects malformed Secrets Manager JSON', async () => {
		process.env.USE_SECRETS_MANAGER = 'true';
		process.env.SECRETS_MANAGER_SECRET_NAME = 'unit-test-secret';
		process.env.REGION = 'eu-west-1';
		sinon.stub(AWS.Request.prototype, 'send').callsFake(function malformedSecret(callback) {
			callback(null, { SecretString: '{invalid' });
			return this;
		});

		await expect(loadFreshConstants().bootstrap()).rejects.toThrow();
	});
});

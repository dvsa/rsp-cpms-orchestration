const http = require('http');
const https = require('https');

const syntheticEnvironment = {
	AWS_ACCESS_KEY_ID: 'unit-test-access-key',
	AWS_EC2_METADATA_DISABLED: 'true',
	AWS_REGION: 'eu-west-1',
	AWS_SECRET_ACCESS_KEY: 'unit-test-secret-key',
	ADDRESS_CITY: 'Unit Test City',
	ADDRESS_LINE1: '1 Test Street',
	ADDRESS_LINE2: 'Test District',
	ADDRESS_LINE3: 'Test County',
	ADDRESS_LINE4: 'Test Country',
	ADDRESS_POSTCODE: 'TE5 7ST',
	COURT_DEPOSIT_SCHEME: 'unit-court-client',
	COURT_DEPOSIT_SECRET: 'unit-court-secret',
	COST_CENTRE: 'unit-cost-centre',
	CUSTOMER_MANAGER_NAME: 'Unit Test Manager',
	CUSTOMER_NAME: 'Unit Test Customer',
	FIXED_PENALTY_SCHEME: 'unit-fixed-client',
	FIXED_PENALTY_SECRET: 'unit-fixed-secret',
	IMMOBILISATION_SCHEME: 'unit-immobilisation-client',
	IMMOBILISATION_SECRET: 'unit-immobilisation-secret',
	REGION: 'eu-west-1',
	SQS_URL: 'https://sqs.eu-west-1.amazonaws.com/000000000000/unit-test',
	URL: 'https://cpms.invalid',
	USE_SECRETS_MANAGER: 'false',
	USERID: 'unit-test-user',
};

Object.assign(process.env, syntheticEnvironment);
delete process.env.AWS_PROFILE;
delete process.env.AWS_SESSION_TOKEN;

const { SQSClient } = require('@aws-sdk/client-sqs');
const { SecretsManagerClient } = require('@aws-sdk/client-secrets-manager');
const rejectAws = () => {
	throw new Error('Unexpected AWS request in isolated unit tests');
};
SQSClient.prototype.send = rejectAws;
SecretsManagerClient.prototype.send = rejectAws;

const rejectNetwork = () => {
	throw new Error('Network access is disabled in isolated unit tests');
};

http.request = rejectNetwork;
http.get = rejectNetwork;
https.request = rejectNetwork;
https.get = rejectNetwork;

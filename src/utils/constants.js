import { SecretsManager } from 'aws-sdk';

const configMetadata = {
	addressCity: 'ADDRESS_CITY',
	addressLine1: 'ADDRESS_LINE1',
	addressLine2: 'ADDRESS_LINE2',
	addressLine3: 'ADDRESS_LINE3',
	addressLine4: 'ADDRESS_LINE4',
	addressPostcode: 'ADDRESS_POSTCODE',
	costCentre: 'COST_CENTRE',
	courtDepositClientId: 'COURT_DEPOSIT_SCHEME',
	courtDepositSecret: 'COURT_DEPOSIT_SECRET',
	cpmsBaseUrl: 'URL',
	customerManagerName: 'CUSTOMER_MANAGER_NAME',
	customerName: 'CUSTOMER_NAME',
	fixedPenaltyClientId: 'FIXED_PENALTY_SCHEME',
	fixedPenaltySecret: 'FIXED_PENALTY_SECRET',
	immobilisationClientId: 'IMMOBILISATION_SCHEME',
	immobilisationSecret: 'IMMOBILISATION_SECRET',
	sqsUrl: 'SQS_URL',
	userId: 'USERID',
};

let configuration = {};
async function bootstrap() {
	return new Promise((resolve, reject) => {
		if (process.env.USE_SECRETS_MANAGER === 'true') {
			const SecretId = process.env.SECRETS_MANAGER_SECRET_NAME;
			console.log(`Pulling config from AWS Secrets Manager for secret ${SecretId}...`);
			const secretsManagerClient = new SecretsManager({ region: process.env.REGION });
			secretsManagerClient.getSecretValue({ SecretId }, (err, secretsManagerResponse) => {
				if (err) {
					console.log(err);
					reject(err);
				}
				configuration = JSON.parse(secretsManagerResponse.SecretString);
				console.log(`Cached ${Object.keys(configuration).length} config items from secrets manager`);
				resolve(configuration);
			});
		} else {
			console.log('Using envvars for config');
			configuration = Object.values(configMetadata)
				.reduce((config, envkey) => ({ [envkey]: process.env[envkey], ...config }), configuration);
			console.log('Finished getting envvars');
			resolve(configuration);
		}
	});
}

const costCentre = () => {
	return configuration[configMetadata.costCentre];
};

const courtDepositClientId = () => {
	return configuration[configMetadata.courtDepositClientId];
};

const courtDepositSecret = () => {
	return configuration[configMetadata.courtDepositSecret];
};

const cpmsBaseUrl = () => {
	return configuration[configMetadata.cpmsBaseUrl];
};

const customerAddress = () => ({
	line_1: configuration[configMetadata.addressLine1],
	line_2: configuration[configMetadata.addressLine2],
	line_3: configuration[configMetadata.addressLine3],
	line_4: configuration[configMetadata.addressLine4],
	city: configuration[configMetadata.addressCity],
	postcode: configuration[configMetadata.addressPostcode],
});

const customerName = () => {
	return configuration[configMetadata.customerName];
};

const customerManagerName = () => {
	return configuration[configMetadata.customerManagerName];
};

const fixedPenaltyClientId = () => {
	return configuration[configMetadata.fixedPenaltyClientId];
};

const fixedPenaltySecret = () => {
	return configuration[configMetadata.fixedPenaltySecret];
};

const immobilisationClientId = () => {
	return configuration[configMetadata.immobilisationClientId];
};

const immobilisationSecret = () => {
	return configuration[configMetadata.immobilisationSecret];
};

const receiverAddress = () => ({
	line_1: configuration[configMetadata.addressLine1],
	line_2: configuration[configMetadata.addressLine2],
	line_3: configuration[configMetadata.addressLine3],
	line_4: configuration[configMetadata.addressLine4],
	city: configuration[configMetadata.addressCity],
	postcode: configuration[configMetadata.addressPostcode],
});

const sqsUrl = () => {
	return configuration[configMetadata.sqsUrl];
};

const userId = () => {
	return configuration[configMetadata.userId];
};

const authBodyWithScopeFn = scope => () => ({
	scope,
	grant_type: 'client_credentials',
	user_id: userId(),
});

const constants = {
	bootstrap,
	cpmsBaseUrl,
	cardHolderPresentAuthBody: authBodyWithScopeFn('CARD'),
	cardHolderNotPresentAuthBody: authBodyWithScopeFn('CNP'),
	chequePaymentAuthBody: authBodyWithScopeFn('CHEQUE'),
	cashPaymentAuthBody: authBodyWithScopeFn('CASH'),
	postalOrderAuthBody: authBodyWithScopeFn('POSTAL_ORDER'),
	reportingAuthBody: authBodyWithScopeFn('REPORT'),
	chargebackAuthBody: authBodyWithScopeFn('CHARGE_BACK'),
	reversalAuthBody: authBodyWithScopeFn('CHEQUE_RD'),
	receiverAddress,
	customerName,
	customerManagerName,
	customerAddress,
	fixedPenaltyClientId,
	immobilisationClientId,
	courtDepositClientId,
	fixedPenaltySecret,
	immobilisationSecret,
	courtDepositSecret,
	userId,
	costCentre,
	sqsUrl,
};

export default constants;


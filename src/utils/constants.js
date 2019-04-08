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
	cpmsSecrets: 'CPMS_SECRETS',
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
				console.log(configuration);
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

const fromConfiguration = configKey => () => {
	return configuration[configKey];
};

const customerAddress = () => ({
	line_1: fromConfiguration(configMetadata.addressLine1)(),
	line_2: fromConfiguration(configMetadata.addressLine2)(),
	line_3: fromConfiguration(configMetadata.addressLine3)(),
	line_4: fromConfiguration(configMetadata.addressLine4)(),
	city: fromConfiguration(configMetadata.addressCity)(),
	postcode: fromConfiguration(configMetadata.addressPostcode)(),
});

const receiverAddress = () => ({
	line_1: fromConfiguration(configMetadata.addressLine1)(),
	line_2: fromConfiguration(configMetadata.addressLine2)(),
	line_3: fromConfiguration(configMetadata.addressLine3)(),
	line_4: fromConfiguration(configMetadata.addressLine4)(),
	city: fromConfiguration(configMetadata.addressCity)(),
	postcode: fromConfiguration(configMetadata.addressPostcode)(),
});

const authBodyWithScopeFn = scope => () => ({
	scope,
	grant_type: 'client_credentials',
	user_id: fromConfiguration(configMetadata.userId)(),
});

const constants = {
	bootstrap,
	cardHolderNotPresentAuthBody: authBodyWithScopeFn('CNP'),
	cardHolderPresentAuthBody: authBodyWithScopeFn('CARD'),
	cashPaymentAuthBody: authBodyWithScopeFn('CASH'),
	chargebackAuthBody: authBodyWithScopeFn('CHARGE_BACK'),
	chequePaymentAuthBody: authBodyWithScopeFn('CHEQUE'),
	costCentre: fromConfiguration(configMetadata.costCentre),
	courtDepositClientId: fromConfiguration(configMetadata.courtDepositClientId),
	courtDepositSecret: fromConfiguration(configMetadata.courtDepositSecret),
	cpmsBaseUrl: fromConfiguration(configMetadata.cpmsBaseUrl),
	customerAddress,
	customerManagerName: fromConfiguration(configMetadata.customerManagerName),
	customerName: fromConfiguration(configMetadata.customerName),
	fixedPenaltyClientId: fromConfiguration(configMetadata.fixedPenaltyClientId),
	fixedPenaltySecret: fromConfiguration(configMetadata.fixedPenaltySecret),
	immobilisationClientId: fromConfiguration(configMetadata.immobilisationClientId),
	immobilisationSecret: fromConfiguration(configMetadata.immobilisationSecret),
	postalOrderAuthBody: authBodyWithScopeFn('POSTAL_ORDER'),
	receiverAddress,
	reportingAuthBody: authBodyWithScopeFn('REPORT'),
	reversalAuthBody: authBodyWithScopeFn('CHEQUE_RD'),
	sqsUrl: fromConfiguration(configMetadata.sqsUrl),
	userId: fromConfiguration(configMetadata.userId),
	cpmsSecrets: JSON.parse(fromConfiguration(configMetadata.cpmsSecrets)),
};

export default constants;


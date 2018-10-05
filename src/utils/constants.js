import { SecretsManager } from 'aws-sdk';

const configMetadata = {
	addressCity: 'ADDRESS_CITY',
	addressLine1: 'ADDRESS_LINE1',
	addressLine2: 'ADDRESS_LINE2',
	addressLine3: 'ADDRESS_LINE3',
	addressLine4: 'ADDRESS_LINE4',
	addressPostcode: 'ADDRESS_POSTCODE',
	courtDepositScheme: 'COURT_DEPOSIT_SCHEME',
	courtDepositSecret: 'COURT_DEPOSIT_SECRET',
	cpmsBaseUrl: 'URL',
	customerManagerName: 'CUSTOMER_MANAGER_NAME',
	customerName: 'CUSTOMER_NAME',
	fixedPenaltyScheme: 'FIXED_PENALTY_SCHEME',
	fixedPenaltySecret: 'FIXED_PENALTY_SECRET',
	immobilisationScheme: 'IMMOBILISATION_SCHEME',
	immobilisationSecret: 'IMMOBILISATION_SECRET',
	sqsUrl: 'SQS_URL',
	userid: 'USERID',
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

const cpmsBaseUrl = () => {
	return configuration[configMetadata.cpmsBaseUrl];
};

const constants = {
	bootstrap,
	cpmsBaseUrl,
	cardHolderPresentAuthBody: {
		scope: 'CARD',
		grant_type: 'client_credentials',
		user_id: process.env.USERID,
	},
	cardHolderNotPresentAuthBody: {
		scope: 'CNP',
		grant_type: 'client_credentials',
		user_id: process.env.USERID,
	},
	chequePaymentAuthBody: {
		scope: 'CHEQUE',
		grant_type: 'client_credentials',
		user_id: process.env.USERID,
	},
	cashPaymentAuthBody: {
		scope: 'CASH',
		grant_type: 'client_credentials',
		user_id: process.env.USERID,
	},
	postalOrderAuthBody: {
		scope: 'POSTAL_ORDER',
		grant_type: 'client_credentials',
		user_id: process.env.USERID,
	},
	reportingAuthBody: {
		scope: 'REPORT',
		grant_type: 'client_credentials',
		user_id: process.env.USERID,
	},
	chargebackAuthBody: {
		scope: 'CHARGE_BACK',
		grant_type: 'client_credentials',
		user_id: process.env.USERID,
	},
	reversalAuthBody: {
		scope: 'CHEQUE_RD',
		grant_type: 'client_credentials',
		user_id: process.env.USERID,
	},
	receiverAddress: {
		line_1: process.env.ADDRESS_LINE1,
		line_2: process.env.ADDRESS_LINE2,
		line_3: process.env.ADDRESS_LINE3,
		line_4: process.env.ADDRESS_LINE4,
		city: process.env.ADDRESS_CITY,
		postcode: process.env.ADDRESS_POSTCODE,
	},
	customerName: process.env.CUSTOMER_NAME,
	customerManagerName: process.env.CUSTOMER_MANAGER_NAME,
	customerAddress: {
		line_1: process.env.ADDRESS_LINE1,
		line_2: process.env.ADDRESS_LINE2,
		line_3: process.env.ADDRESS_LINE3,
		line_4: process.env.ADDRESS_LINE4,
		city: process.env.ADDRESS_CITY,
		postcode: process.env.ADDRESS_POSTCODE,
	},
	fixedPenaltyClientId: process.env.FIXED_PENALTY_SCHEME,
	immobilisationClientId: process.env.IMMOBILISATION_SCHEME,
	courtDepositClientId: process.env.COURT_DEPOSIT_SCHEME,
	fixedPenaltySecret: process.env.FIXED_PENALTY_SECRET,
	immobilisationSecret: process.env.IMMOBILISATION_SECRET,
	courtDepositSecret: process.env.COURT_DEPOSIT_SECRET,
	userId: process.env.USERID,
	cost_centre: process.env.COST_CENTRE,
};

export default constants;


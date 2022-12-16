import axios from 'axios';
import Validation from '@dvsa/rsp-validation';

import buildGroupTransactionOptions from './buildGroupTransactionOptions';
import Constants from './constants';
import { logAxiosError, logInfo, logError } from './logger';

export default (groupTransactionData) => {
	return new Promise((resolve, reject) => {

		const transactionClient = axios.create({
			baseURL: Constants.cpmsBaseUrl(),
			headers: {
				'Content-Type': 'application/vnd.dvsa-gov-uk.v2+json',
				Authorization: `Bearer ${groupTransactionData.auth.access_token}`,
			},
		});

		const transactionOptions = buildGroupTransactionOptions(groupTransactionData);
		const validationResult = Validation.cpmsTransactionValidation(transactionOptions);
		if (!validationResult.valid) {
			const errMsg = validationResult.error.message;
			reject(errMsg);
			return;
		}
		transactionClient.post(groupTransactionData.endpoint, transactionOptions)
			.then((transactionResponse) => {
				if (typeof transactionResponse.data === 'undefined') {
					logError('CPMSGroupPaymentNoData', { groupTransactionData });
					reject(new Error('Call to CPMS returned no data'));
				}
				logInfo('CPMSGroupPaymentSuccess', { groupTransactionData });
				resolve(transactionResponse.data);
			}).catch((err) => {
				logAxiosError('CpmsGroupPayment', 'CPMS', err, { groupTransactionData });
				throw err;
			});
	});
};

import axios from 'axios';
import Validation from 'rsp-validation';

import buildGroupTransactionOptions from '../utils/buildGroupTransactionOptions';
import Constants from '../utils/constants';
import { logAxiosError } from './logger';

export default (groupTransactionData) => {
	return new Promise((resolve, reject) => {

		const transactionClient = axios.create({
			baseURL: Constants.cpmsBaseUrl(),
			headers: {
				'Content-Type': 'application/vnd.dvsa-gov-uk.v2+json',
				Authorization: `Bearer ${groupTransactionData.auth.access_token}`,
			},
		});
		console.log('created transaction client');

		const transactionOptions = buildGroupTransactionOptions(groupTransactionData);
		const validationResult = Validation.cpmsTransactionValidation(transactionOptions);
		if (!validationResult.valid) {
			const errMsg = validationResult.error.message;
			console.log(errMsg);
			reject(errMsg);
			return;
		}
		console.log(JSON.stringify(transactionOptions));
		transactionClient.post(groupTransactionData.endpoint, transactionOptions)
			.then((transactionResponse) => {
				console.log('transaction response');
				console.log(transactionResponse);
				if (typeof transactionResponse.data === 'undefined') {
					reject(new Error('Call to CPMS returned no data'));
				}
				resolve(transactionResponse.data);
			}).catch((err) => {
				logAxiosError('CpmsGroupPayment', 'CPMS', err);
				throw err;
			});
	});
};

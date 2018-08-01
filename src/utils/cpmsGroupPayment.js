import axios from 'axios';
import Validation from 'rsp-validation';

import buildGroupTransactionOptions from '../utils/buildGroupTransactionOptions';
import Constants from '../utils/constants';

export default (groupTransactionData) => {
	return new Promise((resolve, reject) => {

		const transactionClient = axios.create({
			baseURL: Constants.cpmsBaseUrl,
			timeout: 6000,
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
			reject(errMsg);
			return;
		}
		console.log(transactionOptions);
		transactionClient.post(groupTransactionData.endpoint, transactionOptions)
			.then((transactionResponse) => {
				console.log('transaction response');
				console.log(transactionResponse);
				if (typeof transactionResponse.data === 'undefined') {
					reject(new Error('Call to CPMS returned no data'));
				}
				resolve(transactionResponse.data);
			})
			.catch((error) => {
				console.log('transaction error');
				console.log(error.response);
				reject(error.response);
			});
	});
};
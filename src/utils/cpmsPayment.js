import axios from 'axios';

import BuildTransactionOptions from '../utils/buildTransactionOptions';
import Constants from '../utils/constants';

export default (transactionData) => {
	return new Promise((resolve, reject) => {

		const transactionClient = axios.create({
			baseURL: Constants.cpmsBaseUrl(),
			headers: {
				'Content-Type': 'application/vnd.dvsa-gov-uk.v2+json',
				Authorization: `Bearer ${transactionData.auth.access_token}`,
			},
		});
		console.log('created transaction client');

		const transactionOptions = BuildTransactionOptions(transactionData);
		console.log(JSON.stringify(transactionOptions));
		transactionClient.post(transactionData.endpoint, transactionOptions)
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
				console.log(error.response.data);
				reject(error.response.data);
			});
	});
};

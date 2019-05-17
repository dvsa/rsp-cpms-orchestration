import axios from 'axios';

import buildTransactionOptions from '../utils/buildTransactionOptions';
import Constants from '../utils/constants';
import { logAxiosError, logInfo, logError } from './logger';

export default (transactionData) => {
	return new Promise((resolve, reject) => {

		const transactionClient = axios.create({
			baseURL: Constants.cpmsBaseUrl(),
			headers: {
				'Content-Type': 'application/vnd.dvsa-gov-uk.v2+json',
				Authorization: `Bearer ${transactionData.auth.access_token}`,
			},
		});

		const transactionOptions = buildTransactionOptions(transactionData);

		transactionClient.post(transactionData.endpoint, transactionOptions)
			.then((transactionResponse) => {
				if (typeof transactionResponse.data === 'undefined') {
					logError('CPMSPaymentNoData', { transactionOptions });
					reject(new Error('Call to CPMS returned no data'));
				}
				logInfo('CPMSPaymentSuccess', { transactionOptions });
				resolve(transactionResponse.data);
			})
			.catch((error) => {
				logAxiosError('CpmsPayment', 'CPMS', error, { transactionOptions });
				reject(error.response.data);
			});
	});
};

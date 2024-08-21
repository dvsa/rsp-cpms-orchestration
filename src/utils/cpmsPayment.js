import axios from 'axios';

import buildTransactionOptions from './buildTransactionOptions';
import Constants from './constants';
import { logAxiosError, logInfo, logError } from './logger';

const cpmsPayment = async (transactionData) => {
	const transactionClient = axios.create({
		baseURL: Constants.cpmsBaseUrl(),
		headers: {
			'Content-Type': 'application/vnd.dvsa-gov-uk.v2+json',
			'X-CPMS-Client': 'RSP',
			Authorization: `Bearer ${transactionData.auth.access_token}`,
		},
	});

	const transactionOptions = buildTransactionOptions(transactionData);

	try {
		const transactionResponse = await transactionClient.post(transactionData.endpoint, transactionOptions);
		if (typeof transactionResponse.data === 'undefined') {
			logError('CPMSPaymentNoData', { transactionOptions });
			throw new Error('Call to CPMS returned no data');
		}
		logInfo('CPMSPaymentSuccess', { transactionOptions });
		return transactionResponse.data;
	} catch (error) {
		if (error.isAxiosError) {
			logAxiosError('CpmsPayment', 'CPMS', error, { transactionOptions });
			throw new Error(error.response.data);
		}
		throw new Error(error.message);
	}
};

export default cpmsPayment;

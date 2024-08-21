import axios from 'axios';
import Validation from '@dvsa/rsp-validation';

import buildGroupTransactionOptions from './buildGroupTransactionOptions';
import Constants from './constants';
import { logAxiosError, logError } from './logger';

const cpmsGroupPayment = async (groupTransactionData) => {
	const transactionClient = axios.create({
		baseURL: Constants.cpmsBaseUrl(),
		headers: {
			'Content-Type': 'application/vnd.dvsa-gov-uk.v2+json',
			'X-CPMS-Client': 'RSP',
			Authorization: `Bearer ${groupTransactionData.auth.access_token}`,
		},
	});

	const transactionOptions = buildGroupTransactionOptions(groupTransactionData);
	const validationResult = Validation.cpmsTransactionValidation(transactionOptions);
	if (!validationResult.valid) {
		const errMsg = validationResult.error.message;
		logError('ValidationError', validationResult);
		throw new Error(errMsg);
	}
	try {
		const transactionResponse = await transactionClient.post(groupTransactionData.endpoint, transactionOptions);
		if (typeof transactionResponse.data === 'undefined') {
			logError('CPMSGroupPaymentNoData', { groupTransactionData });
			throw new Error('Call to CPMS returned no data');
		}
		return transactionResponse.data;
	} catch (err) {
		logAxiosError('CpmsGroupPayment', 'CPMS', err, { groupTransactionData });
		throw err;
	}
};

export default cpmsGroupPayment;

import axios from 'axios';

import Constants from './constants';
import { logAxiosError, logError } from './logger';

export default (reversalObj) => {
	return new Promise((resolve, reject) => {

		const reversalClient = axios.create({
			baseURL: Constants.cpmsBaseUrl(),
			headers: {
				'Content-Type': 'application/vnd.dvsa-gov-uk.v2+json',
				'X-CPMS-Client': 'RSP',
				Authorization: `Bearer ${reversalObj.auth.access_token}`,
			},
		});

		const reversalOptions = {
			customer_reference: reversalObj.customer_reference,
			scope: 'CHEQUE_RD',
			cost_centre: '',
		};
		reversalClient.post(
			`payment/${reversalObj.receipt_reference}/reversal`,
			reversalOptions,
		).then((reversalResponse) => {
			if (typeof reversalResponse.data === 'undefined') {
				logError('CPMSReversal', reversalOptions);
				reject(new Error('Call to CPMS returned no data'));
			}
			resolve(reversalResponse.data);
		}).catch((error) => {
			logAxiosError('CpmsReversal', 'CPMS', error);
			reject(error.response);
		});
	});
};

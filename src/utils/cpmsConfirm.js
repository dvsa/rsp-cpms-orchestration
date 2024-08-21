import axios from 'axios';

import Constants from './constants';
import { logAxiosError, logInfo, logError } from './logger';

const confirmNoDataMessage = 'No confirmation data returned from CPMS';

export default (receiptReference, auth) => {
	const confirmClient = axios.create({
		baseURL: Constants.cpmsBaseUrl(),
		headers: {
			'Content-Type': 'application/vnd.dvsa-gov-uk.v2+json',
			'X-CPMS-Client': 'RSP',
			Authorization: `Bearer ${auth.access_token}`,
		},
	});

	const logData = { receiptReference };

	return confirmClient.put(`gateway/${receiptReference}/complete`)
		.then((response) => {
			if (typeof response.data === 'undefined') {
				logError('CPMSConfirmNoData', { ...logData, message: confirmNoDataMessage });
				return Promise.reject(new Error(confirmNoDataMessage));
			}
			logInfo('CPMSConfirmSuccess', logData);
			return Promise.resolve(response.data);
		}).catch((err) => {
			logAxiosError('CPMSConfirm', 'CPMS', err, logData);
			throw err;
		});
};

import axios from 'axios';

import Constants from './constants';
import {
	logAxiosError, logInfo, logError, errorMessageFromAxiosError,
} from './logger';

export default (chargebackObj) => {
	return new Promise((resolve, reject) => {

		const chargebackClient = axios.create({
			baseURL: Constants.cpmsBaseUrl(),
			headers: {
				'Content-Type': 'application/vnd.dvsa-gov-uk.v2+json',
				'X-CPMS-Client': 'RSP',
				Authorization: `Bearer ${chargebackObj.auth.access_token}`,
			},
		});

		const chargebackOptions = {
			customer_reference: chargebackObj.customer_reference,
			scope: 'CHARGE_BACK',
		};

		const logData = {
			customerReference: chargebackObj.customer_reference,
			receiptReference: chargebackObj.receipt_reference,
		};

		chargebackClient.post(
			`payment/${chargebackObj.receipt_reference}/chargeback`,
			chargebackOptions,
		).then((chargebackResponse) => {
			if (typeof chargebackResponse.data === 'undefined') {
				logError('CpmsChargebackNoData', logData);
				reject(new Error('call to CPMS returned no data'));
			}
			logInfo('CpmsChargebackSuccess', logData);
			resolve(chargebackResponse.data);
		}).catch((error) => {
			logAxiosError('CpmsChargeback', 'CPMS', error, logData);
			const axiosErrorMessage = errorMessageFromAxiosError(error);
			reject(axiosErrorMessage);
		});
	});
};

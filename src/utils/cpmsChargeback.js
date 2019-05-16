import axios from 'axios';

import Constants from '../utils/constants';
import { logAxiosError } from './logger';

export default (chargebackObj) => {
	return new Promise((resolve, reject) => {

		const chargebackClient = axios.create({
			baseURL: Constants.cpmsBaseUrl(),
			headers: {
				'Content-Type': 'application/vnd.dvsa-gov-uk.v2+json',
				Authorization: `Bearer ${chargebackObj.auth.access_token}`,
			},
		});
		console.log('created chargeback client');

		const chargebackOptions = {
			customer_reference: chargebackObj.customer_reference,
			scope: 'CHARGE_BACK',
		};
		console.log(chargebackOptions);
		chargebackClient.post(
			`payment/${chargebackObj.receipt_reference}/chargeback`,
			chargebackOptions,
		).then((chargebackResponse) => {
			console.log('chargeback response');
			console.log(chargebackResponse);
			if (typeof chargebackResponse.data === 'undefined') {
				reject(new Error('call to CPMS returned no data'));
			}
			resolve(chargebackResponse.data);
		}).catch((error) => {
			logAxiosError('CpmsChargeback', 'CPMS', error);
			reject(error.response);
		});
	});
};

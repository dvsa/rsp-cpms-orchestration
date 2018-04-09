import axios from 'axios';

import Constants from '../utils/constants';

export default (reversalObj) => {
	return new Promise((resolve, reject) => {

		const reversalClient = axios.create({
			baseURL: Constants.cpmsBaseUrl,
			timeout: 6000,
			headers: {
				'Content-Type': 'application/vnd.dvsa-gov-uk.v2+json',
				Authorization: `Bearer ${reversalObj.auth.access_token}`,
			},
		});
		console.log('created reversal client');

		const reversalOptions = {
			customer_reference: reversalObj.customer_reference,
			scope: 'CHEQUE_RD',
			cost_centre: '',
		};
		console.log(reversalOptions);
		reversalClient.post(
			`payment/${reversalObj.receipt_reference}/reversal`,
			reversalOptions,
		).then((reversalResponse) => {
			console.log('reversal response');
			console.log(reversalResponse);
			if (typeof reversalResponse.data === 'undefined') {
				reject(new Error('Call to CPMS returned no data'));
			}
			resolve(reversalResponse.data);
		}).catch((error) => {
			console.log('reversal error');
			console.log(error.response);
			reject(error.response);
		});
	});
};

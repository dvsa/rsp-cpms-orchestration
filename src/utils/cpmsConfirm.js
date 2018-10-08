import axios from 'axios';

import Constants from '../utils/constants';

export default (receiptReference, auth) => {
	console.log(receiptReference);
	const confirmClient = axios.create({
		baseURL: Constants.cpmsBaseUrl(),
		headers: {
			'Content-Type': 'application/vnd.dvsa-gov-uk.v2+json',
			Authorization: `Bearer ${auth.access_token}`,
		},
	});
	console.log(confirmClient);
	console.log('created http client');

	return new Promise((resolve, reject) => {
		console.log('putting confirm request');

		confirmClient.put(`gateway/${receiptReference}/complete`)
			.then((response) => {
				console.log(response);
				if (typeof response.data === 'undefined') {
					reject(new Error('No confirmation data returned from CPMS'));
				}
				resolve(response.data);
			})
			.catch((error) => {
				console.log(error);
				reject(JSON.stringify(error));
			});
	});
};

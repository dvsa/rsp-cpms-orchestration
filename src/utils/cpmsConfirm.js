import axios from 'axios';

import Constants from '../utils/constants';
import { logAxiosError } from './logger';

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
	console.log('putting confirm request');

	return confirmClient.put(`gateway/${receiptReference}/complete`)
		.then((response) => {
			console.log(response);
			if (typeof response.data === 'undefined') {
				return Promise.reject(new Error('No confirmation data returned from CPMS'));
			}
			return Promise.resolve(response.data);
		}).catch((err) => {
			logAxiosError('CpmsConfirm', 'CPMS', err);
			throw err;
		});
};

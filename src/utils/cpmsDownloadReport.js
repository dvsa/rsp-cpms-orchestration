import axios from 'axios';

import Constants from '../utils/constants';
import { logAxiosError } from './logger';

export default async (reportObj) => {
	const reportStreamClient = axios.create({
		baseURL: Constants.cpmsBaseUrl(),
		headers: {
			'Content-Type': 'application/vnd.dvsa-gov-uk.v2+json',
			responseType: 'stream',
			Authorization: `Bearer ${reportObj.auth.access_token}`,
		},
	});
	console.log(reportStreamClient);
	console.log('created report client');

	return new Promise((resolve, reject) => {
		console.log('getting report stream');

		reportStreamClient.get(`payment/report/${reportObj.report_reference}/download`)
			.then((response) => {
				console.log(response.data);
				resolve(response.data);
			})
			.catch((error) => {
				logAxiosError('CpmsDownloadReport', 'CPMS', error);
				reject(JSON.stringify(error));
			});
	});
};

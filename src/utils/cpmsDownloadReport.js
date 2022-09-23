import axios from 'axios';

import Constants from './constants';
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

	return new Promise((resolve, reject) => {
		reportStreamClient.get(`payment/report/${reportObj.report_reference}/download`)
			.then((response) => {
				resolve(response.data);
			})
			.catch((error) => {
				logAxiosError('CPMSDownloadReport', 'CPMS', error, {
					reportReference: reportObj.report_reference,
				});
				reject(JSON.stringify(error));
			});
	});
};

import axios from 'axios';

import Constants from './constants';
import { logAxiosError, logError } from './logger';

export default (reportObj) => {
	return new Promise((resolve, reject) => {
		const reportClient = axios.create({
			baseURL: Constants.cpmsBaseUrl(),
			headers: {
				'Content-Type': 'application/vnd.dvsa-gov-uk.v2+json',
				'X-CPMS-Client': 'RSP',
				Authorization: `Bearer ${reportObj.authToken.access_token}`,
			},
		});

		const logData = {
			reportReference: reportObj.report_ref,
		};

		reportClient.get(`report/${reportObj.report_ref}/status`)
			.then((response) => {
				if (typeof response.data === 'undefined') {
					logError('CPMSCheckReportNoData', logData);
					reject(new Error('No report status returned from CPMS'));
				}
				resolve(response.data);
			})
			.catch((error) => {
				logAxiosError('CPMSCheckReport', 'CPMS', error, logData);
				reject(JSON.stringify(error));
			});
	});
};

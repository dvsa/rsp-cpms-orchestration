import axios from 'axios';

import Constants from '../utils/constants';
import { logAxiosError, logError } from './logger';

export default (generateObj) => {
	return new Promise((resolve, reject) => {
		const reportClient = axios.create({
			baseURL: Constants.cpmsBaseUrl(),
			headers: {
				'Content-Type': 'application/vnd.dvsa-gov-uk.v2+json',
				Authorization: `Bearer ${generateObj.authToken.access_token}`,
			},
		});

		const { generateReportOptions } = generateObj;

		reportClient.post('report', generateReportOptions)
			.then((response) => {
				if (typeof response.data === 'undefined') {
					logError('CPMSGenerateReportNoData', { generateReportOptions });
					reject(new Error('No generate report response returned from CPMS'));
				}
				resolve(response.data);
			})
			.catch((error) => {
				logAxiosError('CPMSGenerateReport', 'CPMS', error, { generateReportOptions });
				reject(JSON.stringify(error));
			});
	});
};

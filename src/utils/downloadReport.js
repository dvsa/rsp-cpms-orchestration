import axios from 'axios';

import Constants from '../utils/constants';
import { logAxiosError, logInfo } from './logger';

export default async (reportObj) => {
	const reportStreamClient = axios.create({
		baseURL: Constants.cpmsBaseUrl(),
		headers: {
			'Content-Type': 'application/vnd.dvsa-gov-uk.v2+json',
			responseType: 'stream',
			Authorization: `Bearer ${reportObj.authToken.access_token}`,
		},
	});

	return new Promise((resolve, reject) => {
		reportStreamClient.get(`/report/${reportObj.report_ref}/download`)
			.then((response) => {
				logInfo('CPMSReportDownloadSuccess', { reportObj });
				resolve(response.data);
			})
			.catch((error) => {
				logAxiosError('CpmsDownloadReport', 'CPMS', error, { reportObj });
				reject(JSON.stringify(error));
			});
	});
};

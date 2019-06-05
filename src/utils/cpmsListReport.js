import axios from 'axios';

import Constants from '../utils/constants';
import { logAxiosError, logError } from './logger';

const noDataMessage = 'No report data returned from CPMS';

export default (authToken) => {
	return new Promise((resolve, reject) => {
		const reportClient = axios.create({
			baseURL: Constants.cpmsBaseUrl(),
			headers: {
				'Content-Type': 'application/vnd.dvsa-gov-uk.v2+json',
				Authorization: `Bearer ${authToken.access_token}`,
			},
		});

		reportClient.get('report')
			.then((response) => {
				if (typeof response.data === 'undefined') {
					logError('CPMSListReportNoData', noDataMessage);
					reject(new Error(noDataMessage));
				}
				resolve(response.data);
			})
			.catch((error) => {
				logAxiosError('CpmsListReport', 'CPMS', error);
				reject(JSON.stringify(error));
			});
	});
};

import axios from 'axios';

import Constants from '../utils/constants';

export default (reportObj) => {
	return new Promise((resolve, reject) => {
		const reportClient = axios.create({
			baseURL: Constants.cpmsBaseUrl(),
			headers: {
				'Content-Type': 'application/vnd.dvsa-gov-uk.v2+json',
				Authorization: `Bearer ${reportObj.authToken.access_token}`,
			},
		});

		reportClient.get(`report/${reportObj.report_ref}/status`)
			.then((response) => {
				console.log(response);
				if (typeof response.data === 'undefined') {
					reject(new Error('No report status returned from CPMS'));
				}
				resolve(response.data);
			})
			.catch((error) => {
				console.log(error);
				reject(JSON.stringify(error));
			});
	});
};

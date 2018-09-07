import axios from 'axios';

import Constants from '../utils/constants';

export default (generateObj) => {
	return new Promise((resolve, reject) => {
		const reportClient = axios.create({
			baseURL: Constants.cpmsBaseUrl,
			headers: {
				'Content-Type': 'application/vnd.dvsa-gov-uk.v2+json',
				Authorization: `Bearer ${generateObj.authToken.access_token}`,
			},
		});

		reportClient.post('report', generateObj.generateReportOptions)
			.then((response) => {
				console.log(response);
				if (typeof response.data === 'undefined') {
					reject(new Error('No generate report response returned from CPMS'));
				}
				resolve(response.data);
			})
			.catch((error) => {
				console.log(error);
				reject(JSON.stringify(error));
			});
	});
};

import axios from 'axios';

import Constants from '../utils/constants';

export default async (reportObj) => {
	const reportStreamClient = axios.create({
		baseURL: Constants.cpmsBaseUrl(),
		headers: {
			'Content-Type': 'application/vnd.dvsa-gov-uk.v2+json',
			responseType: 'stream',
			Authorization: `Bearer ${reportObj.authToken.access_token}`,
		},
	});
	console.log(reportStreamClient);

	return new Promise((resolve, reject) => {
		console.log(reportObj);
		reportStreamClient.get(`/report/${reportObj.report_ref}/download`)
			.then((response) => {
				console.log(response.data);
				resolve(response.data);
			})
			.catch((error) => {
				console.log(error);
				reject(JSON.stringify(error));
			});
	});
};

import axios from 'axios';

import createResponse from '../utils/createResponse';
import Constants from '../utils/constants';

export default () => {

	const tokenClient = axios.create({
		baseURL: Constants.cpmsBaseUrl,
		timeout: 6000,
		headers: {
			Accept: 'application/json',
		},
	});
	console.log('created http client');
	const chequePaymentAuthBody = {
		client_id: Constants.fixedPenaltyClientId,
		client_secret: Constants.chequePaymentAuthBody.client_secret,
		scope: Constants.chequePaymentAuthBody.scope,
		grant_type: Constants.chequePaymentAuthBody.grant_type,
		user_id: Constants.chequePaymentAuthBody.user_id,
	};

	tokenClient.post('token', chequePaymentAuthBody)
		.then((response) => {
			console.log(response);
			createResponse({ body: response, statusCode: 200 });
		})
		.catch((error) => {
			console.log('caught an error');
			console.log(error);
			createResponse({ body: error, statusCode: 400 });
		});
};

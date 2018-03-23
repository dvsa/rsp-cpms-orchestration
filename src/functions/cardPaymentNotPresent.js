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
	const cardHolderNotPresentAuthBody = {
		client_id: Constants.fixedPenaltyClientId,
		client_secret: Constants.cardHolderNotPresentAuthBody.client_secret,
		scope: Constants.cardHolderNotPresentAuthBody.scope,
		grant_type: Constants.cardHolderNotPresentAuthBody.grant_type,
		user_id: Constants.cardHolderNotPresentAuthBody.user_id,
	};

	tokenClient.post('token', cardHolderNotPresentAuthBody)
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

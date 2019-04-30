import axios from 'axios';

import Constants from '../utils/constants';
import createResponse from './createResponse';

export default (penaltyType, authBody) => {
	console.log(Constants.cpmsBaseUrl());
	const tokenClient = axios.create({
		baseURL: Constants.cpmsBaseUrl(),
		headers: {
			Accept: 'application/json',
		},
	});
	console.log('created http client');
	console.log(penaltyType);
	let clientId = '';
	let clientSecret = '';
	if (penaltyType === 'FPN') {
		clientId = Constants.fixedPenaltyClientId();
		clientSecret = Constants.fixedPenaltySecret();
	} else if (penaltyType === 'IM') {
		clientId = Constants.immobilisationClientId();
		clientSecret = Constants.immobilisationSecret();
	} else if (penaltyType === 'CDN') {
		clientId = Constants.courtDepositClientId();
		clientSecret = Constants.courtDepositSecret();
	} else {
		return false;
	}

	const cardHolderPresentAuthBody = {
		client_id: clientId,
		client_secret: clientSecret,
		scope: authBody.scope,
		grant_type: authBody.grant_type,
		user_id: authBody.user_id,
	};

	return new Promise((resolve, reject) => {
		tokenClient.post('token', cardHolderPresentAuthBody)
			.then((response) => {
				if (typeof response.data === 'undefined' || response.data === false) {
					reject(new Error('No auth token returned from CPMS'));
				}
				resolve(response.data);
			})
			.catch((error) => {
				console.log(error);
				reject(createResponse({ body: 'Error authenticating', statusCode: 400 }));
			});
	});
};

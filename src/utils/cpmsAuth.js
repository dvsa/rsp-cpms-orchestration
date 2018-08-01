import axios from 'axios';

import Constants from '../utils/constants';

export default (penaltyType, authBody) => {
	console.log(Constants.cpmsBaseUrl);
	const tokenClient = axios.create({
		baseURL: Constants.cpmsBaseUrl,
		timeout: 15000,
		headers: {
			Accept: 'application/json',
		},
	});
	console.log('created http client');
	console.log(penaltyType);
	let clientId = '';
	if (penaltyType === 'FPN') {
		clientId = Constants.fixedPenaltyClientId;
	} else if (penaltyType === 'IM') {
		clientId = Constants.immobilisationClientId;
	} else if (penaltyType === 'CDN') {
		clientId = Constants.courtDepositClientId;
	} else {
		return false;
	}

	const cardHolderPresentAuthBody = {
		client_id: clientId,
		client_secret: authBody.client_secret,
		scope: authBody.scope,
		grant_type: authBody.grant_type,
		user_id: authBody.user_id,
	};

	return new Promise((resolve, reject) => {
		console.log('posting auth body');

		console.log(cardHolderPresentAuthBody);
		tokenClient.post('token', cardHolderPresentAuthBody)
			.then((response) => {
				console.log(response);
				if (typeof response.data === 'undefined') {
					reject(new Error('No auth token returned from CPMS'));
				}
				resolve(response.data);
			})
			.catch((error) => {
				console.log(error);
				reject(JSON.stringify(error));
			});
	});
};

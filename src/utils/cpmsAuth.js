import axios from 'axios';

import Constants from './constants';
import createResponse from './createResponse';
import { logAxiosError, logError } from './logger';

export default (penaltyType, authBody) => {
	const tokenClient = axios.create({
		baseURL: Constants.cpmsBaseUrl(),
		headers: {
			Accept: 'application/json',
		},
	});
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
		logError('CPMSAuthInvalidPenaltyType', { penaltyType });
		return false;
	}

	const cardHolderPresentAuthBody = {
		client_id: clientId,
		client_secret: clientSecret,
		scope: authBody.scope,
		grant_type: authBody.grant_type,
		user_id: authBody.user_id,
	};

	const logData = { ...cardHolderPresentAuthBody };
	delete logData.client_secret;

	return new Promise((resolve, reject) => {
		tokenClient.post('token', cardHolderPresentAuthBody)
			.then((response) => {
				if (typeof response.data === 'undefined' || response.data === false) {
					logError('CPMSAuthNoToken', logData);
					reject(new Error('No auth token returned from CPMS'));
				}
				resolve(response.data);
			})
			.catch((error) => {
				logAxiosError('CpmsAuth', 'CPMS', error, logData);
				reject(createResponse({ body: 'Error authenticating', statusCode: 400 }));
			});
	});
};

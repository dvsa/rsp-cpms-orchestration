import createResponse from '../utils/createResponse';

import cpmsAuth from '../utils/cpmsAuth';
import cpmsGroupPayment from '../utils/cpmsGroupPayment';
import Constants from '../utils/constants';

const paymentTypeIntegrationMap = {
	CARD: { authBody: Constants.cardHolderPresentAuthBody, endpoint: '/payment/card' },
	CNP: { authBody: Constants.cardHolderNotPresentAuthBody, endpoint: '/payment/cardholder-not-present' },
};

const groupCardPayment = async (paymentObject, callback) => {
	try {
		const paymentMethod = paymentObject.PaymentMethod || 'CARD';
		const paymentTypeIntegrationConfig = paymentTypeIntegrationMap[paymentMethod];
		if (paymentTypeIntegrationConfig === undefined) {
			return callback(null, createResponse({ body: `Bad PaymentMethod ${paymentMethod}`, statusCode: 400 }));
		}

		const authToken = await cpmsAuth(
			paymentObject.PenaltyType,
			paymentTypeIntegrationConfig.authBody,
		);
		if (authToken === false) {
			console.log('Error authenticating with cpms');
			callback(createResponse({ body: 'Error authenticating', statusCode: 400 }));
		}
		console.log(authToken);

		const transactionData = await cpmsGroupPayment({
			endpoint: paymentTypeIntegrationConfig.endpoint,
			redirectUrl: paymentObject.RedirectUrl,
			paymentObject,
			auth: authToken,
		});
		console.log('outside of async');
		callback(null, createResponse({ body: transactionData, statusCode: 200 }));
	} catch (err) {
		callback(err, createResponse({ body: err, statusCode: 400 }));
	}
};

export default ({
	groupCardPayment,
});

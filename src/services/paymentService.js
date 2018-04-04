import createResponse from '../utils/createResponse';

import cpmsAuth from '../utils/cpmsAuth';
import cpmsPayment from '../utils/cpmsPayment';
import cpmsConfirm from '../utils/cpmsConfirm';
import Constants from '../utils/constants';

const cardPayment = async (paymentObject, callback) => {
	try {
		const authToken = await cpmsAuth(
			paymentObject.penalty_type,
			Constants.cardHolderPresentAuthBody,
		);
		if (authToken === false) {
			console.log('Error authenticating with cpms');
			callback(createResponse({ body: 'Error authenticating', statusCode: 400 }));
		}
		console.log(authToken);

		const transactionData = await cpmsPayment({
			endpoint: '/payment/card',
			redirectUrl: paymentObject.redirect_url,
			paymentObject,
			auth: authToken,
		});
		console.log('outside of async');
		callback(null, createResponse({ body: transactionData, statusCode: 200 }));
	} catch (err) {
		console.log(err);
		callback(err, createResponse({ body: err, statusCode: 400 }));
	}
};

const cardNotPresentPayment = async (paymentObject, callback) => {
	try {
		const authToken = await cpmsAuth(
			paymentObject.penalty_type,
			Constants.cardHolderNotPresentAuthBody,
		);
		if (authToken === false) {
			console.log('Error authenticating with cpms');
			callback(createResponse({ body: 'Error authenticating', statusCode: 400 }));
		}
		console.log(authToken);

		const transactionData = await cpmsPayment({
			endpoint: 'payment/cardholder-not-present',
			redirectUrl: paymentObject.redirect_url,
			paymentObject,
			auth: authToken,
		});
		console.log('outside of async');
		callback(null, createResponse({ body: transactionData, statusCode: 200 }));
	} catch (err) {
		console.log(err);
		callback(err, createResponse({ body: err, statusCode: 400 }));
	}
};

const cashPayment = async (paymentObject, callback) => {
	try {
		const authToken = await cpmsAuth(paymentObject.penalty_type, Constants.cashPaymentAuthBody);
		if (authToken === false) {
			console.log('Error authenticating with cpms');
			callback(createResponse({ body: 'Error authenticating', statusCode: 400 }));
		}
		console.log(authToken);

		const transactionData = await cpmsPayment({
			endpoint: 'payment/cash',
			redirectUrl: paymentObject.redirect_url,
			paymentObject,
			auth: authToken,
		});
		console.log('outside of async');
		callback(null, createResponse({ body: transactionData, statusCode: 200 }));
	} catch (err) {
		callback(createResponse({ body: err, statusCode: 400 }));
	}
};

const chequePayment = async (paymentObject, callback) => {
	try {
		const authToken = await cpmsAuth(paymentObject.penalty_type, Constants.chequePaymentAuthBody);
		if (authToken === false) {
			console.log('Error authenticating with cpms');
			callback(createResponse({ body: 'Error authenticating', statusCode: 400 }));
		}
		console.log(authToken);

		const transactionData = await cpmsPayment({
			endpoint: 'payment/cheque',
			redirectUrl: paymentObject.redirect_url,
			paymentObject,
			auth: authToken,
		});
		console.log('outside of async');
		callback(null, createResponse({ body: transactionData, statusCode: 200 }));
	} catch (err) {
		callback(createResponse({ body: err, statusCode: 400 }));
	}
};

const postalOrderPayment = async (paymentObject, callback) => {
	try {
		const authToken = await cpmsAuth(paymentObject.penalty_type, Constants.postalOrderAuthBody);
		if (authToken === false) {
			console.log('Error authenticating with cpms');
			callback(createResponse({ body: 'Error authenticating', statusCode: 400 }));
		}
		console.log(authToken);

		const transactionData = await cpmsPayment({
			endpoint: 'payment/postal-order',
			redirectUrl: paymentObject.redirect_url,
			paymentObject,
			auth: authToken,
		});
		console.log('outside of async');
		callback(null, createResponse({ body: transactionData, statusCode: 200 }));
	} catch (err) {
		callback(createResponse({ body: err, statusCode: 400 }));
	}
};

const confirmPayment = async (confirmObject, callback) => {
	try {
		const authToken = await cpmsAuth(
			confirmObject.penalty_type,
			Constants.cardHolderPresentAuthBody,
		);
		if (authToken === false) {
			console.log('Error authenticating with cpms');
			callback(new Error('Error authenticating with CPMS'), createResponse({ body: 'Error authenticating', statusCode: 400 }));
		}
		console.log(authToken);

		const confirmResponse = await cpmsConfirm(confirmObject.receipt_reference, authToken);
		console.log(confirmResponse);

		callback(null, createResponse({ body: confirmResponse, statusCode: 200 }));
	} catch (err) {
		callback(createResponse(err, { body: err, statusCode: 400 }));
	}
};

export default ({
	cardPayment,
	cardNotPresentPayment,
	cashPayment,
	chequePayment,
	postalOrderPayment,
	confirmPayment,
});

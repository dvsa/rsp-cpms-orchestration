import { SQS, config } from 'aws-sdk';

import createResponse from '../utils/createResponse';

import cpmsAuth from '../utils/cpmsAuth';
import cpmsPayment from '../utils/cpmsPayment';
import cpmsConfirm from '../utils/cpmsConfirm';
import cpmsChargeback from '../utils/cpmsChargeback';
import cpmsReversal from '../utils/cpmsReversal';
import Constants from '../utils/constants';
import QueueService from './queueService';

config.update({ region: 'eu-west-1' });
const sqs = new SQS({ apiVersion: '2012-11-05' });

const queueService = new QueueService(sqs);

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

		const receiptReference = transactionData.receipt_reference;
		const penaltyReference = paymentObject.penalty_reference;
		const vehicleReg = paymentObject.vehicle_reg;
		// Send a message to the CPMS checking queue
		queueService.sendMessage(receiptReference, penaltyReference, vehicleReg);

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

const reverseCard = async (reverseCardObject, callback) => {
	try {
		const authToken = await cpmsAuth(
			reverseCardObject.penalty_type,
			Constants.chargebackAuthBody,
		);
		if (authToken === false) {
			console.log('Error authenticating with cpms');
			callback(new Error('Error authenticating with CPMS'), createResponse({ body: 'Error authenticating', statusCode: 400 }));
		}
		console.log(authToken);

		const chargebackResponse = await cpmsChargeback({
			receipt_reference: reverseCardObject.receipt_ref,
			customer_reference: reverseCardObject.payment_ref,
			auth: authToken,
		});
		console.log(chargebackResponse);

		callback(null, createResponse({ body: chargebackResponse, statusCode: 200 }));
	} catch (err) {
		console.log(err);
		callback(createResponse(err, { body: err, statusCode: 400 }));
	}
};

const reverseCheque = async (reverseChequeObject, callback) => {
	try {
		const authToken = await cpmsAuth(
			reverseChequeObject.penalty_type,
			Constants.reversalAuthBody,
		);
		if (authToken === false) {
			console.log('Error authenticating with cpms');
			callback(new Error('Error authenticating with CPMS'), createResponse({ body: 'Error authenticating', statusCode: 400 }));
		}
		console.log(authToken);

		const reversalResponse = await cpmsReversal({
			receipt_reference: reverseChequeObject.receipt_ref,
			customer_reference: reverseChequeObject.payment_ref,
			auth: authToken,
		});
		console.log(reversalResponse);

		callback(null, createResponse({ body: reversalResponse, statusCode: 200 }));
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
	reverseCard,
	reverseCheque,
});

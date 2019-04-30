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

let queueService;
const cardPayment = async (paymentObject) => {
	const authToken = await cpmsAuth(
		paymentObject.penalty_type,
		Constants.cardHolderPresentAuthBody(),
	);

	try {
		const transactionData = await cpmsPayment({
			endpoint: '/payment/card',
			redirectUrl: paymentObject.redirect_url,
			paymentObject,
			auth: authToken,
		});
		console.log('outside of async');

		const ReceiptReference = transactionData.receipt_reference;
		const VehicleRegistration = paymentObject.vehicle_reg;
		const PenaltyType = paymentObject.penalty_type;
		const PenaltyId = paymentObject.penalty_id;
		// Send a message to the CPMS checking queue
		if (!queueService) {
			queueService = new QueueService(sqs, Constants.sqsUrl());
		}
		const messageData = await queueService.sendMessage({
			ReceiptReference,
			PenaltyId: `${PenaltyId}_${PenaltyType}`,
			VehicleRegistration,
			PenaltyType,
			IsGroupPayment: false,
		});
		console.log('send message to queue success', messageData);

		return createResponse({ body: transactionData, statusCode: 200 });
	} catch (err) {
		console.log(err);
		return createResponse({ body: err, statusCode: 400 });
	}
};

const cardNotPresentPayment = async (paymentObject) => {
	const authToken = await cpmsAuth(
		paymentObject.penalty_type,
		Constants.cardHolderNotPresentAuthBody(),
	);

	try {
		const transactionData = await cpmsPayment({
			endpoint: 'payment/cardholder-not-present',
			redirectUrl: paymentObject.redirect_url,
			paymentObject,
			auth: authToken,
		});
		console.log('outside of async');
		return createResponse({ body: transactionData, statusCode: 200 });
	} catch (err) {
		console.log(err);
		return createResponse({ body: err, statusCode: 400 });
	}
};

const cashPayment = async (paymentObject) => {
	const authToken = await cpmsAuth(paymentObject.penalty_type, Constants.cashPaymentAuthBody());

	try {
		const transactionData = await cpmsPayment({
			endpoint: 'payment/cash',
			redirectUrl: paymentObject.redirect_url,
			paymentObject,
			auth: authToken,
		});
		console.log('outside of async');
		return createResponse({ body: transactionData, statusCode: 200 });
	} catch (err) {
		return createResponse({ body: err, statusCode: 400 });
	}
};

const chequePayment = async (paymentObject) => {
	const authToken = await cpmsAuth(paymentObject.penalty_type, Constants.chequePaymentAuthBody());

	try {
		const transactionData = await cpmsPayment({
			endpoint: 'payment/cheque',
			redirectUrl: paymentObject.redirect_url,
			paymentObject,
			auth: authToken,
		});
		console.log('outside of async');
		return createResponse({ body: transactionData, statusCode: 200 });
	} catch (err) {
		return createResponse({ body: err, statusCode: 400 });
	}
};

const postalOrderPayment = async (paymentObject) => {
	const authToken = await cpmsAuth(paymentObject.penalty_type, Constants.postalOrderAuthBody());

	try {
		const transactionData = await cpmsPayment({
			endpoint: 'payment/postal-order',
			redirectUrl: paymentObject.redirect_url,
			paymentObject,
			auth: authToken,
		});
		console.log('outside of async');
		return createResponse({ body: transactionData, statusCode: 200 });
	} catch (err) {
		return createResponse({ body: err, statusCode: 400 });
	}
};

const confirmPayment = async (confirmObject) => {
	const authToken = await cpmsAuth(
		confirmObject.penalty_type,
		Constants.cardHolderPresentAuthBody(),
	);

	try {
		const confirmResponse = await cpmsConfirm(confirmObject.receipt_reference, authToken);
		console.log(confirmResponse);

		return createResponse({ body: confirmResponse, statusCode: 200 });
	} catch (err) {
		console.error(err);
		const body = {
			data: err.response.data,
			status: err.response.status,
		};
		return createResponse({ body, statusCode: 400 });
	}
};

const reverseCard = async (reverseCardObject) => {
	const authToken = await cpmsAuth(
		reverseCardObject.penalty_type,
		Constants.chargebackAuthBody(),
	);

	try {
		const chargebackResponse = await cpmsChargeback({
			receipt_reference: reverseCardObject.receipt_ref,
			customer_reference: reverseCardObject.payment_ref,
			auth: authToken,
		});
		console.log(chargebackResponse);

		return createResponse({ body: chargebackResponse, statusCode: 200 });
	} catch (err) {
		return createResponse({ body: err, statusCode: 400 });
	}
};

const reverseCheque = async (reverseChequeObject) => {
	const authToken = await cpmsAuth(
		reverseChequeObject.penalty_type,
		Constants.reversalAuthBody(),
	);

	try {
		const reversalResponse = await cpmsReversal({
			receipt_reference: reverseChequeObject.receipt_ref,
			customer_reference: reverseChequeObject.payment_ref,
			auth: authToken,
		});
		console.log(reversalResponse);

		return createResponse({ body: reversalResponse, statusCode: 200 });
	} catch (err) {
		return createResponse({ body: err, statusCode: 400 });
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

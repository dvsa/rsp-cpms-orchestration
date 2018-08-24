import { SQS, config } from 'aws-sdk';

import createResponse from '../utils/createResponse';

import cpmsAuth from '../utils/cpmsAuth';
import cpmsGroupPayment from '../utils/cpmsGroupPayment';
import Constants from '../utils/constants';
import QueueService from './queueService';

config.update({ region: 'eu-west-1' });
const sqs = new SQS({ apiVersion: '2012-11-05' });

const queueService = new QueueService(sqs, process.env.SQS_URL);

const paymentTypeIntegrationMap = {
	CARD: { authBody: Constants.cardHolderPresentAuthBody, endpoint: '/payment/card' },
	CNP: { authBody: Constants.cardHolderNotPresentAuthBody, endpoint: '/payment/cardholder-not-present' },
	CASH: { authBody: Constants.cashPaymentAuthBody, endpoint: '/payment/cash' },
	CHEQUE: { authBody: Constants.chequePaymentAuthBody, endpoint: '/payment/cheque' },
	POSTAL_ORDER: { authBody: Constants.postalOrderAuthBody, endpoint: '/payment/postal-order' },
};

const groupPayment = async (paymentObject, callback) => {
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
			return callback(createResponse({ body: 'Error authenticating', statusCode: 400 }));
		}
		console.log(authToken);

		const transactionData = await cpmsGroupPayment({
			endpoint: paymentTypeIntegrationConfig.endpoint,
			redirectUrl: paymentObject.RedirectUrl,
			paymentObject,
			auth: authToken,
		});
		console.log('outside of async');

		const ReceiptReference = transactionData.receipt_reference;
		const { PenaltyGroupId, VehicleRegistration, PenaltyType } = paymentObject;
		const PenaltyId = PenaltyGroupId;
		// Send a message to the CPMS checking queue
		const messageData = await queueService.sendMessage({
			ReceiptReference,
			PenaltyId,
			VehicleRegistration,
			PenaltyType,
			IsGroupPayment: true,
		});
		console.log('send message to queue success', messageData);

		return callback(null, createResponse({ body: transactionData, statusCode: 200 }));
	} catch (err) {
		return callback(err, createResponse({ body: err, statusCode: 400 }));
	}
};

export default ({
	groupPayment,
});

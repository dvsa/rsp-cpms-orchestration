import { SQS, config } from 'aws-sdk';

import createResponse from '../utils/createResponse';

import cpmsAuth from '../utils/cpmsAuth';
import cpmsGroupPayment from '../utils/cpmsGroupPayment';
import Constants from '../utils/constants';
import QueueService from './queueService';
import { logError } from '../utils/logger';

config.update({ region: 'eu-west-1' });
const sqs = new SQS({ apiVersion: '2012-11-05' });

const paymentTypeIntegrationMap = {
	CARD: { authBodyFn: Constants.cardHolderPresentAuthBody, endpoint: '/payment/card' },
	CNP: { authBodyFn: Constants.cardHolderNotPresentAuthBody, endpoint: '/payment/cardholder-not-present' },
	CASH: { authBodyFn: Constants.cashPaymentAuthBody, endpoint: '/payment/cash' },
	CHEQUE: { authBodyFn: Constants.chequePaymentAuthBody, endpoint: '/payment/cheque' },
	POSTAL_ORDER: { authBodyFn: Constants.postalOrderAuthBody, endpoint: '/payment/postal-order' },
};

let queueService;
const groupPayment = async (paymentObject) => {
	try {
		const paymentMethod = paymentObject.PaymentMethod || 'CARD';
		const paymentTypeIntegrationConfig = paymentTypeIntegrationMap[paymentMethod];
		if (paymentTypeIntegrationConfig === undefined) {
			return createResponse({ body: `Bad PaymentMethod ${paymentMethod}`, statusCode: 400 });
		}

		const authToken = await cpmsAuth(
			paymentObject.PenaltyType,
			paymentTypeIntegrationConfig.authBodyFn(),
		);
		if (authToken === false) {
			return createResponse({ body: 'Error authenticating', statusCode: 400 });
		}

		const transactionData = await cpmsGroupPayment({
			endpoint: paymentTypeIntegrationConfig.endpoint,
			redirectUrl: paymentObject.RedirectUrl,
			paymentObject,
			auth: authToken,
		});

		const ReceiptReference = transactionData.receipt_reference;
		const { PenaltyGroupId, VehicleRegistration, PenaltyType } = paymentObject;
		const PenaltyId = PenaltyGroupId;
		// Send a message to the CPMS checking queue
		if (!queueService) {
			queueService = new QueueService(sqs, Constants.sqsUrl());
		}
		const message = {
			ReceiptReference,
			PenaltyId,
			VehicleRegistration,
			PenaltyType,
			IsGroupPayment: true,
		};

		await queueService.sendMessage(message);

		return createResponse({ body: transactionData, statusCode: 200 });
	} catch (err) {
		logError('GroupPaymentError', err.message);
		return createResponse({ body: err.message, statusCode: 400 });
	}
};

export default ({
	groupPayment,
});

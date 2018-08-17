import { SQS, config } from 'aws-sdk';

import createResponse from '../utils/createResponse';

import cpmsAuth from '../utils/cpmsAuth';
import cpmsGroupPayment from '../utils/cpmsGroupPayment';
import Constants from '../utils/constants';
import QueueService from './queueService';

config.update({ region: 'eu-west-1' });
const sqs = new SQS({ apiVersion: '2012-11-05' });

const queueService = new QueueService(sqs, process.env.SQS_URL);

const groupCardPayment = async (paymentObject, callback) => {
	try {
		const authToken = await cpmsAuth(
			paymentObject.PenaltyType,
			Constants.cardHolderPresentAuthBody,
		);
		if (authToken === false) {
			console.log('Error authenticating with cpms');
			callback(createResponse({ body: 'Error authenticating', statusCode: 400 }));
		}
		console.log(authToken);

		const transactionData = await cpmsGroupPayment({
			endpoint: '/payment/card',
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

		callback(null, createResponse({ body: transactionData, statusCode: 200 }));
	} catch (err) {
		console.log(err);
		callback(err, createResponse({ body: err, statusCode: 400 }));
	}
};

export default ({
	groupCardPayment,
});

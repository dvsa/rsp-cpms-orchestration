import createResponse from '../utils/createResponse';

import cpmsAuth from '../utils/cpmsAuth';
import cpmsGroupPayment from '../utils/cpmsGroupPayment';
import Constants from '../utils/constants';
import startCpmsCheckingExecution from '../utils/startCpmsChecking';

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

		const receiptReference = transactionData.receipt_reference;
		const { PenaltyGroupId, VehicleRegistration, PenaltyType } = paymentObject;
		// Start execution of CPMS checking step function
		await startCpmsCheckingExecution({
			ReceiptReference: receiptReference,
			PenaltyId: PenaltyGroupId,
			VehicleRegistration,
			PenaltyType,
			IsGroupPayment: true,
		});

		callback(null, createResponse({ body: transactionData, statusCode: 200 }));
	} catch (err) {
		console.log(err);
		callback(err, createResponse({ body: err, statusCode: 400 }));
	}
};

export default ({
	groupCardPayment,
});

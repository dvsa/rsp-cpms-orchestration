import PaymentService from '../services/paymentService';

export const handler = async (event) => {
	let confirmationObject = event.body;
	if (typeof confirmationObject.receipt_reference === 'undefined') {
		confirmationObject = JSON.parse(event.body);
	}

	// extract needed info from penalty doc
	return PaymentService.confirmPayment(confirmationObject);
};

export default handler;

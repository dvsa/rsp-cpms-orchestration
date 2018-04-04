import PaymentService from '../services/paymentService';

export default (event, context, callback) => {
	console.log(JSON.stringify(event, null, 2));
	let confirmationObject = event.body;
	if (typeof confirmationObject.receipt_reference === 'undefined') {
		confirmationObject = JSON.parse(event.body);
	}

	console.log(confirmationObject);

	// extract needed info from penalty doc
	PaymentService.confirmPayment(confirmationObject, callback);
};

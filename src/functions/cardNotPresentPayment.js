import PaymentService from '../services/paymentService';

export default (event, context, callback) => {
	console.log(JSON.stringify(event, null, 2));
	let paymentObject = event.body;
	if (typeof paymentObject.payment_type === 'undefined') {
		paymentObject = JSON.parse(event.body);
	}

	PaymentService.cardNotPresentPayment(paymentObject, callback);
};

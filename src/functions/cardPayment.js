import PaymentService from '../services/paymentService';

export const handler = (event) => {
	let paymentObject = event.body;
	if (typeof paymentObject.penalty_type === 'undefined') {
		paymentObject = JSON.parse(event.body);
	}

	// extract needed info from penalty doc
	return PaymentService.cardPayment(paymentObject);
};

export default handler;

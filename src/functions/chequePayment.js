import PaymentService from '../services/paymentService';

export const handler = (event) => {
	let paymentObject = event.body;
	if (typeof paymentObject.payment_type === 'undefined') {
		paymentObject = JSON.parse(event.body);
	}

	return PaymentService.chequePayment(paymentObject);
};

export default handler;

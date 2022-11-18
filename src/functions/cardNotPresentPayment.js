import PaymentService from '../services/paymentService';

export const cardNotPresentPayment = (event) => {
	let paymentObject = event.body;
	if (typeof paymentObject.payment_type === 'undefined') {
		paymentObject = JSON.parse(event.body);
	}

	return PaymentService.cardNotPresentPayment(paymentObject);
};

export default cardNotPresentPayment;

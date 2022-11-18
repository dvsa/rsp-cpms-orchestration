import PaymentService from '../services/paymentService';

export const cashPayment = (event) => {
	let paymentObject = event.body;
	if (typeof paymentObject.payment_type === 'undefined') {
		paymentObject = JSON.parse(event.body);
	}

	return PaymentService.cashPayment(paymentObject);
};

export default cashPayment;

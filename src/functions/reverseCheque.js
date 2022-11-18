import PaymentService from '../services/paymentService';

export const reverseCheque = (event) => {
	let paymentObject = event.body;
	if (typeof paymentObject.penalty_type === 'undefined') {
		paymentObject = JSON.parse(event.body);
	}

	return PaymentService.reverseCheque(paymentObject);
};

export default reverseCheque;

import PaymentService from '../services/paymentService';

export default (event) => {
	let paymentObject = event.body;
	if (typeof paymentObject.penalty_type === 'undefined') {
		paymentObject = JSON.parse(event.body);
	}

	return PaymentService.reverseCard(paymentObject);
};

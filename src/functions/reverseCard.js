import PaymentService from '../services/paymentService';

export const handler = (event) => {
	let paymentObject = event.body;
	if (typeof paymentObject.penalty_type === 'undefined') {
		paymentObject = JSON.parse(event.body);
	}

	return PaymentService.reverseCard(paymentObject);
};

export default handler;

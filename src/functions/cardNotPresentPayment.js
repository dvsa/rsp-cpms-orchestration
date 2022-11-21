import PaymentService from '../services/paymentService';
import Constants from '../utils/constants';

export const cardNotPresentPayment = async (event) => {
	await Constants.bootstrap();
	let paymentObject = event.body;
	if (typeof paymentObject.payment_type === 'undefined') {
		paymentObject = JSON.parse(event.body);
	}

	return PaymentService.cardNotPresentPayment(paymentObject);
};

export default cardNotPresentPayment;

import PaymentService from '../services/paymentService';
import Constants from '../utils/constants';

export const chequePayment = async (event) => {
	await Constants.bootstrap();
	let paymentObject = event.body;
	if (typeof paymentObject.payment_type === 'undefined') {
		paymentObject = JSON.parse(event.body);
	}

	return PaymentService.chequePayment(paymentObject);
};

export default chequePayment;

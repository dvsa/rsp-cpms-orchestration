import PaymentService from '../services/paymentService';
import Constants from '../utils/constants';

export const cashPayment = async (event) => {
	await Constants.bootstrap();
	let paymentObject = event.body;
	if (typeof paymentObject.payment_type === 'undefined') {
		paymentObject = JSON.parse(event.body);
	}

	return PaymentService.cashPayment(paymentObject);
};

export default cashPayment;

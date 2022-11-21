import PaymentService from '../services/paymentService';
import Constants from '../utils/constants';

export const cardPayment = async (event) => {
	await Constants.bootstrap();
	let paymentObject = event.body;
	if (typeof paymentObject.penalty_type === 'undefined') {
		paymentObject = JSON.parse(event.body);
	}

	// extract needed info from penalty doc
	return PaymentService.cardPayment(paymentObject);
};

export default cardPayment;

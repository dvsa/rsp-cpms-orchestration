import PaymentService from '../services/paymentService';
import Constants from '../utils/constants';

export const reverseCard = async (event) => {
	await Constants.bootstrap();
	let paymentObject = event.body;
	if (typeof paymentObject.penalty_type === 'undefined') {
		paymentObject = JSON.parse(event.body);
	}

	return PaymentService.reverseCard(paymentObject);
};

export default reverseCard;

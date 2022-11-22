import PaymentService from '../services/paymentService';
import Constants from '../utils/constants';

export const confirm = async (event) => {
	await Constants.bootstrap();
	let confirmationObject = event.body;
	if (typeof confirmationObject.receipt_reference === 'undefined') {
		confirmationObject = JSON.parse(event.body);
	}

	// extract needed info from penalty doc
	return PaymentService.confirmPayment(confirmationObject);
};

export default confirm;

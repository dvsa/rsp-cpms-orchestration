import auth from './functions/auth';
import cardPayment from './functions/cardPayment';
import cardPaymentNotPresent from './functions/cardPaymentNotPresent';
import cashPayment from './functions/cashPayment';
import chequePayment from './functions/chequePayment';

require('dotenv').config();

const handler = {
	auth,
	cardPayment,
	cardPaymentNotPresent,
	cashPayment,
	chequePayment,
};

export default handler;

import auth from './functions/auth';

import cardPayment from './functions/cardPayment';
import cardNotPresentPayment from './functions/cardNotPresentPayment';
import cashPayment from './functions/cashPayment';
import chequePayment from './functions/chequePayment';
import postalOrderPayment from './functions/postalOrderPayment';
import confirmPayment from './functions/confirm';

require('dotenv').config();

const handler = {
	auth,
	cardPayment,
	cardNotPresentPayment,
	cashPayment,
	chequePayment,
	postalOrderPayment,
	confirmPayment,
};

export default handler;

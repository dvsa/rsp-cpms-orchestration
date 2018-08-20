import cardPayment from './functions/cardPayment';
import cardNotPresentPayment from './functions/cardNotPresentPayment';
import cashPayment from './functions/cashPayment';
import chequePayment from './functions/chequePayment';
import postalOrderPayment from './functions/postalOrderPayment';
import confirmPayment from './functions/confirm';
import listReports from './functions/listReports';
import generateReport from './functions/generateReport';
import checkReportStatus from './functions/checkReportStatus';
import reverseCard from './functions/reverseCard';
import reverseCheque from './functions/reverseCheque';
import groupPayment from './functions/groupPayment';

require('dotenv').config();

const handler = {
	cardPayment,
	cardNotPresentPayment,
	cashPayment,
	chequePayment,
	postalOrderPayment,
	confirmPayment,
	listReports,
	generateReport,
	checkReportStatus,
	reverseCard,
	reverseCheque,
	groupPayment,
};

export default handler;

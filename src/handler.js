import '@babel/polyfill';
import Constants from './utils/constants';
import cardPayment from './functions/cardPayment';
import cardNotPresentPayment from './functions/cardNotPresentPayment';
import cashPayment from './functions/cashPayment';
import chequePayment from './functions/chequePayment';
import postalOrderPayment from './functions/postalOrderPayment';
import confirm from './functions/confirm';
import listReports from './functions/listReports';
import generateReport from './functions/generateReport';
import checkReportStatus from './functions/checkReportStatus';
import reverseCard from './functions/reverseCard';
import reverseCheque from './functions/reverseCheque';
import downloadReport from './functions/downloadReport';
import groupPayment from './functions/groupPayment';

require('dotenv').config();

let configured = false;
const configure = (lambdaFn) => {
	return async (event, context, callback) => {
		if (!configured) {
			await Constants.bootstrap();
			configured = true;
		}
		lambdaFn(event, context, callback);
	};
};

const handler = {
	cardPayment: configure(cardPayment),
	cardNotPresentPayment: configure(cardNotPresentPayment),
	cashPayment: configure(cashPayment),
	chequePayment: configure(chequePayment),
	postalOrderPayment: configure(postalOrderPayment),
	confirm: configure(confirm),
	listReports: configure(listReports),
	generateReport: configure(generateReport),
	checkReportStatus: configure(checkReportStatus),
	reverseCard: configure(reverseCard),
	reverseCheque: configure(reverseCheque),
	downloadReport: configure(downloadReport),
	groupPayment: configure(groupPayment),
};

export default handler;

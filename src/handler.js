/* eslint-disable import/no-named-as-default */
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

let configured = false;
const configure = (lambdaFn) => {
	return async (event, context) => {
		if (!configured) {
			await Constants.bootstrap();
			configured = true;
		}
		return lambdaFn(event, context);
	};
};

const configuredCardPayment = configure(cardPayment);
const configuredCardNotPresentPayment = configure(cardNotPresentPayment);
const configuredCashPayment = configure(cashPayment);
const configuredChequePayment = configure(chequePayment);
const configuredPostalOrderPayment = configure(postalOrderPayment);
const configuredConfirm = configure(confirm);
const configuredListReports = configure(listReports);
const configuredGenerateReport = configure(generateReport);
const configuredCheckReportStatus = configure(checkReportStatus);
const configuredReverseCard = configure(reverseCard);
const configuredReverseCheque = configure(reverseCheque);
const configuredDownloadReport = configure(downloadReport);
const configuredGroupPayment = configure(groupPayment);

export {
	configuredCardPayment as cardPayment,
	configuredCardNotPresentPayment as cardNotPresentPayment,
	configuredCashPayment as cashPayment,
	configuredChequePayment as chequePayment,
	configuredPostalOrderPayment as postalOrderPayment,
	configuredConfirm as confirm,
	configuredListReports as listReports,
	configuredGenerateReport as generateReport,
	configuredCheckReportStatus as checkReportStatus,
	configuredReverseCard as reverseCard,
	configuredReverseCheque as reverseCheque,
	configuredDownloadReport as downloadReport,
	configuredGroupPayment as groupPayment,
};

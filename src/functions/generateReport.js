import ReportService from '../services/reportService';
import Constants from '../utils/constants';

export const generateReport = async (event) => {
	await Constants.bootstrap();
	let reportObject = event.body;
	if (typeof reportObject.penalty_type === 'undefined') {
		reportObject = JSON.parse(event.body);
	}

	// extract needed info from penalty doc
	return ReportService.generateReport(reportObject);
};

export default generateReport;

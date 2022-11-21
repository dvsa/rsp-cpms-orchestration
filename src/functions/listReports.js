import ReportService from '../services/reportService';
import Constants from '../utils/constants';

export const listReports = async (event) => {
	await Constants.bootstrap();
	let reportObject = event.body;
	if (typeof reportObject.penalty_type === 'undefined') {
		reportObject = JSON.parse(event.body);
	}

	return ReportService.listReports(reportObject);
};

export default listReports;

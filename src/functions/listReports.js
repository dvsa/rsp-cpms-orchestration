import ReportService from '../services/reportService';

export const listReports = (event) => {
	let reportObject = event.body;
	if (typeof reportObject.penalty_type === 'undefined') {
		reportObject = JSON.parse(event.body);
	}

	return ReportService.listReports(reportObject);
};

export default listReports;

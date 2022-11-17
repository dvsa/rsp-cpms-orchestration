import ReportService from '../services/reportService';

export const handler = (event) => {
	let reportObject = event.body;
	if (typeof reportObject.penalty_type === 'undefined') {
		reportObject = JSON.parse(event.body);
	}

	// extract needed info from penalty doc
	return ReportService.generateReport(reportObject);
};

export default handler;

import ReportService from '../services/reportService';

export default (event, context, callback) => {
	console.log(JSON.stringify(event, null, 2));
	let reportObject = event.body;
	if (typeof reportObject.penalty_type === 'undefined') {
		reportObject = JSON.parse(event.body);
	}

	console.log(reportObject);
	ReportService.checkReportStatus(reportObject, callback);
};

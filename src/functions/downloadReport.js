import ReportService from '../services/reportService';

export default (event) => {
	console.log(JSON.stringify(event, null, 2));
	let reportObject = event.body;
	if (typeof reportObject.penalty_type === 'undefined') {
		reportObject = JSON.parse(event.body);
	}

	return ReportService.downloadReport(reportObject);
};

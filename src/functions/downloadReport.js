import ReportService from '../services/reportService';

export const downloadReport = (event) => {
	let reportObject = event.body;
	if (typeof reportObject.penalty_type === 'undefined') {
		reportObject = JSON.parse(event.body);
	}

	return ReportService.downloadReport(reportObject);
};

export default downloadReport;

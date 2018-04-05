import ReportService from '../services/reportService';

export default (event, context, callback) => {

	ReportService.listReports(callback);
};

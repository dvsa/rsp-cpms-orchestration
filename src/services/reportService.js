import createResponse from '../utils/createResponse';

import cpmsAuth from '../utils/cpmsAuth';
import cpmsListReport from '../utils/cpmsListReport';
import cpmsGenerateReport from '../utils/cpmsGenerateReport';
import cpmsCheckReport from '../utils/cpmsCheckReport';
import cpmsDownloadReport from '../utils/downloadReport';

import Constants from '../utils/constants';

const listReports = async (reportObject, callback) => {
	// create auth token for each type of penalty
	try {
		const authToken = await cpmsAuth(
			reportObject.penalty_type,
			Constants.reportingAuthBody,
		);

		const reportData = await cpmsListReport(authToken);
		callback(null, createResponse({ body: reportData, statusCode: 200 }));
	} catch (err) {
		console.log(err);
		callback({ message: 'Error calling CPMS' }, null);
	}

	// get results for each type of penalty
};

const generateReport = async (reportObject, callback) => {
	try {
		const authToken = await cpmsAuth(
			reportObject.penalty_type,
			Constants.reportingAuthBody,
		);

		const generateResult = await cpmsGenerateReport({
			generateReportOptions: {
				report_code: reportObject.report_code,
				filters: {
					from: reportObject.from_date,
					to: reportObject.to_date,
				},
			},
			authToken,
		});
		callback(null, createResponse({ body: generateResult, statusCode: 200 }));
	} catch (err) {
		console.log(err);
		callback({ message: 'Error calling CPMS' }, null);
	}
};

const checkReportStatus = async (reportObject, callback) => {
	try {
		const authToken = await cpmsAuth(
			reportObject.penalty_type,
			Constants.reportingAuthBody,
		);

		const reportStatus = await cpmsCheckReport({
			report_ref: reportObject.report_ref,
			authToken,
		});
		callback(null, createResponse({ body: reportStatus, statusCode: 200 }));
	} catch (err) {
		console.log(err);
		callback({ message: 'Error calling CPMS' }, null);
	}
};

const downloadReport = async (reportObject, callback) => {
	try {
		const authToken = await cpmsAuth(
			reportObject.penalty_type,
			Constants.reportingAuthBody,
		);

		const reportStatus = await cpmsDownloadReport({
			report_ref: reportObject.report_ref,
			authToken,
		});
		callback(null, createResponse({ body: reportStatus, statusCode: 200 }));
	} catch (err) {
		console.log(err);
		callback({ message: 'Error calling CPMS' }, null);
	}
};

export default ({
	listReports,
	generateReport,
	checkReportStatus,
	downloadReport,
});

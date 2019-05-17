import createResponse from '../utils/createResponse';

import cpmsAuth from '../utils/cpmsAuth';
import cpmsListReport from '../utils/cpmsListReport';
import cpmsGenerateReport from '../utils/cpmsGenerateReport';
import cpmsCheckReport from '../utils/cpmsCheckReport';
import cpmsDownloadReport from '../utils/downloadReport';

import Constants from '../utils/constants';

const listReports = async (reportObject) => {
	// create auth token for each type of penalty
	try {
		const authToken = await cpmsAuth(
			reportObject.penalty_type,
			Constants.reportingAuthBody(),
		);

		const reportData = await cpmsListReport(authToken);
		return createResponse({ body: reportData, statusCode: 200 });
	} catch (err) {
		return { message: 'Error calling CPMS' };
	}
};

const generateReport = async (reportObject) => {
	try {
		const authToken = await cpmsAuth(
			reportObject.penalty_type,
			Constants.reportingAuthBody(),
		);

		const generateResult = await cpmsGenerateReport({
			generateReportOptions: {
				cost_centre: Constants.costCentre(),
				report_code: reportObject.report_code,
				filters: {
					from: reportObject.from_date,
					to: reportObject.to_date,
				},
			},
			authToken,
		});
		return createResponse({ body: generateResult, statusCode: 200 });
	} catch (err) {
		throw new Error(JSON.stringify({ message: 'Error calling CPMS' }));
	}
};

const checkReportStatus = async (reportObject) => {
	try {
		const authToken = await cpmsAuth(
			reportObject.penalty_type,
			Constants.reportingAuthBody(),
		);

		const reportStatus = await cpmsCheckReport({
			report_ref: reportObject.report_ref,
			authToken,
		});
		return createResponse({ body: reportStatus, statusCode: 200 });
	} catch (err) {
		throw new Error(JSON.stringify({ message: 'Error calling CPMS' }));
	}
};

const downloadReport = async (reportObject) => {
	try {
		const authToken = await cpmsAuth(
			reportObject.penalty_type,
			Constants.reportingAuthBody(),
		);

		const reportStatus = await cpmsDownloadReport({
			report_ref: reportObject.report_ref,
			authToken,
		});
		return createResponse({ body: reportStatus, statusCode: 200 });
	} catch (err) {
		throw new Error(JSON.stringify({ message: 'Error calling CPMS' }));
	}
};

export default ({
	listReports,
	generateReport,
	checkReportStatus,
	downloadReport,
});

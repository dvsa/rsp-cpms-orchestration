import cpmsAuth from '../utils/cpmsAuth';
import cpmsListReport from '../utils/cpmsListReport';
import cpmsGenerateReport from '../utils/cpmsGenerateReport';

import Constants from '../utils/constants';

const listReports = async (reportObject, callback) => {
	// create auth token for each type of penalty
	try {
		const authToken = await cpmsAuth(Constants.reportingAuthBody);

		const reportData = await cpmsListReport(authToken);
		callback(null, reportData);
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

		const generateResult = await cpmsGenerateReport(authToken);
		callback(null, generateResult);
	} catch (err) {
		console.log(err);
		callback({ message: 'Error calling CPMS' }, null);
	}
};

export default ({
	listReports,
	generateReport,
});

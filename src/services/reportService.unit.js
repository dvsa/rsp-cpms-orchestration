import sinon from 'sinon';
import expect from 'expect';

import ReportService from './reportService';
import Constants from '../utils/constants';
import * as cpmsAuthModule from '../utils/cpmsAuth';
import * as cpmsListReportModule from '../utils/cpmsListReport';
import * as cpmsGenerateReportModule from '../utils/cpmsGenerateReport';
import * as cpmsCheckReportModule from '../utils/cpmsCheckReport';
import * as cpmsDownloadReportModule from '../utils/downloadReport';

const responseBody = (response) => JSON.parse(response.body);

describe('ReportService', () => {
	beforeEach(async () => {
		await Constants.bootstrap();
		sinon.stub(cpmsAuthModule, 'default').resolves('unit-token');
		sinon.stub(cpmsListReportModule, 'default').resolves([{ report_ref: 'R-1' }]);
		sinon.stub(cpmsGenerateReportModule, 'default').resolves({ report_ref: 'R-2' });
		sinon.stub(cpmsCheckReportModule, 'default').resolves({ status: 'complete' });
		sinon.stub(cpmsDownloadReportModule, 'default').resolves('report contents');
	});

	afterEach(() => sinon.restore());

	it('lists reports for the requested penalty type', async () => {
		const result = await ReportService.listReports({ penalty_type: 'FPN' });

		expect(result.statusCode).toBe(200);
		expect(responseBody(result)).toEqual([{ report_ref: 'R-1' }]);
		expect(cpmsAuthModule.default.calledOnceWithExactly('FPN', Constants.reportingAuthBody())).toBe(true);
		expect(cpmsListReportModule.default.calledOnceWithExactly('unit-token')).toBe(true);
	});

	it('returns the established list error response when CPMS fails', async () => {
		cpmsListReportModule.default.rejects(new Error('CPMS unavailable'));

		expect(await ReportService.listReports({ penalty_type: 'IM' }))
			.toEqual({ message: 'Error calling CPMS' });
	});

	it('generates reports with the configured cost centre and date filters', async () => {
		const request = {
			penalty_type: 'CDN',
			report_code: 'DAILY',
			from_date: '2026-01-01',
			to_date: '2026-01-31',
		};
		const result = await ReportService.generateReport(request);

		expect(result.statusCode).toBe(200);
		expect(responseBody(result)).toEqual({ report_ref: 'R-2' });
		expect(cpmsGenerateReportModule.default.calledOnceWithExactly({
			generateReportOptions: {
				cost_centre: Constants.costCentre(),
				report_code: 'DAILY',
				filters: { from: '2026-01-01', to: '2026-01-31' },
			},
			authToken: 'unit-token',
		})).toBe(true);
	});

	it('normalizes report generation errors to the established exception', async () => {
		cpmsGenerateReportModule.default.rejects(new Error('CPMS unavailable'));

		await expect(ReportService.generateReport({ penalty_type: 'FPN' }))
			.rejects.toThrow(JSON.stringify({ message: 'Error calling CPMS' }));
	});

	it('checks report status using the report reference', async () => {
		const result = await ReportService.checkReportStatus({
			penalty_type: 'FPN',
			report_ref: 'R-3',
		});

		expect(result.statusCode).toBe(200);
		expect(responseBody(result)).toEqual({ status: 'complete' });
		expect(cpmsCheckReportModule.default.calledOnceWithExactly({
			report_ref: 'R-3',
			authToken: 'unit-token',
		})).toBe(true);
	});

	it('normalizes report status failures', async () => {
		cpmsCheckReportModule.default.rejects(new Error('not found'));

		await expect(ReportService.checkReportStatus({ penalty_type: 'FPN', report_ref: 'missing' }))
			.rejects.toThrow(JSON.stringify({ message: 'Error calling CPMS' }));
	});

	it('downloads report data using the report reference', async () => {
		const result = await ReportService.downloadReport({
			penalty_type: 'IM',
			report_ref: 'R-4',
		});

		expect(result.statusCode).toBe(200);
		expect(responseBody(result)).toBe('report contents');
		expect(cpmsDownloadReportModule.default.calledOnceWithExactly({
			report_ref: 'R-4',
			authToken: 'unit-token',
		})).toBe(true);
	});

	it('normalizes report download failures', async () => {
		cpmsDownloadReportModule.default.rejects(new Error('download unavailable'));

		await expect(ReportService.downloadReport({ penalty_type: 'FPN', report_ref: 'R-5' }))
			.rejects.toThrow(JSON.stringify({ message: 'Error calling CPMS' }));
	});
});

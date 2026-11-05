const assert = require('node:assert/strict');

function check(condition, message) {
	assert.ok(condition, message);
}

function object(value, label) {
	check(value !== null && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
}

function nonEmptyString(value, label) {
	check(typeof value === 'string' && value.trim().length > 0, `${label} must be a non-empty string`);
}

function reportDefinitions(value) {
	const records = Array.isArray(value) ? value : value
		&& (value.reports || value.Items || value.items || value.data);
	check(Array.isArray(records) && records.length > 0, 'Report list must contain at least one definition');
	const codes = records.map((record) => {
		object(record, 'Report definition');
		const code = record.report_code || record.reportCode || record.code;
		const name = record.report_name || record.reportName || record.name || record.description;
		nonEmptyString(code, 'Report code');
		nonEmptyString(name, 'Report name');
		return code;
	});
	check(new Set(codes).size === codes.length, 'Report codes must be unique');
	return records;
}

function receipt(value, method) {
	object(value, `${method} response`);
	nonEmptyString(value.receipt_reference, `${method} receipt_reference`);
	if (['cardPayment', 'cardNotPresentPayment'].includes(method)) {
		let paymentUrl;
		try { paymentUrl = new URL(value.gateway_url || value.payment_url); } catch { throw new assert.AssertionError({ message: `${method} payment URL must be a valid URL` }); }
		check(paymentUrl.protocol === 'https:', `${method} payment_url must use HTTPS`);
	}
	if (['cashPayment', 'chequePayment', 'postalOrderPayment'].includes(method)) {
		check(['000', 0, '0'].includes(value.code), `${method} response code must be the observed success code 000`);
	}
	return value;
}

function reportReference(value) {
	object(value, 'Report generation response');
	const reference = value.report_ref || value.report_reference || value.reportRef || value.reference;
	nonEmptyString(reference, 'Generated report reference');
	return reference;
}

function reportStatus(value) {
	object(value, 'Report status response');
	if (typeof value.completed === 'boolean') {
		check(value.completed && value.error === false, 'Report status must indicate completion without an error');
		return 'completed';
	}
	const status = String(value.status || value.report_status || value.reportStatus || '').toLowerCase();
	check(['complete', 'completed', 'success', 'succeeded'].includes(status), 'Report status must indicate completion');
	return status;
}

function parseCsv(text) {
	const rows = [];
	let row = [];
	let field = '';
	let quoted = false;
	for (let i = 0; i < text.length; i += 1) {
		const char = text[i];
		if (quoted && char === '"' && text[i + 1] === '"') { field += '"'; i += 1; } else if (char === '"') quoted = !quoted;
		else if (char === ',' && !quoted) { row.push(field); field = ''; } else if ((char === '\n' || char === '\r') && !quoted) {
			if (char === '\r' && text[i + 1] === '\n') i += 1;
			row.push(field);
			if (row.some((cell) => cell !== '')) rows.push(row);
			row = [];
			field = '';
		} else field += char;
	}
	if (field || row.length) {
		row.push(field);
		if (row.some((cell) => cell !== '')) rows.push(row);
	}
	check(rows.length >= 2, 'Downloaded report must contain a header and at least one data row');
	const headers = rows[0].map((header) => header.trim().toLowerCase().replace(/[\s_-]+/g, ' '));
	return rows.slice(1).map((cells) => Object.fromEntries(headers.map((header, index) => [header, (cells[index] || '').trim()])));
}

function reportRows(download) {
	if (typeof download === 'string') return parseCsv(download);
	if (Buffer.isBuffer(download)) return parseCsv(download.toString('utf8'));
	if (download && typeof download === 'object' && Array.isArray(download.data)
		&& download.data.every((byte) => Number.isInteger(byte) && byte >= 0 && byte <= 255)) {
		return parseCsv(Buffer.from(download.data).toString('utf8'));
	}
	if (download && typeof download === 'object' && Array.isArray(download.rows)) return download.rows;
	throw new assert.AssertionError({ message: 'Report download must expose CSV text or rows with verifiable transaction fields' });
}

function verifyReport(rows, expected) {
	check(rows.length > 0, 'Downloaded report must include transaction rows');
	const find = (row, aliases) => {
		for (const alias of aliases) {
			const key = alias.toLowerCase().replace(/[\s_-]+/g, ' ');
			if (Object.prototype.hasOwnProperty.call(row, key)) return row[key];
		}
		return undefined;
	};
	const customer = ['customer reference', 'customer ref', 'customer reference id'];
	const amount = ['total amount', 'amount', 'transaction amount', 'payment amount'];
	const receiptReference = ['receipt reference', 'receipt ref'];
	for (const expectedItem of expected) {
		const matchingRows = rows.filter((item) => find(item, customer) === expectedItem.customerReference);
		check(matchingRows.length > 0, 'CPMS report must contain the exact synthetic customer reference');
		// This CPMS report exposes transaction totals, not individual group members.
		for (const row of matchingRows) {
			const actualAmount = Number(String(find(row, amount)).replace(/[£,]/g, ''));
			check(Number.isFinite(actualAmount) && actualAmount === expectedItem.amount, 'CPMS report amount must equal the independently specified fixture amount');
		}
		if (expectedItem.receiptReference) {
			check(
				matchingRows.some((row) => find(row, receiptReference) === expectedItem.receiptReference),
				'CPMS report receipt reference must equal the API response receipt reference',
			);
		}
	}
}

module.exports = {
	check,
	object,
	nonEmptyString,
	parseCsv,
	receipt,
	reportDefinitions,
	reportReference,
	reportRows,
	reportStatus,
	verifyReport,
};

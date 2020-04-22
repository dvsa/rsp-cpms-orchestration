export function logInfo(logName, message) {
	console.log(JSON.stringify({
		logName,
		message,
		logLevel: 'INFO',
	}, null, 2));
}

export function logError(logName, message) {
	console.error(JSON.stringify({
		logName,
		message,
		logLevel: 'ERROR',
	}, null, 2));
}


// function errorMessageFromAxiosError(error) {
// 	if (error.response) {
// 		console.error(JSON.stringify(log, null, 2));

// 		// The request was made and the server responded with a status code
// 		// that falls out of the range of 2xx
// 		const { data, status } = error.response;
// 		return {
// 			errorData: data,
// 			errorStatus: status,
// 		};
// 	}

// 	if (error.request) {
// 		console.info('ERROR REQUEST', error.request);
// 		return {
// 			message: 'The request was made but no response was received',
// 			request: error.request,
// 		};
// 	}
// 	return (
// 		console.error('ERROR MESSAGE', error.message),
// 		{ errorMessage: error.message }
// 	);
// }

export function logAxiosError(logName, serviceName, error, details) {
	let log;
	// const message = errorMessageFromAxiosError(error);

	if (error.response) {
		console.error('ERROR RESPONSE', error.response);

		log = {
			logName: `${logName}Error`,
			serviceName,
			requestErrorMessage: {
				errorData: error.response.data,
				errorStatus: error.response.status,
			},
			logLevel: 'ERROR',
		};
	};

	if (error.request) {
		console.error('ERROR REQUEST', error.request);

		log = {
			logName: `${logName}Error`,
			serviceName,
			requestErrorMessage: {
				message: 'The request was made but no response was received',
				request: error.request,
			},
			logLevel: 'ERROR',
		};
	} else {
		console.error('ERROR MESSAGE', error.message),

		log = {
			logName: `${logName}Error`,
			serviceName,
			requestErrorMessage: { errorMessage: error.message },
			logLevel: 'ERROR',
		};
	}

	if (details !== undefined) {
		log.details = details;
	}

	console.error(JSON.stringify(log, null, 2));
}

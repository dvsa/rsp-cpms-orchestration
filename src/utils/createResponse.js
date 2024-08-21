export default ({ body = {}, statusCode = 200 }) => {
	let responseBody;
	try {
		responseBody = JSON.stringify(body);
	} catch (error) {
		console.error('Error stringifying response body:', error);
		console.log('Original body:', body);
		responseBody = JSON.stringify({ error: 'Internal Server Error' });
	}

	const response = {
		statusCode,
		headers: {
			'Access-Control-Allow-Origin': '*', // Required for CORS support to work
		},
		body: responseBody,
	};
	return response;
};

import auth from './functions/auth';

require('dotenv').config();

const handler = {
	auth,
};

export default handler;

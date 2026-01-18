import { handler } from '../build/handler.js';
import express from 'express';

const app = express();

const PORT = Number(process.env.PORT) || 3000;

app.use((req, res, next) => {
	// Set Content Security Policy (CSP)

	res.setHeader('X-Frame-Options', 'SAMEORIGIN');

	res.setHeader('X-Content-Type-Options', 'nosniff');

	if (process.env.NODE_ENV === 'production') {
		res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
	}

	// Prevent referrer leakage
	res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

	next();
});

app.get('/healthcheck', (req, res) => {
	res.end('ok');
});

app.use(handler);

app.listen(PORT, '0.0.0.0', () => {
	console.log(`listening on port ${PORT}`);
});

import { handler } from '../build/handler.js';
import express from 'express';

const app = express();

const PORT = Number(process.env.PORT) || 3000;

// Security: Add security headers middleware
app.use((req, res, next) => {
	// Set Content Security Policy (CSP)
	// Note: Adjust this policy based on your application's needs
	res.setHeader(
		'Content-Security-Policy',
		"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'self';"
	);
	
	// Prevent clickjacking
	res.setHeader('X-Frame-Options', 'SAMEORIGIN');
	
	// Prevent MIME type sniffing
	res.setHeader('X-Content-Type-Options', 'nosniff');
	
	// Enable XSS protection
	res.setHeader('X-XSS-Protection', '1; mode=block');
	
	// Enforce HTTPS in production
	if (process.env.NODE_ENV === 'production') {
		res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	}
	
	// Prevent referrer leakage
	res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
	
	next();
});

// add a route that lives separately from the SvelteKit app
app.get('/healthcheck', (req, res) => {
	res.end('ok');
});

// let SvelteKit handle everything else, including serving prerendered pages and static assets
app.use(handler);

app.listen(PORT, '0.0.0.0', () => {
	console.log(`listening on port ${PORT}`);
});

import { handler } from '../build/handler.js';
import express from 'express';

const app = express();

const PORT = Number(process.env.PORT) || 3000;

app.use((req, res, next) => {
	res.removeHeader('Content-Security-Policy');
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

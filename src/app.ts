// CONFIGS
import env from "./configs/env.config";
import { db } from "./configs/db.config";

// HELPERS
import { asyncHandler } from "./helpers";

// MODULES
import App from "@harrypoggers25/app-express";
import path from "node:path";
import express from "express";

// ROUTERS
import router from "./routers";

App.listen({
	port: env.PORT,
	version: '1.0.0',
	cors: [env.ORIGIN_URL],
	beforeListen: async (app) => {
		app.set('view engine', 'ejs');
		app.set('views', path.join(__dirname, '..', 'views'));
		app.use(express.urlencoded({ extended: true }));
		app.use(express.static('public'));
		app.use('/', router);

		await db.sync({ alter: false });
	},
	callback: async () => {
		await asyncHandler('app', async () => {
		});
	},
});


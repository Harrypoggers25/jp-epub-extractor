// CONFIGS
import ch from "@harrypoggers25/color-utils";
import { db } from "../configs/db.config";

(async () => {
	try {
		const sync = await db.sync({ alter: true, });
		if (!sync) throw new Error('Failed to alter sync db');

		console.log(ch.green('DB SCRIPT:'), `Altered db. All previous data have been`, ch.red('deleted'));
		const loadBackup = await db.loadBackup('./database/epub-extractor-v1.json');
		if (!loadBackup) throw new Error('Failed to load backup');

		console.log(ch.green('DB SCRIPT:'), `Load backup file`, ch.green('successful'));
	} catch (error: any) {
		console.log(ch.red('DB SCRIPT ERROR:'), error.message ?? error);
	}
})()

// CONFIGS
import env from "./configs/env.config";
import { db, JishoBuffer } from "./configs/db.config";

// HELPERS
import { asyncHandler } from "./helpers";

// MODULES
import App from "@harrypoggers25/app-express";
import Message from "@harrypoggers25/message";

// SERVICES
import Jisho from "./services/jisho.service";

// const filteredPos: Array<PosType> = ['感動詞', '連体詞', '助動詞', '助詞', '記号', 'フィラー', 'その他'];
// const fileName = 'epubs/book.epub';
// const sections = ['text/part0003_split_000.html', 'text/part0003_split_001.html', 'text/part0004.html',];

App.listen({
	port: env.PORT,
	version: '1.0.0',
	cors: [env.ORIGIN_URL],
	beforeListen: async (app) => {
		// app.use('/', router);

		await db.sync({ alter: false });
	},
	callback: async () => {
		asyncHandler('app', async () => {
			const buffers = await JishoBuffer.find();
			if (!buffers) throw new Error(Message.failed(['find', 'jisho buffers']));

			await Jisho.filterWord(buffers);
		});
	},
});


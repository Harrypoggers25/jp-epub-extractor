// CONFIGS
import { db, JishoBuffer } from "./configs/db.config";

// HELPERS
import { asyncHandler } from "./helpers";

// MODULES
import Message from "@harrypoggers25/message";

// SERVICES
import Jisho from "./services/jisho.service";
import { PosType } from "./helpers/book.helper";

const filteredPos: Array<PosType> = ['感動詞', '連体詞', '助動詞', '助詞', '記号', 'フィラー', 'その他'];
const fileName = 'epubs/book.epub';
const sections = ['text/part0003_split_000.html', 'text/part0003_split_001.html', 'text/part0004.html',];

asyncHandler('app', async () => {
	await db.sync({ alter: false });

	const buffers = await JishoBuffer.find();
	if (!buffers) throw new Error(Message.failed(['find', 'jisho buffers']));

	await Jisho.filterWord(buffers);
});

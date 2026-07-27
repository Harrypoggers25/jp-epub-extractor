// CONFIGS
import { db } from "./configs/db.config";

// SERVICES
import { extractBook, PosType } from "./services/book.service";

const filteredPos: Array<PosType> = ['助動詞', '助詞', '記号', 'フィラー', 'その他'];
const fileName = 'epubs/book.epub';

(async () => {
	await db.sync({ alter: false });

	await extractBook(fileName, { filteredPos })
})()

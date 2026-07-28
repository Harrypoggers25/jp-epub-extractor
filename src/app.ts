// CONFIGS
import { db } from "./configs/db.config";

// SERVICES
import { extractBook, PosType } from "./services/book.service";

const filteredPos: Array<PosType> = ['感動詞', '連体詞', '助動詞', '助詞', '記号', 'フィラー', 'その他'];
const fileName = 'epubs/book.epub';
const sections = [
	'text/part0003_split_000.html',
	'text/part0003_split_001.html',
	'text/part0004.html',
];

(async () => {
	await db.sync({ alter: true });

	await extractBook(fileName, { filteredPos, sections })
	// const book = await extractEpubFile(fileName, {
	// 	sections: [
	// 		'text/part0003_split_000.html',
	// 		'text/part0003_split_001.html',
	// 		'text/part0004.html',
	// 	]
	// });
	// console.log(book);
})()

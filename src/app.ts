import { extractEpub, parseBook, parseSentence, IToken } from "./services/book.service";

// const FILTERED_POS = ['感動詞', '助動詞', '助詞', '接頭詞', '記号', 'フィラー', 'その他'];
const FILTERED_POS = ['記号', 'フィラー', 'その他'];

(async () => {
	const book = await extractEpub("epubs/book.epub");
	const { count, parsedBook } = parseBook(book);

	const dict: Record<string, Record<string, IToken>> = {};
	let i = 1;
	for (const { sentences } of parsedBook) {
		for (const sentence of sentences) {
			const parsedSentence = await parseSentence(sentence, FILTERED_POS);
			for (const word of parsedSentence) {
				if (!dict[word.pos]) dict[word.pos] = {};
				if (dict[word.pos][word.basic_form]) continue;
				dict[word.pos][word.basic_form] = word;
			}
			console.log(`${Math.round((i / count * 100) * 100) / 100}%`);
			i += 1;
		}
	}

	console.log(dict);
})()

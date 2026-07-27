import fs from "fs/promises";
import JSZip from "jszip";
import * as cheerio from "cheerio";
import kuromoji from "kuromoji";

interface ISection { filename: string, content: string };
interface IBook extends Array<ISection> { };
interface IParsedSection { filename: string, sentences: Array<string> };
interface IParsedBook extends Array<IParsedSection> { };
interface IToken {
	word_id: number,
	word_type: 'KNOWN' | 'UNKNOWN',
	word_position: number,
	surface_form: string,
	pos: string,
	pos_detail_1: string,
	pos_detail_2: string,
	pos_detail_3: string,
	conjugated_type: string,
	conjugated_form: string,
	basic_form: string,
	reading: string,
	pronunciation: string
}

async function extractEpub(path: string): Promise<IBook> {
	const file = await fs.readFile(path);
	const zip = await JSZip.loadAsync(file);

	const result: IBook = [];
	for (const filename of Object.keys(zip.files)) {
		if (filename.endsWith(".xhtml") || filename.endsWith(".html")) {
			const content = await zip.files[filename].async("string");
			result.push({ filename, content });
		}
	}

	return result;
}

function formatText(text?: string): string {
	if (!text) return '';
	return text.replace(/\s+/g, '').replace(/\(\)/g, '').trim();
}

function parseBook(book: IBook): { count: number, parsedBook: IParsedBook } {
	let count = 0;
	const parsedBook: IParsedBook = [];
	for (const { filename, content } of book) {
		const $ = cheerio.load(content);
		$("rt").remove();
		const sentences = Array.from($('.calibre1').map((_, el) => formatText($(el).text()))).filter(val => val !== '');
		parsedBook.push({ filename, sentences });
		count += sentences.length;
	}
	return { count, parsedBook };
}

// const FILTERED_POS = ['感動詞', '助動詞', '助詞', '接頭詞', '記号', 'フィラー', 'その他'];
const FILTERED_POS = ['記号', 'フィラー', 'その他'];
async function parseSentence(sentence: string) {
	const tokenizer = await new Promise<kuromoji.Tokenizer<any>>((resolve, reject) => {
		kuromoji.builder({
			dicPath: "node_modules/kuromoji/dict"
		}).build((err, tokenizer) => {
			if (err) reject(err);
			else resolve(tokenizer);
		});
	});

	return tokenizer.tokenize(sentence).filter(elem => !FILTERED_POS.includes(elem.pos)) as Array<IToken>;
}

(async () => {
	const book = await extractEpub("epubs/book.epub");
	const { count, parsedBook } = parseBook(book);

	const dict: Record<string, Record<string, IToken>> = {};
	let i = 1;
	for (const { sentences } of parsedBook) {
		for (const sentence of sentences) {
			const parsedSentence = await parseSentence(sentence);
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

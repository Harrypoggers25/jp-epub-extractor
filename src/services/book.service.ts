import fs from "fs/promises";
import JSZip from "jszip";
import * as cheerio from "cheerio";
import kuromoji from "kuromoji";

export type PosType = '助動詞' | '助詞' | '記号' | 'フィラー' | 'その他' | '接続詞' | '連体詞' | '名詞' | '動詞' | '副詞' | '接頭詞' | '形容詞' | '感動詞';

export interface ISection { filename: string, content: string };
export interface IBook extends Array<ISection> { };
export interface IParsedSection { filename: string, sentences: Array<string> };
export interface IParsedBook extends Array<IParsedSection> { };
export interface IToken {
	word_id: number,
	word_type: 'KNOWN' | 'UNKNOWN',
	word_position: number,
	surface_form: string,
	pos: PosType,
	pos_detail_1: string,
	pos_detail_2: string,
	pos_detail_3: string,
	conjugated_type: string,
	conjugated_form: string,
	basic_form: string,
	reading: string,
	pronunciation: string
}

export async function extractEpub(path: string): Promise<IBook> {
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

export function parseBook(book: IBook): { count: number, parsedBook: IParsedBook } {
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

export async function parseSentence(sentence: string, filterOut: Array<string> = []) {
	const tokenizer = await new Promise<kuromoji.Tokenizer<any>>((resolve, reject) => {
		kuromoji.builder({
			dicPath: "node_modules/kuromoji/dict"
		}).build((err, tokenizer) => {
			if (err) reject(err);
			else resolve(tokenizer);
		});
	});

	return tokenizer.tokenize(sentence).filter(elem => !filterOut.includes(elem.pos)) as Array<IToken>;
}

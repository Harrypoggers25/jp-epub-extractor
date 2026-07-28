// CONFIGS
import { db, WordBuffer, WordType } from "../configs/db.config";

// MODULES
import * as cheerio from "cheerio";
import ch from "@harrypoggers25/color-utils";
import fs from "fs/promises";
import JSZip from "jszip";
import kuromoji from "kuromoji";
import Message from "@harrypoggers25/message";
import { toHiragana } from "wanakana";

export type PosType = '助動詞' | '助詞' | '記号' | 'フィラー' | 'その他' | '接続詞' | '連体詞' | '名詞' | '動詞' | '副詞' | '接頭詞' | '形容詞' | '感動詞';

export interface ISection { filename: string, content: string };
export interface IBook extends Array<ISection> { };
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

export interface IParsedSection { filename: string, sentences: Array<string> };
export interface IParsedBook extends Array<IParsedSection> { };
export interface IParsedToken {
	token_id: number,
	wt_name: string,
	w_basic_form: string,
	w_reading?: string,
	w_pos_details: string,
	wt_description: string,
	surface_form: string,
};

const POS_DESC: Record<PosType, string> = {
	'助動詞': 'Auxiliary verbs',
	'助詞': 'Particles',
	'記号': 'Symbols',
	'フィラー': 'Fillers',
	'その他': 'Others',
	'接続詞': 'Conjunction',
	'連体詞': 'Pre-noun adjectival',
	'名詞': 'Noun',
	'動詞': 'Verb',
	'副詞': 'Adverb',
	'接頭詞': 'Prefix',
	'形容詞': 'I-Adjective',
	'感動詞': 'Interjection',
};

export function parseToken(token: IToken): IParsedToken {
	const token_id = token.word_id;
	const wt_name = token.pos;
	const w_basic_form = token.basic_form;
	const w_reading = token.reading ? toHiragana(token.reading) : token.reading;
	const w_pos_details = (() => {
		const result: Array<string> = [];
		for (const key of ['pos_detail_1', 'pos_detail_2', 'pos_detail_3']) {
			const pos_detail = (token as any)[key] as string;
			if (!pos_detail || pos_detail === '*') continue;
			result.push(pos_detail);
		}
		return result.join(',');
	})();
	const wt_description: string | undefined = POS_DESC[wt_name];
	const surface_form = token.surface_form;

	return { token_id, wt_name, w_basic_form, w_reading, w_pos_details, wt_description, surface_form };
}

type ExtractEpubFileOptions = { sections?: Array<string> };
export async function extractEpubFile(path: string, options?: ExtractEpubFileOptions): Promise<IBook> {
	const file = await fs.readFile(path);
	const zip = await JSZip.loadAsync(file);
	const sections = options?.sections;

	const result: IBook = [];
	for (const filename of Object.keys(zip.files)) {
		if (sections && !sections.includes(filename)) continue;
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

function displayProgress(i: number, count: number) {
	console.log(ch.green('Progress:'), `${Math.round((i / count * 100) * 100) / 100}%`);
}

type ExtractBookOptions = { sections?: Array<string>, filteredPos?: Array<PosType>, showDuplicate?: boolean };
export async function extractBook(fileName: string, options?: ExtractBookOptions) {
	const filteredPos = options?.filteredPos ?? [];
	const showDuplicate = options?.showDuplicate ?? true;
	const sections = options?.sections;
	const ignores: Array<number> = [];

	try {
		const book = await extractEpubFile(fileName, { sections });
		const { count, parsedBook } = parseBook(book);

		let i = 0;
		for (const { sentences } of parsedBook) {
			for (const sentence of sentences) {
				const parsedSentence = (await parseSentence(sentence, filteredPos)).map(token => parseToken(token));
				for (const { token_id, wt_name, w_basic_form, w_reading, w_pos_details, wt_description, surface_form } of parsedSentence) {
					const created_at = new Date();
					const transaction = await db.transaction({ rollbackOnError: true });

					if (!w_reading) {
						if (!ignores.includes(token_id)) {
							console.log(ch.cyan('NO READING:'), { token_id, surface_form, wt_name });
							ignores.push(token_id);
						}
						await transaction.commit();
						continue;
					}

					const wordTypes = await WordType.find({ where: { wt_name }, transaction });
					if (!wordTypes) throw new Error(Message.failed(['find', 'word types', { wt_name }]));
					if (!wordTypes.length) {
						const newWordType = await WordType.create({ wt_name, wt_description, created_at }, { transaction });
						if (!newWordType) throw new Error(Message.failed(['create', 'new word type', { wt_name }]));
					}

					const words = await WordBuffer.find({ where: { token_id }, transaction });
					if (!words) throw new Error(Message.failed(['find', 'words', { token_id, w_basic_form }]));
					const word = await (async () => {
						if (words.length) {
							if (!ignores.includes(token_id)) {
								if (showDuplicate) console.log(ch.yellow('DUPLICATE ENTRY:'), { token_id, w_basic_form, w_reading, wt_name });
								ignores.push(token_id);
							}
							return words[0];
						}

						const newWord = await WordBuffer.create({ token_id, w_basic_form, w_reading, w_pos_details, created_at, wt_name }, { transaction });
						if (!newWord) throw new Error(Message.failed(['create', 'new word', { token_id, w_basic_form }]));

						return newWord;
					})();

					const updateWord = await WordBuffer.updateByPk(token_id, { count: word.count + 1 }, { transaction });
					if (!updateWord) throw new Error(Message.failed(['update', 'word count', { token_id, w_basic_form }]));

					await transaction.commit();
				}
				displayProgress(i + 1, count);
				i += 1;
			}
		}

		console.log(ch.green('SUCCESS:'), `extracted words from book ${fileName}`);
	} catch (error: any) {
		console.log(ch.red('EXTRACTION ERROR:'), error.message ?? error);
	}
}

// CONFIGS
import { db, TokenBuffer, WordType } from "../configs/db.config";

// HELPERS
import { asyncHandler, displayProgress } from "../helpers";
import { ExtractBookOptions, IBook, IParsedBook, IParsedToken, IToken, ITokenPositions, PosDesc } from "../helpers/book.helper";

// MODULES
import * as cheerio from "cheerio";
import ch from "@harrypoggers25/color-utils";
import fs from "fs/promises";
import JSZip from "jszip";
import kuromoji from "kuromoji";
import Message from "@harrypoggers25/message";
import { toHiragana } from "wanakana";

namespace Book {
	export async function extractEpubFile(path: string): Promise<IParsedBook> {
		const file = await fs.readFile(path);
		const zip = await JSZip.loadAsync(file);

		const book: IBook = [];
		for (const filename of Object.keys(zip.files)) {
			if (filename.endsWith(".xhtml") || filename.endsWith(".html")) {
				const content = await zip.files[filename].async("string");
				if (!content.length) console.log('kaka')
				book.push({ filename, content });
			}
		}

		const formatText = (text?: string) => !text ? '' : text.replace(/\s+/g, '').replace(/\(\)/g, '').trim();
		const parsedBook: IParsedBook = [];
		for (const { filename, content } of book) {
			const $ = cheerio.load(content);
			["div", "a", "span", "p"].forEach(tag => $(tag).filter((_, el) => $(el).text().trim() === '').remove());
			["head", "header", "nav", "hr", "table", "img", "rp", "rt"].forEach(tag => $(tag).remove());
			const sentences = Array.from($('p').map((_, el) => formatText($(el).text()))).filter(val => val !== '');
			if (!sentences.length) continue;
			parsedBook.push({ filename, sentences });
		}
		return parsedBook;
	}

	export async function parseSentence(sentence: string, filterOut: Array<string> = []): Promise<Array<IParsedToken> | undefined> {
		return await asyncHandler('PARSE SENTENCE', async () => {
			const tokenizer = await new Promise<kuromoji.Tokenizer<any>>((resolve, reject) => {
				kuromoji.builder({
					dicPath: "node_modules/kuromoji/dict"
				}).build((err, tokenizer) => {
					if (err) reject(err);
					else resolve(tokenizer);
				});
			});

			const tokens = tokenizer.tokenize(sentence).filter(elem => !filterOut.includes(elem.pos)) as Array<IToken>;
			const parsedTokens = tokens.map(token => {
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
				const wt_description: string | undefined = PosDesc[wt_name];
				const surface_form = token.surface_form;

				return { token_id, wt_name, w_basic_form, w_reading, w_pos_details, wt_description, surface_form };
			});
			return parsedTokens.sort((a, b) => a.token_id - b.token_id);
		});
	}

	export async function extractBook(parsedBook: IParsedBook, options?: ExtractBookOptions) {
		const filteredPos = options?.filteredPos ?? [];
		const showDuplicate = options?.showDuplicate ?? true;
		const sections = options?.sections;
		const ignores: Set<number> = new Set();

		try {
			let i = 0;
			for (let section_no = 0; section_no < parsedBook.length; section_no++) {
				const { sentences } = parsedBook[section_no];
				for (let sentence_no = 0; sentence_no < sentences.length; sentence_no++) {
					const sentence = sentences[sentence_no];
					const parsedSentence = await parseSentence(sentence, filteredPos);
					if (!parsedSentence) throw new Error(Message.failed<string>(['parse', 'sentence']));

					for (const { token_id, wt_name, w_basic_form, w_reading, w_pos_details, wt_description, surface_form } of parsedSentence) {
						if (!w_reading) {
							if (!ignores.has(token_id)) {
								console.log(ch.cyan('TOKEN NO READING:'), { token_id, surface_form, wt_name });
								ignores.add(token_id);
							}
							continue;
						}

						const created_at = new Date();
						const transaction = await db.transaction();

						const wordTypes = await WordType.find({ where: { wt_name }, transaction });
						if (!wordTypes) throw new Error(Message.failed(['find', 'word types', { wt_name }]));
						if (!wordTypes.length) {
							const newWordType = await WordType.create({ wt_name, wt_description, created_at }, { transaction });
							if (!newWordType) throw new Error(Message.failed(['create', 'new word type', { wt_name }]));
						}

						await (async () => {
							const tokens = await TokenBuffer.find({ where: { token_id }, transaction });
							if (!tokens) throw new Error(Message.failed(['find', 'tokens', { token_id, w_basic_form }]));
							if (!tokens.length) {
								const token = await TokenBuffer.create({ token_id, w_basic_form, w_reading, w_pos_details, created_at, wt_name }, { transaction });
								if (!token) throw new Error(Message.failed(['create', 'new token', { token_id, w_basic_form }]));

								return;
							}

							if (!ignores.has(token_id)) {
								if (showDuplicate) console.log(ch.yellow('TOKEN DUPLICATE ENTRY:'), { token_id, w_basic_form, w_reading, wt_name });
								ignores.add(token_id);
							}

							const token_positions = (() => {
								const token_positions = JSON.parse(tokens[0].token_positions) as ITokenPositions;
								if (!token_positions[section_no]) token_positions[section_no] = [];
								if (token_positions[section_no][sentence_no]) return;

								token_positions[section_no].push(sentence_no);
								return JSON.stringify(token_positions);
							})();

							const token = await TokenBuffer.updateByPk(token_id, { token_positions }, { transaction });
							if (!token) throw new Error(Message.failed(['update', 'word count', { token_id, w_basic_form }]));
						})();

						await transaction.commit();
					}
					displayProgress(i + 1, 1);
					i += 1;
				}
			}

			console.log(ch.green('BOOK EXTRACTION SUCCESS:'), 'extracted words from book');
		} catch (error: any) {
			console.log(ch.red('BOOK EXTRACTION ERROR:'), error.message ?? error);
		}
	}
}

export default Book;

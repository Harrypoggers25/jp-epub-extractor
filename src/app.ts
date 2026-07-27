// CONFIGS
import { db, WordBuffer, WordType } from "./configs/db.config";

// SERVICES
import { extractEpub, parseBook, parseSentence, displayProgress, PosType, parseToken } from "./services/book.service";

// MODULES
import ch from "@harrypoggers25/color-utils";
import Message from "@harrypoggers25/message";

const FILTERED_POS: Array<PosType> = ['助動詞', '助詞', '記号', 'フィラー', 'その他'];
const showDuplicate: boolean = true;

(async () => {
	await db.sync({ alter: true });

	const fileName = 'epubs/book.epub';
	const ignores: Array<number> = [];

	try {
		const book = await extractEpub(fileName);
		const { count, parsedBook } = parseBook(book);

		let i = 0;
		for (const { sentences } of parsedBook) {
			for (const sentence of sentences) {
				const parsedSentence = (await parseSentence(sentence, FILTERED_POS)).map(token => parseToken(token));
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
})()

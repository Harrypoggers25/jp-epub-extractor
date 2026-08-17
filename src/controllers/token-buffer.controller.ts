// CONFIGS
import { BookBuffer, db, SentenceBuffer, TokenBuffer, WordType } from "../configs/db.config";

// HELPERS
import { ITokenPositions, PosType } from "../helpers/book.helper";
import { writeResponse } from "../helpers";

// MODULES
import Message from "@harrypoggers25/message";

// ROUTES
import Route from "@harrypoggers25/route";

// SERVICES
import Book from "../services/book.service";

const filteredOutPos: Array<PosType> = ['感動詞', '連体詞', '助動詞', '助詞', '記号', 'フィラー', 'その他'];
export namespace TokenBufferHandler {
	export const count = Route.asyncHandler(async (_, res) => {
		const tokenBuffers = await TokenBuffer.find();
		if (!tokenBuffers) throw new Error(Message.failed(['find', 'sentence buffer count']));

		res.status(200).json({ count: tokenBuffers.length });
	});
	export const removeAll = Route.asyncHandler(async (_, res) => {
		const tokenBuffers = await TokenBuffer.delete();
		if (!tokenBuffers) throw new Error(Message.failed(['delete', 'all token buffers']));

		res.status(200).json(tokenBuffers);
	});
	export const tokenize = Route.asyncEventStreamHandler(async (_, res, write) => {
		const currentBookBuffer = await BookBuffer.find({ orderBy: { created_at: 'DESC' }, limit: 1 });
		if (!currentBookBuffer || !currentBookBuffer.length) throw new Error(Message.failed(['tokenize', 'book sentences'], {
			causer: ['find', 'current book buffer']
		}));

		const { book_id } = currentBookBuffer[0];
		const sentenceBuffers = await SentenceBuffer.find({ where: { book_id }, orderBy: { section_no: 'ASC', sentence_no: 'ASC' } });
		if (!sentenceBuffers) throw new Error(Message.failed(['tokenize', 'book buffer', book_id], {
			causer: ['find', 'sentence buffers']
		}));

		const lastPosition = await (async () => {
			const lastTokens = await TokenBuffer.find({ orderBy: { created_at: 'DESC' }, limit: 1 });
			if (!lastTokens) throw new Error(Message.failed(['tokenize', 'book buffer', book_id], {
				causer: ['find', 'last token']
			}));

			return !lastTokens.length ? [-1, -1] : lastTokens[0].token_positions.split(',').map(val => +val);
		})();

		const startTime = Date.now();
		write(writeResponse({
			percentage: 0,
			message: 'Tokenizing sentences into token buffer',
			t_elapsed_ms: 0
		}));
		for (let i = 0; i < sentenceBuffers.length; i++) {
			const { section_no, sentence_no, sentence_text } = sentenceBuffers[i];
			const percentage = Math.round((i + 1) / sentenceBuffers.length * 100 * 100) / 100;

			if (lastPosition[0] > section_no || (lastPosition[0] === section_no && lastPosition[1] >= sentence_no)) {
				write(writeResponse({
					percentage,
					message: 'Skipped token entry. Sentence already tokenized',
					t_elapsed_ms: Date.now() - startTime
				}));
				continue;
			}

			const parsedSentence = await Book.parseSentence(sentence_text, filteredOutPos);
			if (!parsedSentence) throw new Error(Message.failed(['tokenize', 'book buffer', book_id], {
				causer: ['parse', 'sentence']
			}));

			const transaction = await db.transaction();
			for (const { token_id, wt_name, w_basic_form, w_reading, surface_form, w_pos_details, wt_description } of parsedSentence) {
				if (!w_reading) continue;

				const created_at = new Date();
				const wordTypes = await WordType.find({ where: { wt_name }, transaction });
				if (!wordTypes) throw new Error(Message.failed(['tokenize', 'book buffer', book_id], { causer: ['find', 'word types', { wt_name }] }));
				if (!wordTypes.length) {
					const newWordType = await WordType.create({ wt_name, wt_description, created_at }, { transaction });
					if (!newWordType) throw new Error(Message.failed(['tokenize', 'book buffer', book_id], { causer: ['create', 'new word type', { wt_name }] }));
				}

				const token_positions = await (async () => {
					const tokens = await TokenBuffer.find({ where: { token_id }, transaction });
					if (!tokens) throw new Error(Message.failed(['tokenize', 'book buffer', book_id], { causer: ['find', 'tokens', { token_id }] }));
					if (!tokens.length) {
						const token = await TokenBuffer.create({ token_id, wt_name, w_basic_form, w_reading, surface_form, w_pos_details, created_at }, { transaction });
						if (!token) throw new Error(Message.failed(['create', 'token', i]));

						return JSON.stringify({ [section_no]: [sentence_no] });
					}

					const token_positions = JSON.parse(tokens[0].token_positions) as ITokenPositions;
					if (!token_positions[section_no]) {
						token_positions[section_no] = [sentence_no];
						return JSON.stringify(token_positions);
					}
					if (!token_positions[section_no].includes(sentence_no)) {
						token_positions[section_no] = [...token_positions[section_no], sentence_no].sort((a, b) => a - b);
						return JSON.stringify(token_positions);
					}

					return;
				})();
				if (!token_positions) continue;

				const token = await TokenBuffer.update({ token_positions }, { where: { token_id }, transaction });
				if (!token) throw new Error(Message.failed(['update', 'token', i]));
			}
			await transaction.commit();
			write(writeResponse({
				percentage,
				message: `Extracted ${parsedSentence.length} tokens from sentence [${section_no},${sentence_no}]`,
				t_elapsed_ms: Date.now() - startTime
			}));
		}
		write(writeResponse({
			percentage: 100,
			message: 'Successfully tokenized all sentences into token buffer',
			t_elapsed_ms: Date.now() - startTime,
			success: true,
		}))
		res.end();
	});
}

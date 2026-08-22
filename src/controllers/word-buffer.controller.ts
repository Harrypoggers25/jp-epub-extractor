// CONFIGS
import { BookBuffer, db, EntryState, IWordBuffer, JishoBuffer, SentenceBuffer, TokenBuffer, UnsureEntryState, UnsureWordBuffer, Word, WordBuffer } from "../configs/db.config";

// HELPERS
import { writeResponse } from "../helpers";
import { IJishoReducedWord, IJishoWord } from "../helpers/jisho.helper";
import { ITokenPositions } from "../helpers/book.helper";

// MODULES
import Message from "@harrypoggers25/message";

// ROUTES
import Route from "@harrypoggers25/route";

import Jisho from "../services/jisho.service";
import { transformWordBuffer } from "../services/word-buffers.service";
import { isArrayObj } from "../helpers/json.helper";

export namespace WordBufferHandler {
	export const count = Route.asyncHandler(async (_, res) => {
		const wordBuffers = await WordBuffer.find();
		if (!wordBuffers) throw new Error(Message.failed(['find', 'word buffer count']));

		res.status(200).json({ count: wordBuffers.length });
	});

	export const transform = Route.asyncHandler(async (req, res) => {
		const w_basic_form = req.params.w_basic_form as string;
		const wt_name = req.params.wt_name as string;
		const state = (() => {
			const { state } = req.body;
			if (!state) return state;
			if (!isArrayObj<number>(state, i => typeof i === 'number')) throw new Error(Message.failed(['transform', 'word buffers', { w_basic_form, wt_name }], {
				subMessage: 'state must be an array of numbers'
			}));

			return state;
		})();

		const wordBuffers = await WordBuffer.find();
		if (!wordBuffers) throw new Error(Message.failed(['transform', 'word buffers', { w_basic_form, wt_name }], {
			causer: ['find', 'all word buffers']
		}));

		const entryStates = await EntryState.find();
		if (!entryStates) throw new Error(Message.failed(['transform', 'word buffers', { w_basic_form, wt_name }], { causer: ['find', 'all entry states'] }));

		const es_id = `${w_basic_form}_${wt_name}`;

		const { top, bottom } = transformWordBuffer(wordBuffers, entryStates, es_id, state);
		res.status(200).json({ top, bottom });
	});

	export const findAll = Route.asyncHandler(async (_, res) => {
		const wordBuffers = await WordBuffer.find({ orderBy: { w_character_type: 'DESC', w_basic_form: 'ASC', wt_name: 'ASC' } });
		if (!wordBuffers) throw new Error(Message.failed(['find', 'all word buffers']));

		res.status(200).json(wordBuffers);
	});

	export const findMany = Route.asyncHandler(async (req, res) => {
		const w_basic_form = req.params.w_basic_form as string;
		const wordBuffers = await WordBuffer.find({ like: { w_basic_form: `${w_basic_form}%` } });
		if (!wordBuffers) throw new Error(Message.failed(['find', 'word buffers', { w_basic_form }]));

		res.status(200).json(wordBuffers);
	});

	export const find = Route.asyncHandler(async (req, res) => {
		const w_basic_form = req.params.w_basic_form as string;
		const wt_name = req.params.wt_name as string;
		const wordBuffers = await WordBuffer.find({ where: { w_basic_form, wt_name } });
		if (!wordBuffers || !wordBuffers.length) throw new Error(Message.failed(['find', 'word buffer', { w_basic_form, wt_name }]));

		res.status(200).json(wordBuffers[0]);
	});

	export const filter = Route.asyncEventStreamHandler(async (_, res, write) => {
		const jishoBuffers = await JishoBuffer.find({ orderBy: { wt_name: 'ASC', w_basic_form: 'ASC' } });
		if (!jishoBuffers) throw new Error(Message.failed(['filter', 'word buffer'], {
			causer: ['find', 'all jisho buffer']
		}));

		const startTime = Date.now();
		const word_forms = (res: IJishoReducedWord): Array<string> => [...res.japanese.map(Object.values).flat(), res.slug];
		write(writeResponse({
			percentage: 0,
			message: 'Filtering jisho entries into word buffer',
			t_elapsed_ms: 0
		}));
		for (let i = 0; i < jishoBuffers.length; i++) {
			const percentage = Math.round((i + 1) / jishoBuffers.length * 100 * 100) / 100;

			const { token_ids, w_basic_form, token_positions, wt_name } = jishoBuffers[i];
			const wordBuffers = await WordBuffer.find({ where: { w_basic_form, wt_name } });
			if (wordBuffers?.length) {
				write(writeResponse({
					percentage,
					message: `Skipped filtering existing word entry for ${w_basic_form} - ${wt_name}`,
					t_elapsed_ms: Date.now() - startTime
				}));
				continue;
			}

			const w_character_type = Jisho.characterType(w_basic_form);
			const created_at = new Date();
			const j_response = (() => {
				const j_response = (JSON.parse(jishoBuffers[i].j_response) as Array<IJishoWord>).map(res => Jisho.reduceWord(res));
				if (!j_response.length) return jishoBuffers[i].j_response;

				const j_response_new = j_response.filter(entry => word_forms(entry).includes(jishoBuffers[i].w_basic_form));
				if (j_response_new.length) return JSON.stringify(j_response_new);

				return jishoBuffers[i].j_response;
			})();
			const occurrence_count = (() => {
				let count = 0;
				Object.values(JSON.parse(token_positions) as ITokenPositions).forEach(val => {
					count += val.length;
				});
				return count;
			})();
			const wordBuffer = await WordBuffer.create({ token_ids, w_basic_form, w_character_type, j_response, token_positions, occurrence_count, created_at, wt_name });
			if (!wordBuffer) throw new Error(Message.failed(['create', 'word buffer', { w_basic_form, wt_name }]));

			write(writeResponse({
				percentage,
				message: `Filtered word entry for ${w_basic_form} - ${wt_name}`,
				t_elapsed_ms: Date.now() - startTime
			}));
		}
		write(writeResponse({
			percentage: 100,
			message: 'Successfully filtered jisho entries into word buffer',
			t_elapsed_ms: Date.now() - startTime,
			success: true
		}));
		res.end();
	});

	export const confirm = Route.asyncEventStreamHandler(async (_, res, write) => {
		const wordBuffers = await WordBuffer.find();
		if (!wordBuffers) throw new Error(Message.failed(['confirm', 'word buffers'], {
			causer: ['find', 'word buffers']
		}));

		const { entryStates, validEntryStateCount } = await (async () => {
			const entryStates = await EntryState.find();
			if (!entryStates) throw new Error(Message.failed(['confirm', 'word buffers'], {
				causer: ['find', 'entry states']
			}));

			return {
				entryStates: Object.fromEntries(entryStates.map(entryState => {
					const { es_id, state, ignore, unsure, can_merge, merged_with } = entryState;
					return [es_id, { state, ignore, unsure, can_merge, merged_with }];
				})),
				validEntryStateCount: entryStates.filter(entryState => {
					const { unsure, ignore, merged_with } = entryState;
					const state = JSON.parse(entryState.state) as Array<number>;

					return unsure || ignore || merged_with || state.length;
				}).length
			}
		})();
		if (wordBuffers.length !== validEntryStateCount) throw new Error(Message.failed(['confirm', 'word buffers'], {
			subMessage: 'All word buffers must have a valid entry'
		}));

		const wordBuffers2: Array<IWordBuffer> = [];
		const entryStates2: typeof entryStates = {};
		const sortTokenId = (token_ids: string) => token_ids.split(',').map(token_id => +token_id).sort((a, b) => a - b).join(',');
		const combine = (wordBuffer: IWordBuffer, entryStates: typeof entryStates2) => {
			const token_ids = sortTokenId(wordBuffer.token_ids);
			const { w_basic_form, wt_name, w_character_type, occurrence_count } = wordBuffer;
			const es_id = `${w_basic_form}_${wt_name}`;
			const { ignore, state, unsure, merged_with, can_merge } = entryStates[es_id];
			const j_response = (() => {
				const j_response = JSON.parse(wordBuffer.j_response) as Array<IJishoReducedWord>;
				const state = JSON.parse(entryStates[es_id].state) as Array<number>;

				return JSON.stringify(state.map(i => j_response[i]));
			})();

			return { token_ids, w_basic_form, wt_name, j_response, w_character_type, occurrence_count, es_id, ignore, state, unsure, merged_with, can_merge };
		};
		const startTime = Date.now();
		write(writeResponse({
			percentage: 0,
			message: 'Confirming word buffer entries',
			t_elapsed_ms: 0
		}));
		const transaction = await db.transaction();
		let i = 0;
		for (const wordBuffer of wordBuffers) {
			const { token_ids, w_basic_form, wt_name, j_response, w_character_type, occurrence_count, es_id, ignore, state, unsure, merged_with, can_merge } = combine(wordBuffer, entryStates);
			const created_at = new Date();

			if (merged_with) {
				wordBuffers2.push(wordBuffer);
				entryStates2[es_id] = entryStates[es_id];
				continue;
			}

			if (!unsure) {
				const word = Word.create({ token_ids, w_basic_form, wt_name, j_response, w_character_type, occurrence_count, ignore, created_at }, { transaction });
				if (!word) throw new Error(Message.failed(['confirm', 'word buffers'], {
					causer: ['create', 'word', { w_basic_form, wt_name }]
				}));
			} else {
				const unsureWordBuffer = await UnsureWordBuffer.create({ token_ids, w_basic_form, w_character_type, j_response, occurrence_count, created_at, wt_name }, { transaction });
				if (!unsureWordBuffer) throw new Error(Message.failed(['confirm', 'word buffers'], {
					causer: ['create', 'unsure word buffer', { w_basic_form, wt_name }]
				}));

				const unsureEntryState = UnsureEntryState.create({ es_id, state, ignore, merged_with, can_merge }, { transaction });
				if (!unsureEntryState) throw new Error(Message.failed(['confirm', 'word buffers'], {
					causer: ['create', 'unsure entry state']
				}));
			}

			const deletedWordBuffer = await WordBuffer.delete({ where: { w_basic_form, wt_name }, transaction });
			if (!deletedWordBuffer) throw new Error(Message.failed(['confirm', 'word buffers'], {
				causer: ['delete', 'word buffer', { w_basic_form, wt_name }]
			}));

			const deletedEntryState = await EntryState.delete({ where: { es_id }, transaction });
			if (!deletedEntryState) throw new Error(Message.failed(['confirm', 'word buffers'], {
				causer: ['delete', 'entry state', { es_id }]
			}));
			const percentage = Math.round((i + 1) / wordBuffers.length * 100 * 100) / 100;
			i += 1;
			write(writeResponse({
				percentage,
				message: `Confirmed word buffer entry ${w_basic_form} [ ${wt_name} ]`,
				t_elapsed_ms: Date.now() - startTime
			}));
		}
		for (const wordBuffer of wordBuffers2) {
			const { token_ids, w_basic_form, wt_name, occurrence_count, es_id, merged_with } = combine(wordBuffer, entryStates2);

			const word = await (async () => {
				const [w_basic_form, wt_name] = merged_with!.split('_');
				const words = await Word.find({ where: { w_basic_form, wt_name }, transaction })
				if (!words || !words.length) throw new Error(Message.failed(['confirm', 'word buffers'], {
					causer: ['find', 'word', { w_basic_form, wt_name }]
				}));

				return words[0];
			})();

			const updatedWord = await Word.update({
				token_ids: sortTokenId(`${word.token_ids},${token_ids}`),
				occurrence_count: word.occurrence_count + occurrence_count
			}, {
				where: { w_basic_form: word.w_basic_form, wt_name: word.wt_name },
				transaction
			});
			if (!updatedWord) throw new Error(Message.failed(['confirm', 'word buffers'], {
				causer: ['update', 'word', { w_basic_form, wt_name }]
			}));

			const deletedWordBuffer = await WordBuffer.delete({ where: { w_basic_form, wt_name }, transaction });
			if (!deletedWordBuffer) throw new Error(Message.failed(['confirm', 'word buffers'], {
				causer: ['delete', 'word buffer', { w_basic_form, wt_name }]
			}));

			const deletedEntryState = await EntryState.delete({ where: { es_id }, transaction });
			if (!deletedEntryState) throw new Error(Message.failed(['confirm', 'word buffers'], {
				causer: ['delete', 'entry state', { es_id }]
			}));

			const percentage = Math.round((i + 1) / wordBuffers.length * 100 * 100) / 100;
			i += 1;
			write(writeResponse({
				percentage,
				message: `Merged word buffer entry ${w_basic_form} [ ${wt_name} ] into ${word.w_basic_form} [ ${word.wt_name} ]`,
				t_elapsed_ms: Date.now() - startTime
			}));
		}

		const currentBookBuffer = await BookBuffer.find({ orderBy: { created_at: 'DESC' }, limit: 1, transaction });
		if (!currentBookBuffer || !currentBookBuffer.length) throw new Error(Message.failed(['confirm', 'word buffers'], {
			causer: ['find', 'current book buffer']
		}));

		const { book_id } = currentBookBuffer[0];
		const deletedWordBuffers = await WordBuffer.delete({ transaction });
		if (!deletedWordBuffers) throw new Error(Message.failed(['confirm', 'word buffers'], {
			causer: ['delete', 'word buffers', { book_id }]
		}));

		const jishoBuffers = await JishoBuffer.delete({ transaction });
		if (!jishoBuffers) throw new Error(Message.failed(['confirm', 'word buffers'], {
			causer: ['delete', 'jisho buffers', { book_id }]
		}));

		const tokenBuffers = await TokenBuffer.delete({ transaction });
		if (!tokenBuffers) throw new Error(Message.failed(['confirm', 'word buffers'], {
			causer: ['delete', 'token buffers', { book_id }]
		}));

		const sentenceBuffers = await SentenceBuffer.delete({ where: { book_id }, transaction });
		if (!sentenceBuffers) throw new Error(Message.failed(['confirm', 'word buffers'], {
			causer: ['delete', 'sentence buffers', { book_id }]
		}));

		const bookBuffer = await BookBuffer.deleteByPk(book_id, { transaction });
		if (!bookBuffer) throw new Error(Message.failed(['confirm', 'word buffers'], { causer: ['delete', 'current book buffer'] }))

		await transaction.commit();
		write(writeResponse({
			percentage: 100,
			message: 'Successfully confirmed word buffer entries',
			t_elapsed_ms: Date.now() - startTime,
			success: true
		}));
		res.end();
	});
}


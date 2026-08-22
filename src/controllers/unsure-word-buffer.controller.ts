// CONFIGS
import { db, IUnsureWordBuffer, UnsureEntryState, UnsureWordBuffer, Word } from "../configs/db.config";

// HELPERS
import { writeResponse } from "../helpers";
import { IJishoReducedWord } from "../helpers/jisho.helper";

// MODULES
import Message from "@harrypoggers25/message";

// ROUTES
import Route from "@harrypoggers25/route";

import { transformUnsureWordBuffer } from "../services/unsure-word-buffers.service";
import { isArrayObj } from "../helpers/json.helper";

export namespace UnsureWordBufferHandler {
	export const count = Route.asyncHandler(async (_, res) => {
		const unsureWordBuffers = await UnsureWordBuffer.find();
		if (!unsureWordBuffers) throw new Error(Message.failed(['find', 'unsure word buffer count']));

		res.status(200).json({ count: unsureWordBuffers.length });
	});

	export const transform = Route.asyncHandler(async (req, res) => {
		const w_basic_form = req.params.w_basic_form as string;
		const wt_name = req.params.wt_name as string;
		const state = (() => {
			const { state } = req.body;
			if (!state) return state;
			if (!isArrayObj<number>(state, i => typeof i === 'number')) throw new Error(Message.failed(['transform', 'unsure word buffers', { w_basic_form, wt_name }], {
				subMessage: 'state must be an array of numbers'
			}));

			return state;
		})();

		const unsureWordBuffers = await UnsureWordBuffer.find();
		if (!unsureWordBuffers) throw new Error(Message.failed(['transform', 'unsure word buffers', { w_basic_form, wt_name }], {
			causer: ['find', 'all unsure word buffers']
		}));

		const unsureEntryStates = await UnsureEntryState.find();
		if (!unsureEntryStates) throw new Error(Message.failed(['transform', 'unsure word buffers', { w_basic_form, wt_name }], { causer: ['find', 'all unsure entry states'] }));

		const es_id = `${w_basic_form}_${wt_name}`;

		const { top, bottom } = transformUnsureWordBuffer(unsureWordBuffers, unsureEntryStates, es_id, state);
		res.status(200).json({ top, bottom });
	});

	export const findAll = Route.asyncHandler(async (_, res) => {
		const unsureWordBuffers = await UnsureWordBuffer.find({ orderBy: { w_character_type: 'DESC', w_basic_form: 'ASC', wt_name: 'ASC' } });
		if (!unsureWordBuffers) throw new Error(Message.failed(['find', 'all unsure word buffers']));

		res.status(200).json(unsureWordBuffers);
	});

	export const findMany = Route.asyncHandler(async (req, res) => {
		const w_basic_form = req.params.w_basic_form as string;
		const unsureWordBuffers = await UnsureWordBuffer.find({ like: { w_basic_form: `${w_basic_form}%` } });
		if (!unsureWordBuffers) throw new Error(Message.failed(['find', 'unsure word buffers', { w_basic_form }]));

		res.status(200).json(unsureWordBuffers);
	});

	export const find = Route.asyncHandler(async (req, res) => {
		const w_basic_form = req.params.w_basic_form as string;
		const wt_name = req.params.wt_name as string;
		const unsureWordBuffers = await UnsureWordBuffer.find({ where: { w_basic_form, wt_name } });
		if (!unsureWordBuffers || !unsureWordBuffers.length) throw new Error(Message.failed(['find', 'unsure word buffer', { w_basic_form, wt_name }]));

		res.status(200).json(unsureWordBuffers[0]);
	});

	export const confirm = Route.asyncEventStreamHandler(async (_, res, write) => {
		const unsureWordBuffers = await UnsureWordBuffer.find();
		if (!unsureWordBuffers) throw new Error(Message.failed(['confirm', 'unsure word buffers'], {
			causer: ['find', 'unsure word buffers']
		}));

		const entryStates = await (async () => {
			const entryStates = await UnsureEntryState.find();
			if (!entryStates) throw new Error(Message.failed(['confirm', 'unsure word buffers'], {
				causer: ['find', 'unsure entry states']
			}));

			return Object.fromEntries(entryStates.map(entryState => {
				const { es_id, state, ignore, can_merge, merged_with } = entryState;
				return [es_id, { state, ignore, can_merge, merged_with }];
			}));
		})();

		const unsureWordBuffers2: Array<IUnsureWordBuffer> = [];
		const unsureEntryStates2: typeof entryStates = {};
		const sortTokenId = (token_ids: string) => token_ids.split(',').map(token_id => +token_id).sort((a, b) => a - b).join(',');
		const combine = (unsureWordBuffer: IUnsureWordBuffer, unsureEntryStates: typeof unsureEntryStates2) => {
			const token_ids = sortTokenId(unsureWordBuffer.token_ids);
			const { w_basic_form, wt_name, w_character_type, occurrence_count } = unsureWordBuffer;
			const es_id = `${w_basic_form}_${wt_name}`;
			const { ignore, state, merged_with, can_merge } = unsureEntryStates[es_id];
			const j_response = (() => {
				const j_response = JSON.parse(unsureWordBuffer.j_response) as Array<IJishoReducedWord>;
				const state = JSON.parse(unsureEntryStates[es_id].state) as Array<number>;

				return JSON.stringify(state.map(i => j_response[i]));
			})();

			return { token_ids, w_basic_form, wt_name, j_response, w_character_type, occurrence_count, es_id, ignore, state, merged_with, can_merge };
		};
		const startTime = Date.now();
		write(writeResponse({
			percentage: 0,
			message: 'Confirming unsure word buffer entries',
			t_elapsed_ms: 0
		}));
		const transaction = await db.transaction();
		let i = 0;
		for (const unsureWordBuffer of unsureWordBuffers) {
			const { token_ids, w_basic_form, wt_name, j_response, w_character_type, occurrence_count, es_id, ignore, merged_with } = combine(unsureWordBuffer, entryStates);
			const created_at = new Date();

			if (merged_with) {
				unsureWordBuffers2.push(unsureWordBuffer);
				unsureEntryStates2[es_id] = entryStates[es_id];
				continue;
			}

			const word = Word.create({ token_ids, w_basic_form, wt_name, j_response, w_character_type, occurrence_count, ignore, created_at }, { transaction });
			if (!word) throw new Error(Message.failed(['confirm', 'unsure word buffers'], {
				causer: ['create', 'word', { w_basic_form, wt_name }]
			}));

			const deletedUnsureWordBuffer = await UnsureWordBuffer.delete({ where: { w_basic_form, wt_name }, transaction });
			if (!deletedUnsureWordBuffer) throw new Error(Message.failed(['confirm', 'unsure word buffers'], {
				causer: ['delete', 'unsure word buffer', { w_basic_form, wt_name }]
			}));

			const deletedUnsureEntryState = await UnsureEntryState.delete({ where: { es_id }, transaction });
			if (!deletedUnsureEntryState) throw new Error(Message.failed(['confirm', 'unsure word buffers'], {
				causer: ['delete', 'unsure entry state', { es_id }]
			}));
			const percentage = Math.round((i + 1) / unsureWordBuffers.length * 100 * 100) / 100;
			i += 1;
			write(writeResponse({
				percentage,
				message: `Confirmed unsure word buffer entry ${w_basic_form} [ ${wt_name} ]`,
				t_elapsed_ms: Date.now() - startTime
			}));
		}
		for (const unsureWordBuffer of unsureWordBuffers2) {
			const { token_ids, w_basic_form, wt_name, occurrence_count, es_id, merged_with } = combine(unsureWordBuffer, unsureEntryStates2);

			const word = await (async () => {
				const [w_basic_form, wt_name] = merged_with!.split('_');
				const words = await Word.find({ where: { w_basic_form, wt_name }, transaction })
				if (!words || !words.length) throw new Error(Message.failed(['confirm', 'unsure word buffers'], {
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
			if (!updatedWord) throw new Error(Message.failed(['confirm', 'unsure word buffers'], {
				causer: ['update', 'word', { w_basic_form, wt_name }]
			}));

			const deletedUnsureWordBuffer = await UnsureWordBuffer.delete({ where: { w_basic_form, wt_name }, transaction });
			if (!deletedUnsureWordBuffer) throw new Error(Message.failed(['confirm', 'unsure word buffers'], {
				causer: ['delete', 'unsure word buffer', { w_basic_form, wt_name }]
			}));

			const deletedUnsureEntryState = await UnsureEntryState.delete({ where: { es_id }, transaction });
			if (!deletedUnsureEntryState) throw new Error(Message.failed(['confirm', 'unsure word buffers'], {
				causer: ['delete', 'unsure entry state', { es_id }]
			}));

			const percentage = Math.round((i + 1) / unsureWordBuffers.length * 100 * 100) / 100;
			i += 1;
			write(writeResponse({
				percentage,
				message: `Merged unsure word buffer entry ${w_basic_form} [ ${wt_name} ] into ${word.w_basic_form} [ ${word.wt_name} ]`,
				t_elapsed_ms: Date.now() - startTime
			}));
		}

		await transaction.commit();
		write(writeResponse({
			percentage: 100,
			message: 'Successfully confirmed unsure word buffer entries',
			t_elapsed_ms: Date.now() - startTime,
			success: true
		}));
		res.end();
	});
}


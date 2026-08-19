// CONFIGS
import Db from "@harrypoggers25/db-postgresql";
import { WordBuffer, db, EntryState, IWordBuffer, IEntryState } from "../configs/db.config";
import { IParsedToken } from "../helpers/book.helper";

// HELPERS
import { IJishoReducedWord, IJishoWord } from "../helpers/jisho.helper";

// MODULES
import Message from "@harrypoggers25/message";

// ROUTES
import Route from "@harrypoggers25/route";

// SERVICES
import { transformWordBuffer } from "../services/work-buffers.service";

export namespace EntryStateHandler {
	export const create = Route.asyncHandler(async (req, res) => {
		const { es_id, unsure, ignore, merged_with, can_merge } = req.body;
		const state = (() => {
			const { state } = req.body;
			return state ? JSON.stringify(Array.from(new Set(state))) : state;
		})();

		const entryState = await EntryState.create({ es_id, state, unsure, ignore, merged_with, can_merge });
		if (!entryState) throw new Error(Message.failed(['create', 'entry state', es_id]));

		res.status(201).json(entryState);
	});

	export const sync = Route.asyncHandler(async (req, res) => {
		const wordBuffers = await WordBuffer.find();
		if (!wordBuffers) throw new Error(Message.failed(['sync', 'all entry states'], { causer: ['find', 'all word buffers'] }));

		const entryStates = await EntryState.find();
		if (!entryStates) throw new Error(Message.failed(['sync', 'all entry states'], { causer: ['find', 'all entry states'] }));

		const result: Array<IEntryState> = [];
		const transaction = await db.transaction();
		for (const { w_basic_form, wt_name } of wordBuffers) {
			const es_id = `${w_basic_form}_${wt_name}`;
			const can_merge = transformWordBuffer(wordBuffers, entryStates, es_id).top.length;
			const updatedEntryState = await EntryState.update({ can_merge }, { where: { es_id }, transaction });
			if (!updatedEntryState) throw new Error(Message.failed(['update', 'entry state', es_id]));
			if (!updatedEntryState.length) continue;

			result.push(updatedEntryState[0]);
		}
		await transaction.commit();

		res.status(200).json(result);
	});

	export const findAll = Route.asyncHandler(async (_, res) => {
		const entryStates = await EntryState.find();
		if (!entryStates) throw new Error(Message.failed(['find', 'all entry states']));

		res.status(200).json(entryStates);
	});

	export const find = Route.asyncHandler(async (req, res) => {
		const es_id = req.params.es_id as string;
		const entryStates = await EntryState.find({ where: { es_id } });
		if (!entryStates) throw new Error(Message.failed(['find', 'words', es_id]));

		res.status(200).json(entryStates);
	});

	export const update = Route.asyncHandler(async (req, res) => {
		const es_id = req.params.es_id as string;
		const { unsure, ignore, merged_with, can_merge } = req.body;
		const state = (() => {
			const { state } = req.body;
			return state ? JSON.stringify(Array.from(new Set(state))) : state;
		})();

		const entryState = await EntryState.updateByPk(es_id, { state, unsure, ignore, merged_with, can_merge });
		if (!entryState) throw new Error(Message.failed(['update', 'entry state', es_id]))

		res.status(200).json(entryState);
	});

	export const updateState = Route.asyncHandler(async (req, res) => {
		const es_id = req.params.es_id as string;
		const state = (() => {
			const { state } = req.body;
			return state ? JSON.stringify(Array.from(new Set(state))) : state;
		})();
		if (!state) {
			res.status(400);
			throw new Error(Message.failed(['update', 'entry state', es_id], { subMessage: 'State is required' }));
		}
		const transaction = await db.transaction();

		const entryStates = await (async () => {
			const entryStates = await EntryState.find({ transaction });
			if (!entryStates) throw new Error(Message.failed(['update', 'entry state', es_id], {
				causer: ['find', 'entry states']
			}));

			return Object.fromEntries(entryStates.filter(entryState => !entryState.merged_with).map(entryState => {
				const { es_id, state, unsure, ignore, merged_with, can_merge } = entryState;
				return [es_id, { state, unsure, ignore, merged_with, can_merge }];
			}));
		})();
		entryStates[es_id].state = state;

		const extractBuffer = async (es_id: string) => {
			const buffer = await (async () => {
				const [w_basic_form, wt_name] = es_id.split('_');
				const buffers = await WordBuffer.find({ where: { w_basic_form, wt_name } });
				if (!buffers || !buffers.length) throw new Error(Message.failed(['update', 'entry state', es_id], {
					causer: ['find', 'target buffer', { w_basic_form, wt_name }]
				}));

				return buffers[0];
			})();

			const entries = await (async () => {
				const entryState = entryStates[es_id];
				if (!entryState) throw new Error(Message.failed(['update', 'entry state', es_id], {
					causer: ['find', 'entry state', es_id]
				}));

				return JSON.parse(buffer.j_response).filter((_: any, i: number) => Array.from(JSON.parse(entryState.state)).sort().includes(i)) as Array<IJishoWord>;
			})();

			const slugs = entries.map(entry => entry.slug);
			return { es_id, buffer, entries, slugs };
		}

		// const target = await extractBuffer(es_id);
		// for (const [es_id, { state, unsure, ignore, merged_with, can_merge }] of Object.entries(entryStates)) {
		// 	const { buffer, entries, slugs } = await extractBuffer(es_id);
		// 	if (target.slugs.every(slug => slugs.includes(slug))) {
		// 		entryStates[target.es_id].can_merge += 1;
		// 		entryStates[es_id].can_merge += 1;
		// 	}
		//
		// 	if (target.slugs)
		// }

		await transaction.commit();
		res.status(200).json({});
	});

	export const removeAll = Route.asyncHandler(async (_, res) => {
		const entryStates = await EntryState.delete();
		if (!entryStates) throw new Error(Message.failed(['delete', 'all entry states']));

		res.status(200).json(entryStates);
	});

	export const remove = Route.asyncHandler(async (req, res) => {
		const es_id = req.params.es_id as string;
		const entryState = await EntryState.deleteByPk(es_id);
		if (!entryState) throw new Error(Message.failed(['delete', 'entry state', es_id]));

		res.status(200).json(entryState);
	});
}


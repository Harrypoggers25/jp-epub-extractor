// CONFIGS
import { WordBuffer, db, EntryState, IEntryState } from "../configs/db.config";

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

	export const sync = Route.asyncHandler(async (_, res) => {
		const wordBuffers = await WordBuffer.find();
		if (!wordBuffers) throw new Error(Message.failed(['sync', 'all entry states'], { causer: ['find', 'all word buffers'] }));

		const result: Record<string, IEntryState> = {};
		const es_ids = new Set<string>();
		const transaction = await db.transaction();
		for (const { w_basic_form, wt_name } of wordBuffers) {
			const es_id = `${w_basic_form}_${wt_name}`;
			const can_merge = await (async () => {
				const entryState = await EntryState.findByPk(es_id);
				if (!entryState) throw new Error(Message.failed(['sync', 'entry state'], { causer: ['find', 'entry state', es_id] }));
				if (entryState.merged_with) {
					es_ids.add(entryState.merged_with);
					return 0;
				}

				const entryStates = await EntryState.find();
				if (!entryStates) throw new Error(Message.failed(['sync', 'all entry states'], { causer: ['find', 'all entry states'] }));

				return transformWordBuffer(wordBuffers, entryStates, es_id).top.length;
			})();
			const updatedEntryState = await EntryState.update({ can_merge }, { where: { es_id }, transaction });
			if (!updatedEntryState) throw new Error(Message.failed(['update', 'entry state', es_id]));
			if (!updatedEntryState.length) continue;

			result[es_id] = updatedEntryState[0];
		}
		for (const es_id of Array.from(es_ids)) {
			const updatedEntryState = await EntryState.update({ can_merge: 0 }, { where: { es_id }, transaction });
			if (!updatedEntryState) throw new Error(Message.failed(['update', 'entry state', es_id]));
			if (!updatedEntryState.length) continue;

			result[es_id].can_merge = 0;
		}
		await transaction.commit();

		res.status(200).json(Object.values(result));
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

	export const merge = Route.asyncHandler(async (req, res) => {
		const es_id1 = req.params.es_id1 as string;
		const es_id2 = req.params.es_id2 as string;

		const wordBuffers = await WordBuffer.find();
		if (!wordBuffers) throw new Error(Message.failed(['merge', 'entry state', { es_id1, es_id2 }], { causer: ['find', 'all word buffers'] }));

		const entryStates = await EntryState.find();
		if (!entryStates) throw new Error(Message.failed(['merge', 'entry state', { es_id1, es_id2 }], { causer: ['find', 'all entry states'] }));

		const transaction = await db.transaction();
		const updatedEntryState1 = await EntryState.updateByPk(es_id1, { merged_with: es_id2, can_merge: 0 }, { transaction });
		if (!updatedEntryState1) throw new Error(Message.failed(['merge', 'entry state', { es_id1, es_id2 }], {
			causer: ['update', 'entry state', es_id1]
		}));

		const updatedEntryState2 = await EntryState.updateByPk(es_id2, { can_merge: 0 }, { transaction });
		if (!updatedEntryState2) throw new Error(Message.failed(['merge', 'entry state', { es_id1, es_id2 }], {
			causer: ['update', 'entry state', es_id2]
		}));

		await transaction.commit();
		res.status(200).json([updatedEntryState1, updatedEntryState2]);
	});

	export const unmerge = Route.asyncHandler(async (req, res) => {
		const es_id1 = req.params.es_id as string;

		const es_id2 = await (async () => {
			const entryState = await EntryState.findByPk(es_id1);
			if (!entryState) throw new Error(Message.failed(['unmerge', 'entry state', es_id1], { causer: ['find', 'entry state', es_id1] }));

			return entryState.merged_with;
		})();
		if (!es_id2) throw new Error(Message.failed(['unmerge', 'entry state', es_id1], { subMessage: 'Entry is not currently merged' }));

		const wordBuffers = await WordBuffer.find();
		if (!wordBuffers) throw new Error(Message.failed(['unmerge', 'entry state', es_id1], { causer: ['find', 'all word buffers'] }));

		const transaction = await db.transaction();
		const updatedEntryState1 = await (async () => {
			const es_id = es_id1;
			const merged_with = null;
			const updatedEntryState = await EntryState.updateByPk(es_id, { merged_with }, { transaction });
			if (!updatedEntryState) throw new Error(Message.failed(['unmerge', 'entry state', es_id1], {
				causer: ['update', 'entry state', { es_id, merged_with }]
			}));

			const entryStates = await EntryState.find({ transaction });
			if (!entryStates) throw new Error(Message.failed(['unmerge', 'entry state', es_id1], { causer: ['find', 'all entry states'] }));

			const can_merge = transformWordBuffer(wordBuffers, entryStates, es_id1).top.length;
			const entryState = await EntryState.updateByPk(es_id1, { can_merge }, { transaction });
			if (!entryState) throw new Error(Message.failed(['unmerge', 'entry state', es_id1], {
				causer: ['update', 'entry state', { es_id, can_merge }]
			}));

			return entryState;
		})();
		const updatedEntryState2 = await (async () => {
			const es_id = es_id2;

			const can_merge = await (async () => {
				const mergedEntryStates = await EntryState.find({ where: { merged_with: es_id }, transaction });
				if (!mergedEntryStates) throw new Error(Message.failed(['unmerge', 'entry state', es_id1], {
					causer: ['find', 'entry states', { merged_with: es_id }]
				}));

				if (mergedEntryStates.length) return 0;

				const entryStates = await EntryState.find({ transaction });
				if (!entryStates) throw new Error(Message.failed(['unmerge', 'entry state', es_id1], { causer: ['find', 'all entry states'] }));

				return transformWordBuffer(wordBuffers, entryStates, es_id).top.length;
			})();
			const entryState = await EntryState.updateByPk(es_id, { can_merge }, { transaction });
			if (!entryState) throw new Error(Message.failed(['merge', 'entry state', { es_id1, es_id2 }], {
				causer: ['update', 'entry state', { es_id, can_merge }]
			}));

			return entryState;
		})();
		await transaction.commit();
		res.status(200).json([updatedEntryState1, updatedEntryState2]);
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


// CONFIGS
import { db, UnsureEntryState, IUnsureEntryState, Word, UnsureWordBuffer } from "../configs/db.config";

// MODULES
import Message from "@harrypoggers25/message";

// ROUTES
import Route from "@harrypoggers25/route";

// SERVICES
import { transformUnsureWordBuffer } from "../services/unsure-word-buffers.service";

export namespace UnsureEntryStateHandler {
	export const create = Route.asyncHandler(async (req, res) => {
		const { es_id, ignore, merged_with, can_merge } = req.body;
		const state = (() => {
			const { state } = req.body;
			return state ? JSON.stringify(Array.from(new Set(state))) : state;
		})();

		const unsureEntryState = await UnsureEntryState.create({ es_id, state, ignore, merged_with, can_merge });
		if (!unsureEntryState) throw new Error(Message.failed(['create', 'unsure entry state', es_id]));

		res.status(201).json(unsureEntryState);
	});

	export const sync = Route.asyncHandler(async (_, res) => {
		const result: Record<string, IUnsureEntryState> = {};
		const es_ids = new Set<string>();
		const transaction = await db.transaction();

		const words = await Word.find({ transaction });
		if (!words) throw new Error(Message.failed(['sync', 'all unsure entry states'], {
			causer: ['find', 'all word buffers']
		}));

		for (const word of words) {
			const { w_basic_form, wt_name } = word;
			const es_id = `${w_basic_form}_${wt_name}`;
			const can_merge = await (async () => {
				const unsureEntryState = await UnsureEntryState.findByPk(es_id);
				if (!unsureEntryState) throw new Error(Message.failed(['sync', 'all unsure entry state'], {
					causer: ['find', 'unsure entry state', es_id]
				}));
				if (unsureEntryState.merged_with) {
					es_ids.add(unsureEntryState.merged_with);
					return 0;
				}

				const unsureEntryStates = await UnsureEntryState.find();
				if (!unsureEntryStates) throw new Error(Message.failed(['sync', 'all unsure entry states'], {
					causer: ['find', 'all unsure entry states']
				}));

				const targetWord = await (async () => {
					const unsureWordBuffers = await UnsureWordBuffer.find({ where: { w_basic_form, wt_name }, transaction });
					if (!unsureWordBuffers || unsureWordBuffers.length) throw new Error(Message.failed(['sync', 'all unsure entry states'], {
						causer: ['find', 'unsure word buffers', { w_basic_form, wt_name }]
					}));
					return unsureWordBuffers[0];
				})();

				return transformUnsureWordBuffer(words, unsureEntryStates, targetWord).top.length;
			})();
			const updatedUnsureEntryState = await UnsureEntryState.update({ can_merge }, { where: { es_id }, transaction });
			if (!updatedUnsureEntryState) throw new Error(Message.failed(['update', 'unsure entry state', es_id]));
			if (!updatedUnsureEntryState.length) continue;

			result[es_id] = updatedUnsureEntryState[0];
		}
		for (const es_id of Array.from(es_ids)) {
			const updatedUnsureEntryState = await UnsureEntryState.update({ can_merge: 0 }, { where: { es_id }, transaction });
			if (!updatedUnsureEntryState) throw new Error(Message.failed(['update', 'unsure entry state', es_id]));
			if (!updatedUnsureEntryState.length) continue;

			result[es_id].can_merge = 0;
		}
		await transaction.commit();

		res.status(200).json(Object.values(result));
	});

	export const findAll = Route.asyncHandler(async (_, res) => {
		const unsureEntryStates = await UnsureEntryState.find();
		if (!unsureEntryStates) throw new Error(Message.failed(['find', 'all unsure entry states']));

		res.status(200).json(unsureEntryStates);
	});

	export const find = Route.asyncHandler(async (req, res) => {
		const es_id = req.params.es_id as string;
		const unsureEntryStates = await UnsureEntryState.find({ where: { es_id } });
		if (!unsureEntryStates) throw new Error(Message.failed(['find', 'words', es_id]));

		res.status(200).json(unsureEntryStates);
	});

	export const merge = Route.asyncHandler(async (req, res) => {
		const es_id1 = req.params.es_id1 as string; // merger
		const es_id2 = req.params.es_id2 as string; // mergee
		const updated: Array<IUnsureEntryState> = [];
		const transaction = await db.transaction();

		const updatedUnsureEntryState1 = await UnsureEntryState.updateByPk(es_id1, { merged_with: es_id2, can_merge: 0 }, { transaction });
		if (!updatedUnsureEntryState1) throw new Error(Message.failed(['merge', 'unsure entry state', { es_id1, es_id2 }], {
			causer: ['update', 'unsure entry state', es_id1]
		}));
		updated.push(updatedUnsureEntryState1);

		const updatedUnsureEntryState2 = await UnsureEntryState.updateByPk(es_id2, { can_merge: 0 }, { transaction });
		if (!updatedUnsureEntryState2) throw new Error(Message.failed(['merge', 'unsure entry state', { es_id1, es_id2 }], {
			causer: ['update', 'unsure entry state', es_id2]
		}));
		updated.push(updatedUnsureEntryState2);

		// const unsureEntryStates = await UnsureEntryState.find({ transaction });
		// if (!unsureEntryStates) throw new Error(Message.failed(['merge', 'unsure entry state', { es_id1, es_id2 }], {
		// 	causer: ['find', 'all unsure entry states']
		// }));
		//
		// const wordBuffers = await WordBuffer.find();
		// if (!wordBuffers) throw new Error(Message.failed(['merge', 'unsure entry state', { es_id1, es_id2 }], { causer: ['find', 'all word buffers'] }));
		//
		// const isOtherUnsureEntryState = (unsureEntryState: IUnsureEntryState) => unsureEntryState.es_id !== es_id1 && unsureEntryState.es_id !== es_id2 && !unsureEntryState.merged_with;
		// for (const unsureEntryState of unsureEntryStates.filter(isOtherUnsureEntryState)) {
		// 	const { es_id } = unsureEntryState;
		// 	console.log(es_id);
		// 	const can_merge = transformWordBuffer(wordBuffers, unsureEntryStates, es_id).top.length;
		// 	if (can_merge === unsureEntryState.can_merge) continue;
		//
		// 	const updatedUnsureEntryState = await UnsureEntryState.updateByPk(es_id, { can_merge }, { transaction });
		// 	if (!updatedUnsureEntryState) throw new Error(Message.failed(['merge', 'unsure entry state', { es_id1, es_id2 }], {
		// 		causer: ['update', 'unsure entry state', unsureEntryState.es_id]
		// 	}));
		// 	updated.push(updatedUnsureEntryState);
		// }

		await transaction.commit();
		res.status(200).json(updated);
	});

	export const unmerge = Route.asyncHandler(async (req, res) => {
		const es_id1 = req.params.es_id as string; // past merger
		const es_id2 = await (async () => { // past mergee
			const unsureEntryState = await UnsureEntryState.findByPk(es_id1);
			if (!unsureEntryState) throw new Error(Message.failed(['unmerge', 'unsure entry state', es_id1], {
				causer: ['find', 'unsure entry state', es_id1]
			}));
			if (!unsureEntryState.merged_with) throw new Error(Message.failed(['unmerge', 'unsure entry state', es_id1], {
				subMessage: 'Entry is not currently merged'
			}));

			return unsureEntryState.merged_with;
		})();

		const words = await Word.find();
		if (!words) throw new Error(Message.failed(['unmerge', 'unsure entry state', es_id1], {
			causer: ['find', 'all words']
		}));

		const transaction = await db.transaction();
		const updated: Array<IUnsureEntryState> = [];

		const getTargetWord = async (w_basic_form: string, wt_name: string) => {
			const unsureWordBuffers = await UnsureWordBuffer.find({ where: { w_basic_form, wt_name }, transaction });
			return unsureWordBuffers?.[0];
		}
		const updatedUnsureEntryState1 = await (async () => {
			const es_id = es_id1;
			const [w_basic_form, wt_name] = es_id.split('_');
			const updatedUnsureEntryState = await UnsureEntryState.updateByPk(es_id, { merged_with: null }, { transaction });
			if (!updatedUnsureEntryState) throw new Error(Message.failed(['unmerge', 'unsure entry state', es_id1], {
				causer: ['update', 'unsure entry state', { es_id, merged_with: null }]
			}));
			const unsureEntryStates = await UnsureEntryState.find({ transaction });
			if (!unsureEntryStates) throw new Error(Message.failed(['unmerge', 'unsure entry state', es_id1], { causer: ['find', 'all unsure entry states'] }));
			const targetWord = await getTargetWord(w_basic_form, wt_name);
			if (!targetWord) throw new Error(Message.failed(['unmerge', 'unsure entry state', es_id1], {
				causer: ['find', 'target word', { w_basic_form, wt_name }]
			}));
			const can_merge = transformUnsureWordBuffer(words, unsureEntryStates, targetWord).top.length;
			const unsureEntryState = await UnsureEntryState.updateByPk(es_id1, { can_merge }, { transaction });
			if (!unsureEntryState) throw new Error(Message.failed(['unmerge', 'unsure entry state', es_id1], {
				causer: ['update', 'unsure entry state', { es_id, can_merge }]
			}));
			return unsureEntryState;
		})();
		updated.push(updatedUnsureEntryState1);

		const updatedUnsureEntryState2 = await (async () => {
			const es_id = es_id2;
			const [w_basic_form, wt_name] = es_id.split('_');
			const can_merge = await (async () => {
				const mergedUnsureEntryStates = await UnsureEntryState.find({ where: { merged_with: es_id }, transaction });
				if (!mergedUnsureEntryStates) throw new Error(Message.failed(['unmerge', 'unsure entry state', es_id1], {
					causer: ['find', 'unsure entry states', { merged_with: es_id }]
				}));
				if (mergedUnsureEntryStates.length) return 0;
				const unsureEntryStates = await UnsureEntryState.find({ transaction });
				if (!unsureEntryStates) throw new Error(Message.failed(['unmerge', 'unsure entry state', es_id1], { causer: ['find', 'all unsure entry states'] }));
				const targetWord = await getTargetWord(w_basic_form, wt_name);
				if (!targetWord) throw new Error(Message.failed(['unmerge', 'unsure entry state', es_id1], {
					causer: ['find', 'target word', { w_basic_form, wt_name }]
				}));
				return transformUnsureWordBuffer(words, unsureEntryStates, targetWord).top.length;
			})();
			const unsureEntryState = await UnsureEntryState.updateByPk(es_id, { can_merge }, { transaction });
			if (!unsureEntryState) throw new Error(Message.failed(['unmerge', 'unsure entry state', es_id1], {
				causer: ['update', 'unsure entry state', { es_id, can_merge }]
			}));
			return unsureEntryState;
		})();
		updated.push(updatedUnsureEntryState2);

		// const unsureEntryStates = await UnsureEntryState.find({ transaction });
		// if (!unsureEntryStates) throw new Error(Message.failed(['unmerge', 'unsure entry state', es_id1], { causer: ['find', 'all unsure entry states'] }));
		//
		// const isOtherUnsureEntryState = (unsureEntryState: IUnsureEntryState) => unsureEntryState.es_id !== es_id1 && unsureEntryState.es_id !== es_id2 && !unsureEntryState.merged_with;
		// for (const unsureEntryState of unsureEntryStates.filter(isOtherUnsureEntryState)) {
		// 	const { es_id } = unsureEntryState;
		// 	const can_merge = transformWordBuffer(wordBuffers, unsureEntryStates, es_id).top.length;
		// 	if (can_merge === unsureEntryState.can_merge) continue;
		// 	const updatedUnsureEntryState = await UnsureEntryState.updateByPk(es_id, { can_merge }, { transaction });
		// 	if (!updatedUnsureEntryState) throw new Error(Message.failed(['unmerge', 'unsure entry state', es_id1], {
		// 		causer: ['update', 'unsure entry state', es_id]
		// 	}));
		// 	updated.push(updatedUnsureEntryState);
		// }

		await transaction.commit();
		res.status(200).json(updated);
	});

	export const update = Route.asyncHandler(async (req, res) => {
		const es_id = req.params.es_id as string;
		const { ignore, merged_with, can_merge } = req.body;
		const state = (() => {
			const { state } = req.body;
			return state ? JSON.stringify(Array.from(new Set(state))) : state;
		})();

		const unsureEntryState = await UnsureEntryState.updateByPk(es_id, { state, ignore, merged_with, can_merge });
		if (!unsureEntryState) throw new Error(Message.failed(['update', 'unsure entry state', es_id]))

		res.status(200).json(unsureEntryState);
	});

	export const removeAll = Route.asyncHandler(async (_, res) => {
		const unsureEntryStates = await UnsureEntryState.delete();
		if (!unsureEntryStates) throw new Error(Message.failed(['delete', 'all unsure entry states']));

		res.status(200).json(unsureEntryStates);
	});

	export const remove = Route.asyncHandler(async (req, res) => {
		const es_id = req.params.es_id as string;
		const unsureEntryState = await UnsureEntryState.deleteByPk(es_id);
		if (!unsureEntryState) throw new Error(Message.failed(['delete', 'unsure entry state', es_id]));

		res.status(200).json(unsureEntryState);
	});
}


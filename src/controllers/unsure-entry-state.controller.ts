// CONFIGS
import { WordBuffer, db, UnsureEntryState, IUnsureEntryState } from "../configs/db.config";

// MODULES
import Message from "@harrypoggers25/message";

// ROUTES
import Route from "@harrypoggers25/route";

// SERVICES
import { transformWordBuffer } from "../services/word-buffers.service";

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
		const wordBuffers = await WordBuffer.find();
		if (!wordBuffers) throw new Error(Message.failed(['sync', 'all unsure entry states'], { causer: ['find', 'all word buffers'] }));

		const result: Record<string, IUnsureEntryState> = {};
		const es_ids = new Set<string>();
		const transaction = await db.transaction();
		for (const wordBuffer of wordBuffers) {
			const { w_basic_form, wt_name } = wordBuffer;
			const es_id = `${w_basic_form}_${wt_name}`;
			const can_merge = await (async () => {
				const unsureEntryState = await UnsureEntryState.findByPk(es_id);
				if (!unsureEntryState) throw new Error(Message.failed(['sync', 'unsure entry state'], { causer: ['find', 'unsure entry state', es_id] }));
				if (unsureEntryState.merged_with) {
					es_ids.add(unsureEntryState.merged_with);
					return 0;
				}

				const unsureEntryStates = await UnsureEntryState.find();
				if (!unsureEntryStates) throw new Error(Message.failed(['sync', 'all unsure entry states'], { causer: ['find', 'all unsure entry states'] }));

				return transformWordBuffer(wordBuffers, unsureEntryStates, wordBuffer).top.length;
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


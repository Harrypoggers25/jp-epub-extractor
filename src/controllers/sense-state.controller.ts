// CONFIGS
import { SenseState, Word } from "../configs/db.config";

// MODULES
import Message from "@harrypoggers25/message";

// HELPER
import { isArrayObj } from "../helpers/json.helper";

// ROUTES
import Route from "@harrypoggers25/route";

export namespace SenseStateHandler {
	export const create = Route.asyncHandler(async (req, res) => {
		const { ss_key } = req.body;
		const state = (() => {
			const { state } = req.body;
			if (!isArrayObj<number>(state, i => typeof i === 'number')) throw new Error(Message.failed(['create', 'sense state', ss_key], {
				subMessage: 'State must be an array of numbers'
			}));
			if (!state.length) throw new Error(Message.failed(['create', 'Sense state', ss_key], {
				subMessage: 'State must not be empty'
			}));

			return JSON.stringify(Array.from(new Set(state)));
		})();

		const senseState = await SenseState.create({ ss_key, state });
		if (!senseState) throw new Error(Message.failed(['create', 'sense state', ss_key]));

		res.status(201).json(senseState);
	});

	export const findAll = Route.asyncHandler(async (_, res) => {
		const senseStates = await SenseState.find();
		if (!senseStates) throw new Error(Message.failed(['find', 'all sense states']));

		res.status(200).json(senseStates);
	});

	export const find = Route.asyncHandler(async (req, res) => {
		const ss_key = req.params.ss_key as string;
		const senseStates = await SenseState.find({ where: { ss_key } });
		if (!senseStates) throw new Error(Message.failed(['find', 'words', ss_key]));

		res.status(200).json(senseStates);
	});

	export const update = Route.asyncHandler(async (req, res) => {
		const ss_key = req.params.ss_key as string;
		const state = (() => {
			const { state } = req.body;
			if (!isArrayObj<number>(state, i => typeof i === 'number')) throw new Error(Message.failed(['create', 'sense state', ss_key], {
				subMessage: 'State must be an array of numbers'
			}));
			if (!state.length) throw new Error(Message.failed(['create', 'Sense state', ss_key], {
				subMessage: 'State must not be empty'
			}));

			return JSON.stringify(Array.from(new Set(state)));
		})();

		const senseState = await SenseState.updateByPk(ss_key, { state });
		if (!senseState) throw new Error(Message.failed(['update', 'sense state', ss_key]))

		res.status(200).json(senseState);
	});

	export const removeAll = Route.asyncHandler(async (req, res) => {
		const senseStates = await SenseState.delete();
		if (!senseStates) throw new Error(Message.failed(['delete', 'all sense states']));

		res.status(200).json(senseStates);
	});

	export const remove = Route.asyncHandler(async (req, res) => {
		const ss_key = req.params.ss_key as string;
		const senseState = await SenseState.deleteByPk(ss_key);
		if (!senseState) throw new Error(Message.failed(['delete', 'sense state', ss_key]));

		res.status(200).json(senseState);
	});
}


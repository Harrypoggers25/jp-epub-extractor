// CONFIGS
import { WordType } from "../configs/db.config";

// MODULES
import Message from "@harrypoggers25/message";

// ROUTES
import Route from "@harrypoggers25/route";

export namespace WordTypeHandler {
	export const findAll = Route.asyncHandler(async (_, res) => {
		const wordTypes = await WordType.find();
		if (!wordTypes) throw new Error(Message.failed(['find', 'all word types']));

		res.status(200).json(wordTypes);
	});
	export const find = Route.asyncHandler(async (req, res) => {
		const wt_name = req.params.wt_name as string;
		const wordType = await WordType.findByPk(wt_name);
		if (!wordType) throw new Error(Message.failed(['find', 'word type', wt_name]));

		res.status(200).json(wordType);
	});
	export const update = Route.asyncHandler(async (req, res) => {
		const wt_name = req.params.wt_name as string;
		const { wt_description } = req.body;

		const wordType = await WordType.updateByPk(wt_name, { wt_description });
		if (!wordType) throw new Error(Message.failed(['update', 'word type', wt_name]));

		res.status(200).json(wordType);
	});
}


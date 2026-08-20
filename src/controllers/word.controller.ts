// CONFIGS
import { Word } from "../configs/db.config";

// MODULES
import Message from "@harrypoggers25/message";

// ROUTES
import Route from "@harrypoggers25/route";

export namespace WordHandler {
	export const findAll = Route.asyncHandler(async (req, res) => {
		const getQuery = (query: string) => req.query[query] ? +req.query[query] : undefined;
		const limit = getQuery('limit');
		const offset = getQuery('offset');

		const words = await Word.find({ offset, limit });
		if (!words) throw new Error(Message.failed(['find', 'all words']));

		res.status(200).json(words);
	});

	export const findMany = Route.asyncHandler(async (req, res) => {
		const w_basic_form = req.params.w_basic_form as string;
		const words = await Word.find({ like: { w_basic_form } });
		if (!words) throw new Error(Message.failed(['find', 'words', { w_basic_form }]));

		res.status(200).json(words);
	});

	export const find = Route.asyncHandler(async (req, res) => {
		const w_basic_form = req.params.w_basic_form as string;
		const wt_name = req.params.wt_name as string;

		const words = await Word.find({ where: { w_basic_form, wt_name } });
		if (!words) throw new Error(Message.failed(['find', 'words', { w_basic_form, wt_name }]));

		res.status(200).json(words);
	});

	export const remove = Route.asyncHandler(async (req, res) => {
		const w_id = +req.params.w_id;
		const word = await Word.deleteByPk(w_id);
		if (!word) throw new Error(Message.failed(['delete', 'word', w_id]));

		res.status(200).json(word);
	});
}


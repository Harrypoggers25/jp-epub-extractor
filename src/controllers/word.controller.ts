// CONFIGS
import { Word } from "../configs/db.config";

// MODULES
import Message from "@harrypoggers25/message";

// ROUTES
import Route from "@harrypoggers25/route";

export namespace WordHandler {
	export const create = Route.asyncHandler(async (req, res) => {
		const { token_ids, w_basic_form, j_response, occurence_count, wt_name } = req.body;
		const created_at = new Date();

		const word = await Word.create({ token_ids, w_basic_form, j_response, occurence_count, created_at, wt_name });
		if (!word) throw new Error(Message.failed(['create', 'word', { w_basic_form }]));

		res.status(201).json(word);
	});

	export const findAll = Route.asyncHandler(async (_, res) => {
		const words = await Word.find();
		if (!words) throw new Error(Message.failed(['find', 'all words']));

		res.status(200).json(words);
	});

	export const findMany = Route.asyncHandler(async (req, res) => {
		const w_basic_form = req.params.w_basic_form as string;
		const words = await Word.find({ like: { w_basic_form } });
		if (!words) throw new Error(Message.failed(['find', 'words', { w_basic_form }]));

		res.status(200).json(words);
	});

	export const remove = Route.asyncHandler(async (req, res) => {
		const w_id = +req.params.w_id;
		const word = await Word.deleteByPk(w_id);
		if (!word) throw new Error(Message.failed(['delete', 'word', w_id]));

		res.status(200).json(word);
	});
}


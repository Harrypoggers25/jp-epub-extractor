// CONFIGS
import { CleanedBuffer } from "../configs/db.config";

// MODULES
import Message from "@harrypoggers25/message";

// ROUTES
import Route from "@harrypoggers25/route";

export namespace CleanedBufferHandler {
	export const findAll = Route.asyncHandler(async (_, res) => {
		const words = await CleanedBuffer.find({ orderBy: { w_character_type: 'DESC', w_basic_form: 'ASC', wt_name: 'ASC' } });
		if (!words) throw new Error(Message.failed(['find', 'all words']));

		res.status(200).json(words);
	});

	export const findMany = Route.asyncHandler(async (req, res) => {
		const w_basic_form = req.params.w_basic_form as string;
		const words = await CleanedBuffer.find({ like: { w_basic_form: `${w_basic_form}%` } });
		if (!words) throw new Error(Message.failed(['find', 'words', { w_basic_form }]));

		res.status(200).json(words);
	});

	export const find = Route.asyncHandler(async (req, res) => {
		const w_basic_form = req.params.w_basic_form as string;
		const wt_name = req.params.wt_name as string;
		const words = await CleanedBuffer.find({ where: { w_basic_form, wt_name } });
		if (!words || !words.length) throw new Error(Message.failed(['find', 'word', { w_basic_form, wt_name }]));

		res.status(200).json(words[0]);
	});
}


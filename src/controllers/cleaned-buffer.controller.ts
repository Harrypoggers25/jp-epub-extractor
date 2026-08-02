// CONFIGS
import { CleanedBuffer } from "../configs/db.config";

// MODULES
import Message from "@harrypoggers25/message";

// ROUTES
import Route from "@harrypoggers25/route";

export namespace CleanedBufferHandler {
	export const findAll = Route.asyncHandler(async (_, res) => {
		const words = await CleanedBuffer.find();
		if (!words) throw new Error(Message.failed(['find', 'all words']));

		res.status(200).json(words);
	});

	export const find = Route.asyncHandler(async (req, res) => {
		const w_basic_form = req.params.w_basic_form as string;
		const words = await CleanedBuffer.find({ like: { w_basic_form: `${w_basic_form}%` } });
		if (!words) throw new Error(Message.failed(['find', 'words', { w_basic_form }]));

		res.status(200).json(words);
	});
}


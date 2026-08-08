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
}


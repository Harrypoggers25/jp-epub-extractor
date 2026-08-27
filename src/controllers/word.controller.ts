// CONFIGS
import { db, Word } from "../configs/db.config";

// MODULES
import Message from "@harrypoggers25/message";

// ROUTES
import Route from "@harrypoggers25/route";
import { transformWord } from "../services/words.service";

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
		const no_ignore = req.query.no_ignore as string | undefined;

		const words = await (async () => {
			const words = await Word.find({ where: { w_basic_form, wt_name } });
			if (!words) throw new Error(Message.failed(['find', 'words', { w_basic_form, wt_name }]));

			return no_ignore !== 'true' ? words.filter(word => !word.ignore) : words;
		})();

		res.status(200).json(words);
	});

	export const toggleIgnore = Route.asyncHandler(async (req, res) => {
		const w_basic_form = req.params.w_basic_form as string;
		const wt_name = req.params.wt_name as string;

		const word = await (async () => {
			const words = await Word.find({ where: { w_basic_form, wt_name } });
			if (!words || !words.length) throw new Error(Message.failed(['toggle', 'ignore'], { causer: ['find', 'words', { w_basic_form, wt_name }] }));

			return words[0];
		})();
		const updatedWord = await (async () => {
			const ignore = !word.ignore;
			const updateWords = await Word.update({ ignore }, { where: { w_basic_form, wt_name } });
			if (!updateWords || !updateWords.length) throw new Error(Message.failed(['toggle', 'ignore'], { causer: ['update', 'words', { w_basic_form, wt_name }] }));

			return updateWords[0];
		})();

		res.status(200).json(updatedWord);
	});

	export const transform = Route.asyncHandler(async (req, res) => {
		const w_basic_form = req.params.w_basic_form as string;
		const wt_name = req.params.wt_name as string;

		const words = await Word.find();
		if (!words) throw new Error(Message.failed(['transform', 'words', { w_basic_form, wt_name }], {
			causer: ['find', 'all words']
		}));

		const targetWord = await (async () => {
			const wordBuffers = await Word.find({ where: { w_basic_form, wt_name } });
			if (!wordBuffers || !wordBuffers.length) throw new Error(Message.failed(['transform', 'words', { w_basic_form, wt_name }], {
				causer: ['find', 'target word', { w_basic_form, wt_name }]
			}));

			return wordBuffers[0];
		})();

		const { top, bottom } = transformWord(words, targetWord);
		res.status(200).json({ top, bottom });
	});

	export const merge = Route.asyncHandler(async (req, res) => {
		const es_id1 = req.params.es_id1 as string; // merger
		const es_id2 = req.params.es_id2 as string; // mergee
		const transaction = await db.transaction();

		const deletedWord = await (async () => {
			const [w_basic_form, wt_name] = es_id1.split('_');
			const words = await Word.delete({ where: { w_basic_form, wt_name }, transaction });
			if (!words || !words.length) throw new Error(Message.failed(['delete', 'words', { w_basic_form, wt_name }]));

			return words[0];
		})();
		const word = await (async () => {
			const [w_basic_form, wt_name] = es_id2.split('_');
			const words = await Word.find({ where: { w_basic_form, wt_name }, transaction });
			if (!words || !words.length) throw new Error(Message.failed(['find', 'words', { w_basic_form, wt_name }]));

			return words[0];
		})();
		const updatedWord = await (async () => {
			const { w_basic_form, wt_name } = word;
			const { token_ids, occurrence_count } = (() => {
				const token_ids = new Set(word.token_ids.split(',').map(token_id => +token_id));
				deletedWord.token_ids.split(',').forEach(token_id => {
					token_ids.add(+token_id);
				});

				return {
					token_ids: Array.from(token_ids).sort((a, b) => a - b).join(','),
					occurrence_count: word.occurrence_count + deletedWord.occurrence_count
				}
			})();
			const words = await Word.update({ token_ids, occurrence_count }, { where: { w_basic_form, wt_name }, transaction });
			if (!words || !words.length) throw new Error(Message.failed(['update', 'word', { w_basic_form, wt_name }]));

			return words[0];
		})();

		await transaction.commit();
		res.status(200).json(updatedWord);
	});
}


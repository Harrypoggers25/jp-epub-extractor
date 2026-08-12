// CONFIGS
import { JishoBuffer, WordBuffer } from "../configs/db.config";

// MODULES
import Message from "@harrypoggers25/message";

// ROUTES
import Route from "@harrypoggers25/route";
import Jisho from "../services/jisho.service";
import { IJishoReducedWord, IJishoWord } from "../helpers/jisho.helper";
import { ITokenPositions } from "../helpers/book.helper";

export namespace WordBufferHandler {
	export const findAll = Route.asyncHandler(async (_, res) => {
		const words = await WordBuffer.find({ orderBy: { w_character_type: 'DESC', w_basic_form: 'ASC', wt_name: 'ASC' } });
		if (!words) throw new Error(Message.failed(['find', 'all words']));

		res.status(200).json(words);
	});

	export const findMany = Route.asyncHandler(async (req, res) => {
		const w_basic_form = req.params.w_basic_form as string;
		const words = await WordBuffer.find({ like: { w_basic_form: `${w_basic_form}%` } });
		if (!words) throw new Error(Message.failed(['find', 'words', { w_basic_form }]));

		res.status(200).json(words);
	});

	export const find = Route.asyncHandler(async (req, res) => {
		const w_basic_form = req.params.w_basic_form as string;
		const wt_name = req.params.wt_name as string;
		const words = await WordBuffer.find({ where: { w_basic_form, wt_name } });
		if (!words || !words.length) throw new Error(Message.failed(['find', 'word', { w_basic_form, wt_name }]));

		res.status(200).json(words[0]);
	});

	export const filter = Route.asyncEventStreamHandler(async (_, res, write) => {
		const jishoBuffers = await JishoBuffer.find({ orderBy: { wt_name: 'ASC', w_basic_form: 'ASC' } });
		if (!jishoBuffers) throw new Error(Message.failed(['filter', 'word buffer'], {
			causer: ['find', 'all jisho buffer']
		}));

		const startTime = Date.now();
		const word_forms = (res: IJishoReducedWord): Array<string> => [...res.japanese.map(Object.values).flat(), res.slug];
		write({ percentage: '0%', message: 'Filtering jisho entries into word buffer', t_elapsed_ms: 0 });
		for (let i = 0; i < jishoBuffers.length; i++) {
			const percentage = `${Math.round((i + 1) / jishoBuffers.length * 100 * 100) / 100}%`;

			const { token_ids, w_basic_form, token_positions, wt_name } = jishoBuffers[i];
			const wordBuffers = await WordBuffer.find({ where: { w_basic_form, wt_name } });
			if (wordBuffers?.length) {
				write({ percentage, message: `Skipped filtering existing word entry for ${w_basic_form} - ${wt_name}`, t_elapsed_ms: Date.now() - startTime });
				continue;
			}

			const w_character_type = Jisho.characterType(w_basic_form);
			const created_at = new Date();
			const j_response = (() => {
				const j_response = (JSON.parse(jishoBuffers[i].j_response) as Array<IJishoWord>).map(res => Jisho.reduceWord(res));
				if (!j_response.length) return jishoBuffers[i].j_response;

				const j_response_new = j_response.filter(entry => word_forms(entry).includes(jishoBuffers[i].w_basic_form));
				if (j_response_new.length) return JSON.stringify(j_response_new);

				return jishoBuffers[i].j_response;
			})();
			const occurrence_count = (() => {
				let count = 0;
				Object.values(JSON.parse(token_positions) as ITokenPositions).forEach(val => {
					count += val.length;
				});
				return count;
			})();
			const wordBuffer = await WordBuffer.create({ token_ids, w_basic_form, w_character_type, j_response, token_positions, occurrence_count, created_at, wt_name });
			if (!wordBuffer) throw new Error(Message.failed(['create', 'word buffer', { w_basic_form, wt_name }]));

			write({ percentage, message: `Filtered word entry for ${w_basic_form} - ${wt_name}`, t_elapsed_ms: Date.now() - startTime });
		}
		write({ percentage: '100%', message: 'Successfully filtered jisho entries into word buffer', t_elapsed_ms: Date.now() - startTime, success: true });
		res.end();
	});
}


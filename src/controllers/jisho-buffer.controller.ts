// CONFIGS
import { JishoBuffer, TokenBuffer } from "../configs/db.config";

// MODULES
import Message from "@harrypoggers25/message";

// ROUTES
import Route from "@harrypoggers25/route";
import { ITokenPositions } from "../helpers/book.helper";
import Jisho from "../services/jisho.service";

export namespace JishoBufferHandler {
	export const load = Route.asyncEventStreamHandler(async (_, res, write) => {
		const tokens = await TokenBuffer.find({ orderBy: { w_basic_form: 'ASC', wt_name: 'ASC', token_positions: 'ASC' } });
		if (!tokens) throw new Error(Message.failed(['load', 'jisho buffer'], { causer: ['find', 'tokens'] }));

		const startTime = Date.now();
		const sortTokenId = (token_ids: string) => token_ids.split(',').map(token_id => +token_id).sort((a, b) => a - b).join(',');
		write({ percentage: '0%', Message: 'Loading jisho entry into buffer', t_elapsed_ms: 0 });
		for (let i = 0; i < tokens.length; i++) {
			const percentage = `${Math.round((i + 1) / tokens.length * 100 * 100) / 100}%`;

			const { token_id, w_basic_form, wt_name } = tokens[i];
			const created_at = new Date();

			const jishoBuffers = await JishoBuffer.find({ where: { w_basic_form, wt_name } });
			if (!jishoBuffers) throw new Error(Message.failed(['load', 'jisho buffer', { w_basic_form, wt_name }], {
				causer: ['find', 'jisho buffer']
			}));
			if (!jishoBuffers.length) {
				const token_ids = `${token_id}`;
				const token_positions = tokens[i].token_positions;
				const j_response = await (async () => {
					const j_response = await Jisho.search(w_basic_form);
					if (!j_response) throw new Error(Message.failed(['load', 'jisho buffer', { w_basic_form, wt_name }], {
						subMessage: `Unable to search for keyword ${w_basic_form} after 3 attempts`
					}));

					return JSON.stringify(j_response);
				})();
				const jishoBuffer = await JishoBuffer.create({ token_ids, w_basic_form, wt_name, token_positions, j_response, created_at });
				if (!jishoBuffer) throw new Error(Message.failed(['load', 'jisho buffer'], {
					causer: ['create', 'jisho buffer', { token_ids }]
				}));

				write({ percentage, message: `Created jisho entry for ${w_basic_form} - ${wt_name}`, t_elapsed_ms: Date.now() - startTime });
				continue;
			}

			const token_ids = (() => {
				const token_ids = jishoBuffers[0].token_ids.split(',');
				if (token_ids.includes(`${token_id}`)) return jishoBuffers[0].token_ids;

				return sortTokenId(`${token_ids},${token_ids}`);
			})();
			const token_positions = (() => {
				const token_positions = JSON.parse(jishoBuffers[0].token_positions) as ITokenPositions;
				for (const [section_no, sentences] of Object.entries(JSON.parse(tokens[i].token_positions) as ITokenPositions)) {
					const token_position = !token_positions[+section_no] ? [] : token_positions[+section_no];
					for (const sentence_no of sentences) {
						if (!token_position.includes(sentence_no)) token_position.push(sentence_no);
					}
					token_positions[+section_no] = token_position.sort((a, b) => a - b);
				}
				return JSON.stringify(token_positions);
			})();

			const jishoBuffer = await JishoBuffer.update({ token_ids, token_positions }, { where: { w_basic_form, wt_name } });
			if (!jishoBuffer) throw new Error(Message.failed(['load', 'jisho buffer'], {
				causer: ['update', 'jisho buffer', { token_ids }]
			}));
			write({ percentage, message: `Merged jisho entry for ${w_basic_form} - ${wt_name}`, t_elapsed_ms: Date.now() - startTime });
		}
		write({ percentage: '100%', message: 'Successfully loaded jisho entries into buffer', t_elapsed_ms: Date.now() - startTime, success: true });
		res.end();
	});
	export const removeAll = Route.asyncHandler(async (req, res) => {
		const jishoBuffers = await JishoBuffer.delete();
		if (jishoBuffers) throw new Error(Message.failed(['delete', 'all jisho buffers']));

		res.status(200).json(jishoBuffers);
	});
}

// CONFIGS
import { JishoBuffer, CleanedBuffer, WordBuffer } from "../configs/db.config";

// MODULES
import axiosBuilder from "axios";
import ch from "@harrypoggers25/color-utils";
import env from "../configs/env.config";
import Message from "@harrypoggers25/message";

// HELPERS
import { asyncHandler, displayProgress } from "../helpers";
import { IJishoReducedWord, IJishoWord, MapWordType } from "../helpers/jisho.helper";

const axios = axiosBuilder.create({ timeout: 10000, headers: { 'User-Agent': env.AXIOS_USER_AGENT } });

namespace Jisho {
	export const API_URL = 'https://jisho.org/api/v1/search/words?keyword=';

	export function reduceWord(word: IJishoWord): IJishoReducedWord {
		return {
			slug: word.slug,
			is_common: word.is_common,
			tags: word.tags,
			jlpt: !word.jlpt.length ? undefined : word.jlpt.sort()[word.jlpt.length - 1].replace('jlpt-', '').toUpperCase(),
			japanese: word.japanese,
			senses: word.senses.map(sense => ({
				english_definitions: sense.english_definitions,
				parts_of_speech: sense.parts_of_speech,
				tags: sense.tags
			}))
		}
	}

	export const search = async (word: string) => {
		return asyncHandler('jisho search', async () => {
			const url = `${API_URL}${word}`;
			const response = await axios.get(url);
			if (response.status !== 200) throw new Error(Message.failed(['find', `search result for ${word}`]));

			const data = response.data;
			const words = data.data as Array<IJishoWord>;

			return words;
		});
	}

	export async function loadBuffer(words: Array<ReturnType<typeof WordBuffer.getEmptyModel>>) {
		await JishoBuffer.delete();

		let errorCount = 0;
		displayProgress(0, words.length);
		for (let i = 0; i < words.length; i++) {
			const { token_id, w_basic_form, wt_name } = words[i];
			let { count } = words[i];
			const created_at = new Date();
			try {
				const jishoBuffers = await JishoBuffer.find({ where: { w_basic_form, wt_name } });
				if (!jishoBuffers) throw new Error(`Failed to search keyword ${w_basic_form}. Unable to find word buffer`);

				if (!jishoBuffers.length) {
					const response = await Jisho.search(w_basic_form);
					if (!response) throw new Error(`Failed to search keyword ${w_basic_form}`);

					const token_ids = `${token_id}`;
					const j_response = JSON.stringify(response);
					const jishoBuffer = await JishoBuffer.create(
						{ token_ids, w_basic_form, wt_name, j_response, count, created_at }
					);
					if (!jishoBuffer) throw new Error(`Failed to search keyword ${w_basic_form}`);
				} else {
					const token_ids = `${jishoBuffers[0].token_ids},${token_id}`;
					count = jishoBuffers[0].count + count;
					const jishoBuffer = await JishoBuffer.update({ token_ids, count }, { where: { w_basic_form, wt_name } });
					if (!jishoBuffer) throw new Error(`Failed to search keyword ${w_basic_form}`);
				}
			} catch (error: any) {
				console.log(ch.red(`JISHO LOAD_BUFFER ERROR[${errorCount}]:`), error.message ?? error);
				errorCount += 1;
			} finally {
				displayProgress(i + 1, words.length);
				await new Promise(resolve => setTimeout(resolve, 250));
			}
		}
	}

	export async function filterWord(buffers: Array<ReturnType<typeof JishoBuffer.getEmptyModel>>) {
		await CleanedBuffer.delete();
		for (const buffer of buffers) {
			const { token_ids, w_basic_form, count, wt_name } = buffer;
			const created_at = new Date();
			const response = (JSON.parse(buffer.j_response) as Array<IJishoWord>).map(res => Jisho.reduceWord(res));
			if (!response.length) {
				await CleanedBuffer.create({ token_ids, w_basic_form, j_response: buffer.j_response, j_response_count: 0, count, j_response_state: 1, wt_name, created_at });
				continue;
			}

			const isValidWordType = (res: IJishoReducedWord) => MapWordType[wt_name].some(pos => res.senses.some(sense => sense.parts_of_speech.includes(pos)));
			const word_forms = (res: IJishoReducedWord): Array<string> => [...res.japanese.map(Object.values).flat(), res.slug];
			const { new_response, j_response_state } = (() => {
				const new_response1 = response.filter(res => isValidWordType(res) && word_forms(res).includes(buffer.w_basic_form));
				if (new_response1.length !== 0) return { new_response: new_response1, j_response_state: 1 };

				const new_response2 = response.filter(res => word_forms(res).includes(buffer.w_basic_form));
				if (new_response2.length !== 0) return { new_response: new_response2, j_response_state: 2 };

				return { new_response: response, j_response_state: 3 };
			})();
			const j_response = JSON.stringify(new_response);
			const j_response_count = new_response.length;
			if (response.length !== j_response_count && j_response_count === 0) console.log(ch.yellow(`${w_basic_form} [${wt_name}]:`), `Before: ${ch.green(response.length)}, After: ${ch.green(j_response_count)}, Difference: ${ch.green(response.length - j_response_count)}`);
			await CleanedBuffer.create({ token_ids, w_basic_form, j_response, j_response_count, count, j_response_state, wt_name, created_at });
		}

		console.log(ch.green('JISHO WORD FILTER:'), 'successfully filtered word into words table');
	}
}

export default Jisho;

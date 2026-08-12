// CONFIGS
import { JishoBuffer, WordBuffer, ITokenBuffer } from "../configs/db.config";

// MODULES
import axiosBuilder from "axios";
import env from "../configs/env.config";
import { isKatakana, isHiragana, isKanji } from "wanakana";

// HELPERS
import { asyncHandler } from "../helpers";
import { IJishoReducedWord, IJishoWord } from "../helpers/jisho.helper";

const axios = axiosBuilder.create({ timeout: 10000, headers: { 'User-Agent': env.AXIOS_USER_AGENT } });

namespace Jisho {
	export const API_URL = 'https://jisho.org/api/v1/search/words?keyword=';

	export const search = async (text: string) => {
		return await asyncHandler('jisho search', async () => {
			const url = `${API_URL}${text}`;
			for (let i = 0; i < 3; i++) {
				const response = await axios.get(url);
				if (response.status !== 200) {
					await new Promise(resolve => setTimeout(resolve, 250));
					continue;
				}

				await new Promise(resolve => setTimeout(resolve, 250));
				const data = response.data;
				const words = data.data as Array<IJishoWord>;

				return words;
			}
			return;
		});
	}

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

	export function characterType(w_basic_form: string): 'kanji' | 'katakana' | 'hiragana' | 'others' {
		const chars = w_basic_form.split('');
		if (chars.every(c => isHiragana(c))) return 'hiragana';
		if (chars.every(c => isKatakana(c))) return 'katakana';
		if (chars.every(c => isHiragana(c) || isKanji(c))) return 'kanji'
		return 'others';
	}

	// export async function filterWord(buffers: Array<ReturnType<typeof JishoBuffer.getEmptyModel>>, filterType: boolean = false) {
	// 	await WordBuffer.delete();
	// 	for (const buffer of buffers) {
	// 		const { token_ids, w_basic_form, token_positions, wt_name } = buffer;
	// 		const w_character_type = Jisho.characterType(w_basic_form);
	// 		const created_at = new Date();
	// 		const response = (JSON.parse(buffer.j_response) as Array<IJishoWord>).map(res => Jisho.reduceWord(res));
	// 		if (!response.length) {
	// 			await WordBuffer.create({ token_ids, w_basic_form, w_character_type, j_response: buffer.j_response, token_positions, j_response_state: 1, wt_name, created_at });
	// 			continue;
	// 		}
	//
	// 		const isValidWordType = (res: IJishoReducedWord) => MapWordType[wt_name].some(pos => res.senses.some(sense => sense.parts_of_speech.includes(pos)));
	// 		const word_forms = (res: IJishoReducedWord): Array<string> => [...res.japanese.map(Object.values).flat(), res.slug];
	// 		const { new_response, j_response_state } = (() => {
	// 			if (filterType) {
	// 				const new_response1 = response.filter(res => isValidWordType(res) && word_forms(res).includes(buffer.w_basic_form));
	// 				if (new_response1.length !== 0) return { new_response: new_response1, j_response_state: 1 };
	// 			}
	//
	// 			const new_response2 = response.filter(res => word_forms(res).includes(buffer.w_basic_form));
	// 			if (new_response2.length !== 0) return { new_response: new_response2, j_response_state: 2 };
	//
	// 			return { new_response: response, j_response_state: 3 };
	// 		})();
	// 		const j_response = JSON.stringify(new_response);
	// 		const j_response_count = new_response.length;
	// 		await WordBuffer.create({ token_ids, w_basic_form, w_character_type, j_response, token_positions, j_response_state, wt_name, created_at });
	// 	}
	//
	// 	console.log(ch.green('JISHO WORD FILTER:'), 'successfully filtered token into jisho buffer table');
	// }
}

export default Jisho;

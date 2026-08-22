// CONFIGS
import { IEntryState, IWordBuffer } from "../configs/db.config";

// HELPERS
import { IJishoReducedWord } from "../helpers/jisho.helper";

export type TransformedWordBuffers = { top: Array<IWordBuffer>, bottom: Array<IWordBuffer> };
export function transformWordBuffer(wordBuffers: Array<IWordBuffer>, entryStates: Array<IEntryState>, es_id: string, state?: Array<number>): TransformedWordBuffers {
	const [w_basic_form, wt_name] = es_id.split('_');
	const entries = Object.fromEntries(entryStates.map(entryState => {
		const { es_id, state, ignore, unsure, can_merge, merged_with } = entryState;
		return [es_id, { state, ignore, unsure, can_merge, merged_with }];
	}));

	const isTargetWord = (wordBuffer: IWordBuffer) => wordBuffer.w_basic_form === w_basic_form && wordBuffer.wt_name === wt_name;
	const getState = (es_id: string) => {
		const state = entries[es_id]?.state;
		return state ? JSON.parse(state) as Array<number> : undefined;
	}
	const getEntries = (wordBuffer: IWordBuffer, state: Array<number>) => {
		const j_response = JSON.parse(wordBuffer.j_response) as Array<IJishoReducedWord>;
		return j_response.filter((_, i) => Array.from(state).includes(i));
	}
	const isMergedWord = (es_id: string) => {
		const entry = entries[es_id];
		return entry && entry.merged_with;
	}

	const filteredWords = wordBuffers.filter(wordBuffer => !isTargetWord(wordBuffer));
	const [targetWord] = wordBuffers.filter(isTargetWord);
	const targetState = state ?? getState(es_id);
	if (!targetState || !targetState.length) return { top: [], bottom: filteredWords };

	const targetEntries = getEntries(targetWord, targetState);
	const isTopWord = (wordBuffer: IWordBuffer) => {
		const { w_basic_form, wt_name } = wordBuffer;
		const es_id = `${w_basic_form}_${wt_name}`;
		if (isMergedWord(es_id)) return false;

		const state = getState(es_id);
		if (!state) return false;

		const entries = getEntries(wordBuffer, state);
		return targetEntries.every(targetEntry => entries.some(entry => entry.slug === targetEntry.slug));
	};

	return { top: filteredWords.filter(isTopWord), bottom: filteredWords.filter(WordBuffer => !isTopWord(WordBuffer)) };
}

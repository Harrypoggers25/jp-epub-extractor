export type PosType = '助動詞' | '助詞' | '記号' | 'フィラー' | 'その他' | '接続詞' | '連体詞' | '名詞' | '動詞' | '副詞' | '接頭詞' | '形容詞' | '感動詞';

export interface ISection { filename: string, content: string };
export interface IBook extends Array<ISection> { };
export interface IToken {
	word_id: number,
	word_type: 'KNOWN' | 'UNKNOWN',
	word_position: number,
	surface_form: string,
	pos: PosType,
	pos_detail_1: string,
	pos_detail_2: string,
	pos_detail_3: string,
	conjugated_type: string,
	conjugated_form: string,
	basic_form: string,
	reading: string,
	pronunciation: string
}

export interface IParsedSection { filename: string, sentences: Array<string> };
export interface IParsedBook extends Array<IParsedSection> { };
export interface IParsedToken {
	token_id: number,
	wt_name: string,
	w_basic_form: string,
	w_reading?: string,
	w_pos_details: string,
	wt_description: string,
	surface_form: string,
};

export interface ITokenPositions extends Record<number, Array<number>> { };

export const PosDesc: Record<PosType, string> = {
	'助動詞': 'Auxiliary verbs',
	'助詞': 'Particles',
	'記号': 'Symbols',
	'フィラー': 'Fillers',
	'その他': 'Others',
	'接続詞': 'Conjunction',
	'連体詞': 'Pre-noun adjectival',
	'名詞': 'Noun',
	'動詞': 'Verb',
	'副詞': 'Adverb',
	'接頭詞': 'Prefix',
	'形容詞': 'I-Adjective',
	'感動詞': 'Interjection',
};

export type ExtractBookOptions = { sections?: Array<string>, filteredPos?: Array<PosType>, showDuplicate?: boolean };

export function mergeTokenPositions(a: ITokenPositions, b: ITokenPositions): ITokenPositions {
	const map = new Map<number, number[]>();

	for (const positions of [a, b]) {
		for (const [key, values] of Object.entries(positions)) {
			const k = Number(key);
			map.set(k, [...(map.get(k) ?? []), ...values]);
		}
	}

	return Object.fromEntries(
		[...map.entries()]
			.sort(([a], [b]) => a - b)
			.map(([key, values]) => [key, values.sort((a, b) => a - b)]),
	) as ITokenPositions;
}

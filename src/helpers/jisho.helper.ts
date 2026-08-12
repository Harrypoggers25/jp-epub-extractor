export interface IJishoSense {
	english_definitions: Array<string>,
	parts_of_speech: Array<string>,
	links: Array<{ text: string, url: string }>,
	tags: Array<string>,
	restrictions: Array<string>,
	see_also: Array<string>,
	antonyms: Array<string>,
	source: Array<string>,
	info: Array<string>
}
export interface IJishoWord {
	slug: string;
	is_common: boolean;
	tags: Array<string>;
	jlpt: Array<string>;
	japanese: Array<{ word?: string, reading: string }>;
	senses: Array<IJishoSense>,
	attribution: { jmdict: boolean, jmnedict: boolean, dbpedia: boolean }
}

export interface IJishoReducedSense {
	english_definitions: Array<string>,
	parts_of_speech: Array<string>,
	tags: Array<string>,
}
export interface IJishoReducedWord {
	slug: string;
	is_common: boolean;
	tags: Array<string>;
	jlpt?: string;
	japanese: Array<{ word?: string, reading: string }>;
	senses: Array<IJishoReducedSense>,
}

export const MapPos = {
	adverb: [
		'Adverb (fukushi)',
		"Adverb taking the 'to' particle",
	],
	noun: [
		'Company',
		'Full name',
		'Noun',
		'Noun, used as a suffix',
		"Noun which may take the genitive case particle 'no'",
		'Numeric',
		'Organization',
		'Place',
		'Pronoun',
		'Product',
	],
	verb_u: [
		"Godan verb with 'u' ending",
		"Godan verb with 'ru' ending (irregular verb)",
		"Godan verb with 'su' ending",
		"Godan verb with 'ru' ending",
		"Godan verb with 'u' ending (special class)",
		'Godan verb - Iku/Yuku special class',
		"Godan verb with 'bu' ending",
		"Godan verb with 'ku' ending",
		"Godan verb with 'gu' ending",
		"Godan verb with 'mu' ending",
		"Godan verb with 'tsu' ending",
		'Godan verb - -aru special class',
		"Godan verb with 'nu' ending",
	],
	verb_suru: [
		'Suru verb',
		'Suru verb - included',
		'Suru verb - special class',
	],
	verb_ru: [
		'Ichidan verb',
		'Ichidan verb - kureru special class',
		'Ichidan verb - zuru verb (alternative form of -jiru verbs)',
	],
	verb_kuru: [
		'Kuru verb - special class',
	],
	adjective_i: [
		'I-adjective (keiyoushi)',
		'I-Adjective (keiyoushi) - yoi/ii class',
	],
	adjective_na: [
		'Na-adjective (keiyodoshi)',
		'Archaic/formal form of na-adjective',
	],
	intransitive_verb: [
		'Intransitive verb',
	],
	transitive_verb: [
		'Transitive verb',
	],
	counter: [
		'Counter',
	],
	auxiliary: [
		'Auxiliary',
		'Auxiliary adjective',
		'Auxiliary verb',
	],
	particle: [
		'Particle',
	],
	prefix: [
		'Noun, used as a prefix',
		'Prefix',
	],
	suffix: [
		'Suffix',
	],
	pre_noun_adjectival: [
		'Pre-noun adjectival (rentaishi)',
	],
	conjunction: [
		'Conjunction',
	],
	copula: [
		'Copula',
	],
	others: [
		'Expressions (phrases, clauses, etc.)',
		"Nidan verb (upper class) with 'gu' ending (archaic)",
		"Nidan verb (lower class) with 'zu' ending (archaic)",
		"Nidan verb (upper class) with 'ku' ending (archaic)",
		"Nidan verb (lower class) with 'ku' ending (archaic)",
		"Nidan verb with 'u' ending (archaic)",
		"Nidan verb (upper class) with 'hu/fu' ending (archaic)",
		"Nidan verb (lower class) with 'ru' ending (archaic)",
		"Nidan verb (upper class) with 'ru' ending (archaic)",
		"Nidan verb (lower class) with 'tsu' ending (archaic)",
		'Noun or verb acting prenominally',
		'Su verb - precursor to the modern suru',
		'Unclassified',
		"Yodan verb with 'ku' ending (archaic)",
		"Yodan verb with 'ru' ending (archaic)",
		'Wikipedia definition',
		"'taru' adjective",
	],
};

export const MapWordType: Record<string, Array<string>> = {
	'副詞': MapPos.adverb,
	'名詞': [
		...MapPos.noun,
		...MapPos.adjective_na,
	],
	'動詞': [
		...MapPos.verb_u,
		...MapPos.verb_ru,
		...MapPos.verb_suru,
		...MapPos.verb_kuru,
		...MapPos.intransitive_verb,
		...MapPos.transitive_verb,
	],
	'助動詞': MapPos.auxiliary,
	'形容詞': MapPos.adjective_i,
	'接続詞': MapPos.conjunction,
	'連体詞': MapPos.pre_noun_adjectival,
	'接頭詞': MapPos.prefix,
	'助詞': MapPos.particle,
	// 'フィラー': 'Fillers',
	// '感動詞': 'Interjection',
	// '記号': 'Symbols',
	// 'その他': 'Others',
};

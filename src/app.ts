// CONFIGS
import { db, JishoBuffer } from "./configs/db.config";

// HELPERS
import { IJishoWord } from "./helpers/jisho.helper";

// SERVICES
import Jisho from "./services/jisho.service";
import { PosType } from "./helpers/book.helper";

const filteredPos: Array<PosType> = ['感動詞', '連体詞', '助動詞', '助詞', '記号', 'フィラー', 'その他'];
const fileName = 'epubs/book.epub';
const sections = [
	'text/part0003_split_000.html',
	'text/part0003_split_001.html',
	'text/part0004.html',
];

// const MapWordType = {
// 	'助動詞': 'Auxiliary verbs',
// 	'助詞': 'Particles',
// 	'記号': 'Symbols',
// 	'フィラー': 'Fillers',
// 	'その他': 'Others',
// 	'接続詞': 'Conjunction',
// 	'連体詞': 'Pre-noun adjectival',
// 	'名詞': 'Noun',
// 	'動詞': 'Verb',
// 	'副詞': 'Adverb',
// 	'接頭詞': 'Prefix',
// 	'形容詞': 'I-Adjective',
// 	'感動詞': 'Interjection',
// };

(async () => {
	await db.sync({ alter: false });

	const buffers = await JishoBuffer.find();
	if (!buffers) return;

	const result: Set<string> = new Set();
	for (const buffer of buffers) {
		const response = (JSON.parse(buffer.j_response) as Array<IJishoWord>).map(res => Jisho.reduceWord(res));
		if (!response.length) continue;

		// if (buffer.w_basic_form === 'やがて') {
		// 	console.log(buffer.w_basic_form);
		// 	console.dir(response, { depth: null });
		// }
		(() => {
			for (const res of response) {
				// if (res.jlpt) console.log(res);

				for (const sense of res.senses) {
					if (sense.parts_of_speech.includes("Copula")) {
						console.dir(res, { depth: null });
						return;
					}
					// for (const pos of sense.info) {
					// 	result.add(pos);
					// }
				}
			}
		})()
	}

	Array.from(result).sort().forEach(val => console.log(val));
})()

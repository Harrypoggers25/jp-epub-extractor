// MODULES
import Db, { DataTypes } from '@harrypoggers25/db-postgresql';
import env from './env.config.js';

export const db = Db.config({
	user: env.DB_USER,
	host: env.DB_HOST,
	database: env.DB_NAME,
	password: env.DB_PASSWORD,
	port: env.DB_PORT
});

export const WordType = db.define('word_types', {
	wt_name: { type: DataTypes.VARCHAR(511), allowNull: false, primaryKey: true },
	wt_description: { type: DataTypes.TEXT, allowNull: true },
	created_at: { type: DataTypes.TIMESTAMP, allowNull: false },
});
export interface IWordType extends ReturnType<typeof WordType.getEmptyModel> { };

export const WordBuffer = db.define('word_buffers', {
	token_id: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true },
	w_basic_form: { type: DataTypes.VARCHAR(511), allowNull: false },
	w_reading: { type: DataTypes.VARCHAR(511), allowNull: false },
	w_pos_details: { type: DataTypes.VARCHAR(1023), allowNull: false },
	count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
	created_at: { type: DataTypes.TIMESTAMP, allowNull: false },
	wt_name: { type: DataTypes.VARCHAR(511), allowNull: false },
});
WordBuffer.setForeignKey(WordType, 'wt_name');
export interface IWordBuffer extends ReturnType<typeof WordBuffer.getEmptyModel> { };

export const JishoBuffer = db.define('jisho_buffers', {
	token_ids: { type: DataTypes.TEXT, allowNull: false },
	w_basic_form: { type: DataTypes.VARCHAR(511), allowNull: false },
	j_response: { type: DataTypes.TEXT, allowNull: false },
	count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
	created_at: { type: DataTypes.TIMESTAMP, allowNull: false },
	wt_name: { type: DataTypes.VARCHAR(511), allowNull: false },
});
JishoBuffer.setForeignKey(WordType, 'wt_name');
export interface IJishoBuffer extends ReturnType<typeof JishoBuffer.getEmptyModel> { };

export const JishoResponseState = db.define('jisho_response_states', {
	j_response_state: { type: DataTypes.SERIAL, allowNull: false, primaryKey: true },
	description: { type: DataTypes.TEXT, allowNull: false },
});

export const CleanedBuffer = db.define('cleaned_buffers', {
	token_ids: { type: DataTypes.TEXT, allowNull: false },
	w_basic_form: { type: DataTypes.VARCHAR(511), allowNull: false },
	j_response: { type: DataTypes.TEXT, allowNull: false },
	j_response_state: { type: DataTypes.INTEGER, allowNull: false },
	j_response_count: { type: DataTypes.INTEGER, allowNull: false },
	count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
	created_at: { type: DataTypes.TIMESTAMP, allowNull: false },
	wt_name: { type: DataTypes.VARCHAR(511), allowNull: false },
});
CleanedBuffer.setForeignKey(JishoResponseState, 'j_response_state');
CleanedBuffer.setForeignKey(WordType, 'wt_name');
export interface ICleanedBuffer extends ReturnType<typeof CleanedBuffer.getEmptyModel> { };

export const Word = db.define('words', {
	token_ids: { type: DataTypes.TEXT, allowNull: false },
	w_basic_form: { type: DataTypes.VARCHAR(511), allowNull: false },
	j_response: { type: DataTypes.TEXT, allowNull: false },
	count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
	created_at: { type: DataTypes.TIMESTAMP, allowNull: false },
});


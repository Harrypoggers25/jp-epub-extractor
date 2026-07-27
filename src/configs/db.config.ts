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

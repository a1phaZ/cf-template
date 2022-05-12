import { driver } from '../database';
import { Types } from 'ydb-sdk';
import { cryptField, TableDescription2 } from './helpers';
import { v4 as uuidv4 } from 'uuid';

export async function createClientTable(apiKey: string) {
	await driver.tableClient.withSession(async (session) => {
		await session.dropTable(`${apiKey}`);

		await session.createTable(
			`${apiKey}`,

			new TableDescription2()
				.withColumns2([
					{ n: 'products_id', t: Types.UTF8 },
					{ n: 'products_name', t: Types.UTF8 },
					{ n: 'price_baz', t: Types.DOUBLE },
				])
				.withPrimaryKey('products_id'),
		);
	});
}

export async function insertValues(apiKey: string, data: unknown) {
	// для первичного ключа отлично подходит uuid
	// UPSERT и REPLACE являются операциями модификации данных, которые не требует их предварительного чтения, за счет чего работают быстрее и дешевле других операций.
	const query = `
    upsert INTO ${apiKey} (id, '${getKeys(data)}')
    VALUES ('${uuidv4()}', '${getValues(data)}');
  `;

	await driver.tableClient.withSession(async (session) => {
		await session.executeQuery(query);
	});
}

function getKeys(data: unknown): string {
	return Object.keys(data).join(', ');
}

function getValues(data: unknown): string {
	const result = Object.keys(data).reduce((acc, cur) => {
		const val = cur === 'password' ? cryptField('secret', data[cur]) : data[cur];
		return [...acc, val];
	}, []);
	return result.join(', ');
}

import { asyncHandler } from "./tools.helper.js";

export const CleanedBuffer = {
	find: async (w_basic_form) => {
		return await asyncHandler('FIND WORDS', async () => {
			const url = !w_basic_form ? '/api/cleaned-buffers' : `/api/cleaned-buffers/${w_basic_form}`
			const response = await fetch(url, { method: 'GET' });
			if (!response) throw new Error('Failed to find words. Internal error');

			const words = await response.json();
			if (!words) throw new Error('Failed to find words. Unable to find data');

			return words;
		});
	}
}

export const SenseState = {
	init: () => ({ state: new Set(), ignore: false, unsure: false, merged_with: null }),
	create: async (body) => {
		return await asyncHandler('CREATE SENSE STATE', async () => {
			const response = await fetch('/api/sense-states', {
				method: 'POST',
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			if (!response.ok) throw new Error(`Failed to create sense state. Internal error`);

			const senseState = await response.json();
			if (!senseState) throw new Error(`Failed to create sense state. Unable to create data`);

			return senseState;
		});
	},
	findAll: async () => {
		return await asyncHandler('FIND ALL SENSE STATES', async () => {
			const response = await fetch('/api/sense-states', { method: 'GET', });
			if (!response.ok) throw new Error(`Failed to find all sense states. Internal error`);

			const senseStates = await response.json();
			if (!senseStates) throw new Error(`Failed to find all sense states. Unable to find data`);

			return senseStates;
		})
	},
	update: async (ss_key, body) => {
		return await asyncHandler('UPDATE SENSE STATE', async () => {
			const response = await fetch(`/api/sense-states/${ss_key}`, {
				method: 'PATCH',
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			if (!response.ok) throw new Error(`Failed to update sense state [${ss_key}]. Internal error`);

			const senseState = await response.json();
			if (!senseState) throw new Error(`Failed to update sense state [${ss_key}]. Unable to update data`);

			return senseState;
		});
	},
	removeAll: async () => {
		return await asyncHandler('DELETE ALL SENSE STATE', async () => {
			const response = await fetch('/api/sense-states', { method: 'DELETE' });
			if (!response.ok) throw new Error(`Failed to delete all sense states. Internal error`);

			const senseStates = await response.json();
			if (!senseStates) throw new Error(`Failed to delete all sense states. Unable to delete data`);

			return senseStates;
		});
	},
	remove: async (ss_key) => {
		return await asyncHandler('DELETE SENSE STATE', async () => {
			const response = await fetch(`/api/sense-states/${ss_key}`, { method: 'DELETE' });
			if (!response.ok) throw new Error(`Failed to delete sense state [${ss_key}]. Internal error`);

			const senseState = await response.json();
			if (!senseState) throw new Error(`Failed to delete sense state [${ss_key}]. Unable to delete data`);

			return senseState;
		});
	},
}

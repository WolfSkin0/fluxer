/*
 * Copyright (C) 2026 Fluxer Contributors
 *
 * This file is part of Fluxer.
 *
 * Fluxer is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Fluxer is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Fluxer. If not, see <https://www.gnu.org/licenses/>.
 */

import {matchSorter} from 'match-sorter';
import React from 'react';
import type {AutocompleteOption} from '~/components/channel/Autocomplete';
import {ChannelTypes} from '@fluxer/constants/src/ChannelConstants';
import type {ChannelRecord} from '~/records/ChannelRecord';
import ChannelStore from '~/stores/ChannelStore';

const DISPLAY_LIMIT = 10;

export function useChannelAutocompleteData(
	channel: ChannelRecord | null,
	query: string | null,
): Array<AutocompleteOption> {
	return React.useMemo(() => {
		if (query === null || !channel || !channel.guildId) return [];

		const guildChannels = ChannelStore.getGuildChannels(channel.guildId);

		const nonCategoryChannels = matchSorter(Array.from(guildChannels), query, {keys: ['name']})
			.filter((ch) => !ch.isGuildCategory() && ch.type !== ChannelTypes.GUILD_LINK);

		const categoryPositions = new Map<string | null, number>();
		for (const ch of nonCategoryChannels) {
			const parentId = ch.parentId;
			if (!categoryPositions.has(parentId)) {
				if (parentId) {
					const parent = ChannelStore.getChannel(parentId);
					categoryPositions.set(parentId, parent?.position ?? 0);
				} else {
					categoryPositions.set(null, -1);
				}
			}
		}

		const filteredChannels = nonCategoryChannels
			.sort((a, b) => {
				const catPosA = categoryPositions.get(a.parentId) ?? 0;
				const catPosB = categoryPositions.get(b.parentId) ?? 0;
				if (catPosA !== catPosB) return catPosA - catPosB;
				return (a.position ?? 0) - (b.position ?? 0);
			})
			.slice(0, DISPLAY_LIMIT);

		return filteredChannels.map((ch) => ({
			type: 'channel' as const,
			channel: ch,
		}));
	}, [query, channel]);
}

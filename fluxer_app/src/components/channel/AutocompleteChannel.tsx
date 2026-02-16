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

import * as HighlightActionCreators from '@app/actions/HighlightActionCreators';
import {type AutocompleteOption, isChannel} from '@app/components/channel/Autocomplete';
import styles from '@app/components/channel/AutocompleteChannel.module.css';
import {AutocompleteItem} from '@app/components/channel/AutocompleteItem';
import ChannelStore from '@app/stores/ChannelStore';
import * as ChannelUtils from '@app/utils/ChannelUtils';
import {useLingui} from '@lingui/react/macro';
import {observer} from 'mobx-react-lite';
import React from 'react';

interface CategoryGroup {
	categoryId: string | null;
	categoryName: string;
	categoryPosition: number;
	channels: Array<{option: AutocompleteOption & {type: 'channel'}; flatIndex: number}>;
}

export const AutocompleteChannel = observer(function AutocompleteChannel({
	onSelect,
	keyboardFocusIndex,
	hoverIndex,
	options,
	onMouseEnter,
	onMouseLeave,
	rowRefs,
}: {
	onSelect: (option: AutocompleteOption) => void;
	keyboardFocusIndex: number;
	hoverIndex: number;
	options: Array<AutocompleteOption>;
	onMouseEnter: (index: number) => void;
	onMouseLeave: () => void;
	rowRefs?: React.MutableRefObject<Array<HTMLButtonElement | null>>;
}) {
	const {t} = useLingui();
	const channels = options.filter(isChannel);

	const groups = React.useMemo(() => {
		const groupsMap = new Map<string | null, CategoryGroup>();

		for (const option of channels) {
			const parentId = option.channel.parentId;
			if (!groupsMap.has(parentId)) {
				let categoryName = t`Text Channels`;
				let categoryPosition = -1;
				if (parentId) {
					const category = ChannelStore.getChannel(parentId);
					if (category) {
						categoryName = category.name ?? t`Text Channels`;
						categoryPosition = category.position ?? 0;
					}
				}
				groupsMap.set(parentId, {
					categoryId: parentId,
					categoryName,
					categoryPosition,
					channels: [],
				});
			}
			groupsMap.get(parentId)!.channels.push({option, flatIndex: 0});
		}

		const sorted = Array.from(groupsMap.values()).sort((a, b) => a.categoryPosition - b.categoryPosition);

		let flatIndex = 0;
		for (const group of sorted) {
			for (const entry of group.channels) {
				entry.flatIndex = flatIndex++;
			}
		}

		return sorted;
	}, [channels, t]);

	return (
		<>
			{groups.map((group) => (
				<React.Fragment key={group.categoryId ?? 'uncategorized'}>
					{groups.length > 1 && <div className={styles.categoryHeader}>{group.categoryName}</div>}
					{group.channels.map(({option, flatIndex}) => (
						<AutocompleteItem
							key={option.channel.id}
							icon={ChannelUtils.getIcon(option.channel, {className: styles.channelIcon})}
							name={option.channel.name}
							isKeyboardSelected={flatIndex === keyboardFocusIndex}
							isHovered={flatIndex === hoverIndex}
							onSelect={() => onSelect(option)}
							onMouseEnter={() => {
								HighlightActionCreators.highlightChannel(option.channel.id);
								onMouseEnter(flatIndex);
							}}
							onMouseLeave={onMouseLeave}
							innerRef={
								rowRefs
									? (node) => {
											rowRefs.current[flatIndex] = node;
										}
									: undefined
							}
						/>
					))}
				</React.Fragment>
			))}
		</>
	);
});

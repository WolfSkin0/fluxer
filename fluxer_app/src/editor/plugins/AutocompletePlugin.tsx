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

import {
	LexicalTypeaheadMenuPlugin,
	MenuOption,
	type MenuRenderFn,
	type MenuTextMatch,
	type TriggerFn,
} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import {$createTextNode, COMMAND_PRIORITY_HIGH, type LexicalEditor, type TextNode} from 'lexical';
import {observer} from 'mobx-react-lite';
import React from 'react';
import {createPortal} from 'react-dom';
import * as HighlightActionCreators from '~/actions/HighlightActionCreators';
import {
	Autocomplete,
	type AutocompleteOption,
	type AutocompleteType,
	isChannel,
	isMentionMember,
	isMentionRole,
	isMentionUser,
	isSpecialMention,
} from '~/components/channel/Autocomplete';
import type {ChannelRecord} from '~/records/ChannelRecord';
import {$createChannelMentionNode} from '../nodes/ChannelMentionNode';
import {$createMentionNode, type MentionType} from '../nodes/MentionNode';
import {useChannelAutocompleteData} from '../hooks/useChannelAutocompleteData';
import {useMentionAutocompleteData} from '../hooks/useMentionAutocompleteData';

class AutocompleteMenuOption extends MenuOption {
	data: AutocompleteOption;

	constructor(data: AutocompleteOption, key: string) {
		super(key);
		this.data = data;
	}
}

function useAutocompleteTrigger(triggerChar: string): TriggerFn {
	const pattern = React.useMemo(() => {
		const escaped = triggerChar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		return new RegExp(`(^|\\s)${escaped}(\\S*)$`);
	}, [triggerChar]);

	return React.useCallback(
		(text: string, _editor: LexicalEditor): MenuTextMatch | null => {
			const match = text.match(pattern);
			if (!match) return null;

			const leadingWhitespace = match[1].length;
			const fullMatchLength = match[0].length;

			return {
				leadOffset: text.length - fullMatchLength + leadingWhitespace,
				matchingString: match[2],
				replaceableString: `${triggerChar}${match[2]}`,
			};
		},
		[triggerChar, pattern],
	);
}

function useMenuRenderFn(
	type: AutocompleteType,
	anchorRef?: React.RefObject<HTMLElement | null>,
): MenuRenderFn<AutocompleteMenuOption> {
	return React.useCallback(
		(anchorElementRef, {selectedIndex, selectOptionAndCleanUp, options: menuOpts}) => {
			if (!menuOpts.length || !anchorElementRef.current) return null;

			const autocompleteOptions = menuOpts.map((o) => o.data);
			const referenceEl = anchorRef?.current ?? anchorElementRef.current;

			return createPortal(
				<Autocomplete
					type={type}
					options={autocompleteOptions}
					selectedIndex={selectedIndex ?? 0}
					onSelect={(opt) => {
						const menuOpt = menuOpts.find((mo) => mo.data === opt);
						if (menuOpt) selectOptionAndCleanUp(menuOpt);
					}}
					referenceElement={referenceEl}
					attached={!!anchorRef?.current}
				/>,
				document.body,
			);
		},
		[type, anchorRef],
	);
}

function getMentionOptionKey(option: AutocompleteOption): string {
	if (isMentionMember(option)) return `member-${option.member.user.id}`;
	if (isMentionUser(option)) return `user-${option.user.id}`;
	if (isMentionRole(option)) return `role-${option.role.id}`;
	if (isSpecialMention(option)) return `special-${option.kind}`;
	return 'unknown-mention';
}

const MentionSource = observer(function MentionSource({
	channel,
	anchorRef,
}: {
	channel: ChannelRecord | null;
	anchorRef?: React.RefObject<HTMLElement | null>;
}) {
	const triggerFn = useAutocompleteTrigger('@');
	const [query, setQuery] = React.useState<string | null>(null);
	const options = useMentionAutocompleteData(channel, query);

	const menuOptions = React.useMemo(
		() => options.map((opt) => new AutocompleteMenuOption(opt, getMentionOptionKey(opt))),
		[options],
	);

	const onSelectOption = React.useCallback(
		(option: AutocompleteMenuOption, textNode: TextNode | null, closeMenu: () => void) => {
			const data = option.data;
			let mentionType: MentionType;
			let mentionId: string;

			if (isMentionMember(data)) {
				mentionType = 'user';
				mentionId = data.member.user.id;
			} else if (isMentionUser(data)) {
				mentionType = 'user';
				mentionId = data.user.id;
			} else if (isMentionRole(data)) {
				mentionType = 'role';
				mentionId = data.role.id;
			} else if (isSpecialMention(data)) {
				mentionType = data.kind === '@everyone' ? 'everyone' : 'here';
				mentionId = data.kind === '@everyone' ? 'everyone' : 'here';
			} else {
				closeMenu();
				return;
			}

			if (textNode) {
				const mentionNode = $createMentionNode(mentionType, mentionId);
				textNode.replace(mentionNode);
				const spaceNode = $createTextNode(' ');
				mentionNode.insertAfter(spaceNode);
				spaceNode.select();
			}

			closeMenu();
		},
		[],
	);

	const onClose = React.useCallback(() => {
		setQuery(null);
	}, []);

	const menuRenderFn = useMenuRenderFn('mention', anchorRef);

	return (
		<LexicalTypeaheadMenuPlugin<AutocompleteMenuOption>
			triggerFn={triggerFn}
			onQueryChange={setQuery}
			options={menuOptions}
			onSelectOption={onSelectOption}
			menuRenderFn={menuRenderFn}
			onClose={onClose}
			commandPriority={COMMAND_PRIORITY_HIGH}
		/>
	);
});

function getChannelOptionKey(option: AutocompleteOption): string {
	if (isChannel(option)) return `channel-${option.channel.id}`;
	return 'unknown-channel';
}

const ChannelSource = observer(function ChannelSource({
	channel,
	anchorRef,
}: {
	channel: ChannelRecord | null;
	anchorRef?: React.RefObject<HTMLElement | null>;
}) {
	const triggerFn = useAutocompleteTrigger('#');
	const [query, setQuery] = React.useState<string | null>(null);
	const options = useChannelAutocompleteData(channel, query);

	const menuOptions = React.useMemo(
		() => options.map((opt) => new AutocompleteMenuOption(opt, getChannelOptionKey(opt))),
		[options],
	);

	const onSelectOption = React.useCallback(
		(option: AutocompleteMenuOption, textNode: TextNode | null, closeMenu: () => void) => {
			const data = option.data;

			if (!isChannel(data)) {
				closeMenu();
				return;
			}

			if (textNode) {
				const channelNode = $createChannelMentionNode(data.channel.id);
				textNode.replace(channelNode);
				const spaceNode = $createTextNode(' ');
				channelNode.insertAfter(spaceNode);
				spaceNode.select();
			}

			HighlightActionCreators.clearChannelHighlight();
			closeMenu();
		},
		[],
	);

	const onClose = React.useCallback(() => {
		HighlightActionCreators.clearChannelHighlight();
	}, []);

	const menuRenderFn = useMenuRenderFn('channel', anchorRef);

	return (
		<LexicalTypeaheadMenuPlugin<AutocompleteMenuOption>
			triggerFn={triggerFn}
			onQueryChange={setQuery}
			options={menuOptions}
			onSelectOption={onSelectOption}
			menuRenderFn={menuRenderFn}
			onClose={onClose}
			commandPriority={COMMAND_PRIORITY_HIGH}
		/>
	);
});

export function AutocompletePlugin({
	channel,
	anchorRef,
}: {
	channel: ChannelRecord | null;
	anchorRef?: React.RefObject<HTMLElement | null>;
}) {
	return (
		<>
			<MentionSource channel={channel} anchorRef={anchorRef} />
			<ChannelSource channel={channel} anchorRef={anchorRef} />
		</>
	);
}

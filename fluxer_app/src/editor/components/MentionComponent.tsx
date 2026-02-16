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

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useLexicalNodeSelection} from '@lexical/react/useLexicalNodeSelection';
import {clsx} from 'clsx';
import {
	$getNodeByKey,
	$getSelection,
	$isNodeSelection,
	CLICK_COMMAND,
	COMMAND_PRIORITY_LOW,
	KEY_BACKSPACE_COMMAND,
} from 'lexical';
import {observer} from 'mobx-react-lite';
import {useCallback, useEffect, useRef} from 'react';
import {PreloadableUserPopout} from '~/components/channel/PreloadableUserPopout';
import GuildMemberStore from '~/stores/GuildMemberStore';
import GuildStore from '~/stores/GuildStore';
import SelectedGuildStore from '~/stores/SelectedGuildStore';
import UserStore from '~/stores/UserStore';
import * as ColorUtils from '~/utils/ColorUtils';
import * as NicknameUtils from '~/utils/NicknameUtils';
import type {MentionType} from '../nodes/MentionNode';
import styles from '../FluxerEditor.module.css';

interface MentionComponentProps {
	nodeKey: string;
	mentionType: MentionType;
	id: string;
}

export const MentionComponent = observer(function MentionComponent({
	nodeKey,
	mentionType,
	id,
}: MentionComponentProps) {
	const [editor] = useLexicalComposerContext();
	const [isSelected, setSelected, clearSelection] = useLexicalNodeSelection(nodeKey);
	const spanRef = useRef<HTMLSpanElement>(null);

	const handleClick = useCallback(
		(event: MouseEvent) => {
			const targetElement = event.target as HTMLElement;
			const nodeElement = editor.getElementByKey(nodeKey);
			if (nodeElement && (nodeElement === targetElement || nodeElement.contains(targetElement))) {
				if (event.detail >= 2) {
					// Double-click: select pill for deletion
					if (!event.shiftKey) {
						clearSelection();
					}
					setSelected(true);
					return true;
				}
				// Single click on non-user pills: no-op (consume event)
				if (mentionType !== 'user') {
					return true;
				}
				// Single click on user mention: let event propagate so Popout opens
				return false;
			}
			return false;
		},
		[editor, nodeKey, mentionType, clearSelection, setSelected],
	);

	const handleBackspace = useCallback(
		(event: KeyboardEvent) => {
			if (!isSelected) return false;

			let isNodeSel = false;
			editor.getEditorState().read(() => {
				isNodeSel = $isNodeSelection($getSelection());
			});
			if (!isNodeSel) return false;

			event.preventDefault();
			editor.update(() => {
				const node = $getNodeByKey(nodeKey);
				if (node) {
					node.remove();
				}
			});
			return true;
		},
		[editor, isSelected, nodeKey],
	);

	useEffect(() => {
		const unregisterClick = editor.registerCommand(
			CLICK_COMMAND,
			handleClick,
			COMMAND_PRIORITY_LOW,
		);
		const unregisterBackspace = editor.registerCommand(
			KEY_BACKSPACE_COMMAND,
			handleBackspace,
			COMMAND_PRIORITY_LOW,
		);
		return () => {
			unregisterClick();
			unregisterBackspace();
		};
	}, [editor, handleClick, handleBackspace]);

	// Native click listener on the user mention span to suppress Popout toggle
	// on double-click. The native listener fires during the target/capture phase
	// on the span element, before the event bubbles to Lexical's contenteditable
	// root and React's delegation root. On double-click we stop propagation so
	// the Popout component never receives the synthetic onClick event.
	// The pill selection is handled separately by the CLICK_COMMAND handler above,
	// which fires via Lexical's command system when the editor root receives the
	// click. Since stopPropagation prevents that too, we perform selection
	// directly in this handler via clearSelection/setSelected.
	useEffect(() => {
		const el = spanRef.current;
		if (!el || mentionType !== 'user') return;

		const nativeClickHandler = (event: MouseEvent) => {
			if (event.detail >= 2) {
				// Double-click: select pill and prevent Popout from toggling
				clearSelection();
				setSelected(true);
				event.stopPropagation();
			}
		};

		el.addEventListener('click', nativeClickHandler);
		return () => el.removeEventListener('click', nativeClickHandler);
	}, [mentionType, clearSelection, setSelected]);

	const guildId = SelectedGuildStore.selectedGuildId;

	if (mentionType === 'everyone') {
		return (
			<span className={clsx(styles.mentionPill, styles.everyoneMention, isSelected && styles.selected)}>
				@everyone
			</span>
		);
	}

	if (mentionType === 'here') {
		return (
			<span className={clsx(styles.mentionPill, styles.hereMention, isSelected && styles.selected)}>
				@here
			</span>
		);
	}

	if (mentionType === 'role') {
		const guild = guildId != null ? GuildStore.getGuild(guildId) : null;
		const role = guild?.roles[id];
		const roleColor = role?.color ? ColorUtils.int2rgb(role.color) : undefined;
		const roleBgColor = role?.color ? ColorUtils.int2rgba(role.color, 0.1) : undefined;

		const style = roleColor
			? {color: roleColor, backgroundColor: roleBgColor}
			: undefined;

		return (
			<span
				className={clsx(styles.mentionPill, isSelected && styles.selected)}
				style={style}
			>
				@{role?.name ?? 'Unknown Role'}
			</span>
		);
	}

	const user = UserStore.getUser(id);
	const displayName = user ? NicknameUtils.getNickname(user, guildId) : id;

	const member = guildId ? GuildMemberStore.getMember(guildId, id) : null;
	const sortedRoles = member?.getSortedRoles() ?? [];
	const coloredRole = sortedRoles.find((role) => role.color !== 0);

	const style = coloredRole
		? {
				color: ColorUtils.int2rgb(coloredRole.color),
				backgroundColor: ColorUtils.int2rgba(coloredRole.color, 0.1),
			}
		: undefined;

	const userSpan = (
		<span
			ref={spanRef}
			className={clsx(styles.mentionPill, isSelected && styles.selected)}
			style={{...style, cursor: 'pointer'}}
		>
			@{displayName}
		</span>
	);

	if (user) {
		return (
			<PreloadableUserPopout user={user} isWebhook={false} guildId={guildId ?? undefined}>
				{userSpan}
			</PreloadableUserPopout>
		);
	}

	return userSpan;
});

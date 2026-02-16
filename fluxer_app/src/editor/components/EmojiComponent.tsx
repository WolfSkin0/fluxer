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
import {useCallback, useEffect} from 'react';
import * as AvatarUtils from '~/utils/AvatarUtils';
import {convertToCodePoints} from '~/utils/EmojiCodepointUtils';
import type {EmojiType} from '../nodes/EmojiNode';
import styles from '../FluxerEditor.module.css';

interface EmojiComponentProps {
	nodeKey: string;
	emojiType: EmojiType;
	name: string;
	emojiId: string | null;
	animated: boolean;
	unicode: string | null;
}

export const EmojiComponent = observer(function EmojiComponent({
	nodeKey,
	emojiType,
	name,
	emojiId,
	animated,
	unicode,
}: EmojiComponentProps) {
	const [editor] = useLexicalComposerContext();
	const [isSelected, setSelected, clearSelection] = useLexicalNodeSelection(nodeKey);

	const handleClick = useCallback(
		(event: MouseEvent) => {
			const targetElement = event.target as HTMLElement;
			const nodeElement = editor.getElementByKey(nodeKey);
			if (nodeElement && (nodeElement === targetElement || nodeElement.contains(targetElement))) {
				if (!event.shiftKey) {
					clearSelection();
				}
				setSelected(true);
				return true;
			}
			return false;
		},
		[editor, nodeKey, clearSelection, setSelected],
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

	let emojiUrl: string;
	if (emojiType === 'custom') {
		emojiUrl = emojiId ? AvatarUtils.getEmojiURL({id: emojiId, animated}) : '';
	} else {
		// Unicode emoji: always use Twemoji CDN image, bypassing platform checks
		emojiUrl = unicode ? `https://fluxerstatic.com/emoji/${convertToCodePoints(unicode)}.svg` : '';
	}

	return (
		<span className={clsx(styles.emojiNode, isSelected && styles.selected)}>
			<img
				src={emojiUrl}
				alt={`:${name}:`}
				title={`:${name}:`}
				draggable={false}
			/>
		</span>
	);
});

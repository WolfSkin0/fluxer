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
import {
	$getRoot,
	$getSelection,
	$isRangeSelection,
	COMMAND_PRIORITY_LOW,
	KEY_ARROW_UP_COMMAND,
} from 'lexical';
import {useEffect} from 'react';
import * as MessageActionCreators from '~/actions/MessageActionCreators';
import {ComponentDispatch} from '~/lib/ComponentDispatch';
import {canFocusTextarea} from '~/lib/InputFocusManager';
import {isTextInputKeyEvent} from '@app/lib/IsTextInputKeyEvent';
import ContextMenuStore from '~/stores/ContextMenuStore';
import KeyboardModeStore from '~/stores/KeyboardModeStore';
import MessageStore from '~/stores/MessageStore';
import QuickSwitcherStore from '~/stores/QuickSwitcherStore';

export function KeyboardPlugin({
	channelId,
	isMobile,
	enabled,
}: {
	channelId: string;
	isMobile: boolean;
	enabled: boolean;
}) {
	const [editor] = useLexicalComposerContext();

	useEffect(() => {
		if (!enabled || isMobile) return;

		const handleKeyDown = (event: KeyboardEvent) => {
			const rootElement = editor.getRootElement();
			if (!rootElement) return;

			if (!canFocusTextarea(rootElement as HTMLDivElement)) return;

			if (document.activeElement === rootElement || rootElement.contains(document.activeElement)) {
				return;
			}

			if (QuickSwitcherStore.getIsOpen()) return;
			if (ContextMenuStore.contextMenu) return;

			if (KeyboardModeStore.keyboardModeEnabled) {
				const focusedElement = document.activeElement;
				if (focusedElement?.closest('[data-message-id]')) return;
			}

			if (!isTextInputKeyEvent(event)) return;

			if (event.key === 'Dead') {
				editor.focus();
				return;
			}

			event.preventDefault();
			editor.focus();

			editor.update(() => {
				const selection = $getSelection();
				if ($isRangeSelection(selection)) {
					selection.insertRawText(event.key);
				}
			});
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [editor, enabled, isMobile]);

	useEffect(() => {
		if (!enabled) return;

		return editor.registerCommand(
			KEY_ARROW_UP_COMMAND,
			(event: KeyboardEvent) => {
				if (event.shiftKey) return false;

				const isEmpty = editor.getEditorState().read(() => {
					return $getRoot().getTextContent() === '';
				});

				if (!isEmpty) return false;

				if (KeyboardModeStore.keyboardModeEnabled) {
					event.preventDefault();
					ComponentDispatch.dispatch('FOCUS_BOTTOMMOST_MESSAGE', {channelId});
					return true;
				}

				const message = MessageStore.getLastEditableMessage(channelId);
				if (!message) return false;

				event.preventDefault();
				MessageActionCreators.startEdit(channelId, message.id, message.content);
				return true;
			},
			COMMAND_PRIORITY_LOW,
		);
	}, [editor, channelId, enabled]);

	return null;
}

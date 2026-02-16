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
import {$createParagraphNode, $getRoot} from 'lexical';
import {useEffect, useRef} from 'react';
import * as DraftActionCreators from '~/actions/DraftActionCreators';
import {$parseLineToNodes} from '../utils/wireFormatParser';

const DRAFT_SAVE_DEBOUNCE_MS = 1000;

export function DraftSyncPlugin({
	channelId,
	draft,
}: {
	channelId: string;
	draft: string | null;
}) {
	const [editor] = useLexicalComposerContext();
	const isRestoringRef = useRef(false);
	const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const pendingContentRef = useRef<string | null>(null);
	const lastSavedContentRef = useRef<string | null>(null);
	const channelIdRef = useRef(channelId);
	channelIdRef.current = channelId;

	useEffect(() => {
		if (!draft) return;

		if (draft === lastSavedContentRef.current) return;

		isRestoringRef.current = true;

		editor.update(() => {
			const root = $getRoot();
			root.clear();
			const lines = draft.split('\n');
			for (const line of lines) {
				const paragraph = $createParagraphNode();
				if (line) {
					const nodes = $parseLineToNodes(line);
					for (const node of nodes) {
						paragraph.append(node);
					}
				}
				root.append(paragraph);
			}
			root.selectEnd();
		});

		const unregister = editor.registerUpdateListener(() => {
			isRestoringRef.current = false;
			unregister();
		});
	}, [editor, draft]);

	useEffect(() => {
		const flushPendingSave = () => {
			if (pendingContentRef.current !== null) {
				const content = pendingContentRef.current;
				pendingContentRef.current = null;
				lastSavedContentRef.current = content || null;
				const currentChannelId = channelIdRef.current;
				if (content) {
					DraftActionCreators.createDraft(currentChannelId, content);
				} else {
					DraftActionCreators.deleteDraft(currentChannelId);
				}
			}
		};

		const unregister = editor.registerUpdateListener(({editorState}) => {
			if (isRestoringRef.current) return;

			editorState.read(() => {
				const content = $getRoot().getTextContent();
				pendingContentRef.current = content;

				if (debounceTimerRef.current != null) {
					clearTimeout(debounceTimerRef.current);
				}

				debounceTimerRef.current = setTimeout(() => {
					debounceTimerRef.current = null;
					flushPendingSave();
				}, DRAFT_SAVE_DEBOUNCE_MS);
			});
		});

		return () => {
			unregister();
			if (debounceTimerRef.current != null) {
				clearTimeout(debounceTimerRef.current);
				debounceTimerRef.current = null;
			}
			flushPendingSave();
		};
	}, [editor, channelId]);

	return null;
}

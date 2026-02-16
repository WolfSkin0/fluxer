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
import {$getRoot} from 'lexical';
import {useEffect, useRef} from 'react';
import * as ReplaceCommandUtils from '~/utils/ReplaceCommandUtils';
import {TypingUtils} from '~/utils/TypingUtils';

export function ContentObserverPlugin({
	channelId,
	enabled,
	onCharCountChange,
}: {
	channelId: string;
	enabled: boolean;
	onCharCountChange?: (length: number) => void;
}) {
	const [editor] = useLexicalComposerContext();
	const onCharCountChangeRef = useRef(onCharCountChange);
	onCharCountChangeRef.current = onCharCountChange;

	useEffect(() => {
		if (!enabled) {
			TypingUtils.clear(channelId);
		}
	}, [channelId, enabled]);

	useEffect(() => {
		const unregister = editor.registerUpdateListener(({editorState}) => {
			editorState.read(() => {
				const content = $getRoot().getTextContent();

				onCharCountChangeRef.current?.(content.length);

				if (!enabled) return;

				const trimmed = content.trim();

				if (!trimmed) {
					TypingUtils.clear(channelId);
					return;
				}

				const isReplaceCommand = ReplaceCommandUtils.isReplaceCommand(trimmed);
				const isSlashCommand = trimmed.startsWith('/');

				if (isReplaceCommand || isSlashCommand) {
					TypingUtils.clear(channelId);
					return;
				}

				TypingUtils.typing(channelId);
			});
		});

		return () => {
			unregister();
			TypingUtils.clear(channelId);
		};
	}, [editor, channelId, enabled]);

	return null;
}

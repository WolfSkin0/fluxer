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

import type {InitialConfigType} from '@lexical/react/LexicalComposer';
import type {EditorThemeClasses} from 'lexical';
import styles from './FluxerEditor.module.css';
import {EDITOR_NODES} from './nodes';

const fluxerEditorTheme: EditorThemeClasses = {
	paragraph: styles.editorParagraph,
	text: {
		bold: styles.textBold,
		italic: styles.textItalic,
		underline: styles.textUnderline,
		strikethrough: styles.textStrikethrough,
	},
	mention: styles.mentionNode,
	channelMention: styles.channelMentionNode,
	emoji: styles.emojiNodeTheme,
};

interface CreateFluxerEditorConfigOptions {
	namespace: string;
	editable?: boolean;
}

export function createFluxerEditorConfig({
	namespace,
	editable = true,
}: CreateFluxerEditorConfigOptions): InitialConfigType {
	return {
		namespace,
		nodes: EDITOR_NODES,
		theme: fluxerEditorTheme,
		onError: (error: Error) => {
			console.error('[FluxerEditor]', error);
		},
		editable,
	};
}

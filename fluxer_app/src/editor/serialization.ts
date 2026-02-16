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

import {$getRoot, CLEAR_EDITOR_COMMAND, type LexicalEditor} from 'lexical';

export function serializeEditorToText(editor: LexicalEditor): string {
	let text = '';
	editor.getEditorState().read(() => {
		text = $getRoot().getTextContent();
	});
	return text;
}

export function clearEditor(editor: LexicalEditor): void {
	editor.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined);
}

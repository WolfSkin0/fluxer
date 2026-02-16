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
import type {LexicalEditor} from 'lexical';
import {useEffect, useRef} from 'react';

export function EditorBridgePlugin({
	onEditorReady,
}: {
	onEditorReady: (editor: LexicalEditor) => void;
}) {
	const [editor] = useLexicalComposerContext();
	const onEditorReadyRef = useRef(onEditorReady);
	onEditorReadyRef.current = onEditorReady;

	useEffect(() => {
		onEditorReadyRef.current(editor);
	}, [editor]);
	return null;
}

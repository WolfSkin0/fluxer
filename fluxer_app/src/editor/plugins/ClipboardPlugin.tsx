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
	$createParagraphNode,
	$getSelection,
	$insertNodes,
	$isRangeSelection,
	$isTextNode,
	COMMAND_PRIORITY_LOW,
	CUT_COMMAND,
	PASTE_COMMAND,
} from 'lexical';
import {useEffect} from 'react';
import {$parseLineToNodes} from '../utils/wireFormatParser';

export function ClipboardPlugin() {
	const [editor] = useLexicalComposerContext();

	useEffect(() => {
		const unregisterCut = editor.registerCommand(
			CUT_COMMAND,
			(event: ClipboardEvent) => {
				const selection = $getSelection();
				if (!$isRangeSelection(selection)) {
					return false;
				}

				const textContent = selection.getTextContent();
				if (event.clipboardData) {
					event.clipboardData.setData('text/plain', textContent);
				}
				selection.removeText();

				event.preventDefault();
				return true;
			},
			COMMAND_PRIORITY_LOW,
		);

		const unregisterPaste = editor.registerCommand(
			PASTE_COMMAND,
			(event: ClipboardEvent) => {
				const text = event.clipboardData?.getData('text/plain');
				if (!text) return false;

				const lines = text.split('\n');

				// For single-line paste, check if it contains wire format patterns
				if (lines.length === 1) {
					const nodes = $parseLineToNodes(text);
					const hasSpecialNodes = nodes.some((n) => !$isTextNode(n));
					if (!hasSpecialNodes) return false;

					event.preventDefault();
					const selection = $getSelection();
					if ($isRangeSelection(selection) && !selection.isCollapsed()) {
						selection.removeText();
					}
					$insertNodes(nodes);
					return true;
				}

				// Multi-line paste: parse each line and join with paragraph boundaries
				let hasAnySpecialNodes = false;
				const parsedLines = lines.map((line) => {
					const nodes = $parseLineToNodes(line);
					if (nodes.some((n) => !$isTextNode(n))) {
						hasAnySpecialNodes = true;
					}
					return nodes;
				});

				if (!hasAnySpecialNodes) return false;

				event.preventDefault();
				const selection = $getSelection();
				if ($isRangeSelection(selection) && !selection.isCollapsed()) {
					selection.removeText();
				}

				// Build paragraph nodes for multi-line content
				const paragraphs = parsedLines.map((nodes) => {
					const paragraph = $createParagraphNode();
					for (const node of nodes) {
						paragraph.append(node);
					}
					return paragraph;
				});

				$insertNodes(paragraphs);
				return true;
			},
			COMMAND_PRIORITY_LOW,
		);

		return () => {
			unregisterCut();
			unregisterPaste();
		};
	}, [editor]);

	return null;
}

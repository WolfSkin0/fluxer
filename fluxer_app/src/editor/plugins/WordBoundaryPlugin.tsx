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
	$createRangeSelection,
	$getSelection,
	$isRangeSelection,
	$isTextNode,
	$setSelection,
	COMMAND_PRIORITY_HIGH,
	KEY_DOWN_COMMAND,
} from 'lexical';
import {useEffect} from 'react';

const enum CharClass {
	Word,
	Punctuation,
	Whitespace,
}

function charClass(ch: string): CharClass {
	if (/\s/.test(ch)) return CharClass.Whitespace;
	if (/[\p{L}\p{N}]/u.test(ch)) return CharClass.Word;
	return CharClass.Punctuation;
}

function findWordBoundaryForward(text: string, offset: number): number {
	if (offset >= text.length) return text.length;
	let pos = offset;
	if (charClass(text[pos]!) === CharClass.Word) {
		while (pos < text.length && charClass(text[pos]!) === CharClass.Word) {
			pos++;
		}
	} else {
		while (pos < text.length && charClass(text[pos]!) !== CharClass.Word) {
			pos++;
		}
		while (pos < text.length && charClass(text[pos]!) === CharClass.Word) {
			pos++;
		}
	}
	return pos;
}

function findWordBoundaryBackward(text: string, offset: number): number {
	if (offset <= 0) return 0;
	let pos = offset;
	if (charClass(text[pos - 1]!) === CharClass.Word) {
		while (pos > 0 && charClass(text[pos - 1]!) === CharClass.Word) {
			pos--;
		}
	} else {
		while (pos > 0 && charClass(text[pos - 1]!) !== CharClass.Word) {
			pos--;
		}
		while (pos > 0 && charClass(text[pos - 1]!) === CharClass.Word) {
			pos--;
		}
	}
	return pos;
}

export function WordBoundaryPlugin() {
	const [editor] = useLexicalComposerContext();

	useEffect(() => {
		return editor.registerCommand(
			KEY_DOWN_COMMAND,
			(event) => {
				if (!event.ctrlKey && !event.metaKey) return false;
				if (event.altKey) return false;

				const isRight = event.key === 'ArrowRight';
				const isLeft = event.key === 'ArrowLeft';
				if (!isRight && !isLeft) return false;

				const extend = event.shiftKey;
				let handled = false;

				editor.update(() => {
					const selection = $getSelection();
					if (!$isRangeSelection(selection)) return;

					const focusNode = selection.focus.getNode();
					if (!$isTextNode(focusNode)) return;

					handled = true;

					const text = focusNode.getTextContent();
					const focusOffset = selection.focus.offset;

					const newOffset = isRight
						? findWordBoundaryForward(text, focusOffset)
						: findWordBoundaryBackward(text, focusOffset);

					if (extend) {
						selection.focus.set(focusNode.getKey(), newOffset, 'text');
					} else {
						const sel = $createRangeSelection();
						sel.anchor.set(focusNode.getKey(), newOffset, 'text');
						sel.focus.set(focusNode.getKey(), newOffset, 'text');
						$setSelection(sel);
					}
				});

				if (handled) {
					event.preventDefault();
				}

				return handled;
			},
			COMMAND_PRIORITY_HIGH,
		);
	}, [editor]);

	return null;
}

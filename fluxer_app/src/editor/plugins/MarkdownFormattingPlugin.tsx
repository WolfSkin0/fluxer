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
	$insertNodes,
	$isRangeSelection,
	$isTextNode,
	$setSelection,
	COMMAND_PRIORITY_HIGH,
	KEY_DOWN_COMMAND,
} from 'lexical';
import {useEffect} from 'react';
import {$parseLineToNodes} from '../utils/wireFormatParser';

const FORMATTING_SHORTCUTS = [
	{key: 'b', shift: false, wrapper: '**'},
	{key: 'i', shift: false, wrapper: '*'},
	{key: 'u', shift: false, wrapper: '__'},
	{key: 's', shift: true, wrapper: '~~'},
] as const;

function matchesShortcut(
	event: KeyboardEvent,
	shortcut: (typeof FORMATTING_SHORTCUTS)[number],
): boolean {
	const hasCtrlOrMeta = event.ctrlKey || event.metaKey;
	if (!hasCtrlOrMeta) return false;
	if (shortcut.shift && !event.shiftKey) return false;
	if (!shortcut.shift && event.shiftKey) return false;
	return event.key.toLowerCase() === shortcut.key;
}

export function MarkdownFormattingPlugin() {
	const [editor] = useLexicalComposerContext();

	useEffect(() => {
		return editor.registerCommand(
			KEY_DOWN_COMMAND,
			(event) => {
				for (const shortcut of FORMATTING_SHORTCUTS) {
					if (!matchesShortcut(event, shortcut)) {
						continue;
					}

					event.preventDefault();

					editor.update(() => {
						const selection = $getSelection();
						if (!$isRangeSelection(selection)) {
							return;
						}

						const {wrapper} = shortcut;
						const wrapperLen = wrapper.length;
						const isCollapsed = selection.isCollapsed();

						const anchorNode = selection.anchor.getNode();

						if (isCollapsed) {
							// Collapsed cursor on a DecoratorNode (pill) — do nothing
							if (!$isTextNode(anchorNode)) return;

							// Collapsed cursor on a TextNode — insert empty delimiters
							const anchorOffset = selection.anchor.offset;
							const text = anchorNode.getTextContent();
							const newText = text.slice(0, anchorOffset) + wrapper + wrapper + text.slice(anchorOffset);
							anchorNode.setTextContent(newText);
							const cursorPos = anchorOffset + wrapperLen;
							const sel = $createRangeSelection();
							sel.anchor.set(anchorNode.getKey(), cursorPos, 'text');
							sel.focus.set(anchorNode.getKey(), cursorPos, 'text');
							$setSelection(sel);
							return;
						}

						// Non-collapsed selection: use wire format text for cross-node support
						const wireText = selection.getTextContent();

						// Check if already wrapped inside the selection
						const alreadyWrappedInside =
							wireText.length >= wrapperLen * 2 &&
							wireText.startsWith(wrapper) &&
							wireText.endsWith(wrapper);

						if (alreadyWrappedInside) {
							// Unwrap: remove delimiters from inside the selection
							const unwrapped = wireText.slice(wrapperLen, wireText.length - wrapperLen);
							selection.removeText();
							const nodes = $parseLineToNodes(unwrapped);
							$insertNodes(nodes);
							return;
						}

						// Check for wrapping OUTSIDE the selection (toggle-off case):
						// e.g., **hello @john world** where user selects "hello @john world"
						const focusNode = selection.focus.getNode();
						const anchorOffset = selection.anchor.offset;
						const focusOffset = selection.focus.offset;

						// Determine which node/offset is the start and which is the end
						const anchorBefore = selection.anchor.isBefore(selection.focus);
						const startNode = anchorBefore ? anchorNode : focusNode;
						const endNode = anchorBefore ? focusNode : anchorNode;
						const startOffset = anchorBefore ? anchorOffset : focusOffset;
						const endOffset = anchorBefore ? focusOffset : anchorOffset;

						if ($isTextNode(startNode) && $isTextNode(endNode)) {
							const startText = startNode.getTextContent();
							const endText = endNode.getTextContent();

							const hasPrefixWrapper =
								startOffset >= wrapperLen &&
								startText.slice(startOffset - wrapperLen, startOffset) === wrapper;
							const hasSuffixWrapper =
								endOffset + wrapperLen <= endText.length &&
								endText.slice(endOffset, endOffset + wrapperLen) === wrapper;

							if (hasPrefixWrapper && hasSuffixWrapper) {
								// Remove outside wrappers — trim delimiters from surrounding text
								if (startNode === endNode) {
									// Same node: remove prefix and suffix wrappers
									const text = startText;
									const newText =
										text.slice(0, startOffset - wrapperLen) +
										text.slice(startOffset, endOffset) +
										text.slice(endOffset + wrapperLen);
									startNode.setTextContent(newText);
									const sel = $createRangeSelection();
									sel.anchor.set(startNode.getKey(), startOffset - wrapperLen, 'text');
									sel.focus.set(startNode.getKey(), endOffset - wrapperLen, 'text');
									$setSelection(sel);
								} else {
									// Different nodes: trim prefix from start, suffix from end
									startNode.setTextContent(
										startText.slice(0, startOffset - wrapperLen) + startText.slice(startOffset),
									);
									endNode.setTextContent(
										endText.slice(0, endOffset) + endText.slice(endOffset + wrapperLen),
									);
									// Restore selection adjusted for removed wrappers
									const sel = $createRangeSelection();
									if (anchorBefore) {
										sel.anchor.set(startNode.getKey(), anchorOffset - wrapperLen, 'text');
										sel.focus.set(endNode.getKey(), focusOffset, 'text');
									} else {
										sel.anchor.set(endNode.getKey(), anchorOffset, 'text');
										sel.focus.set(startNode.getKey(), focusOffset - wrapperLen, 'text');
									}
									$setSelection(sel);
								}
								return;
							}
						}

						// Wrap: add delimiters around the entire selection
						const newText = wrapper + wireText + wrapper;
						selection.removeText();
						const nodes = $parseLineToNodes(newText);
						$insertNodes(nodes);
					});

					return true;
				}

				return false;
			},
			COMMAND_PRIORITY_HIGH,
		);
	}, [editor]);

	return null;
}

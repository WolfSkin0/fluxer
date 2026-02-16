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

import {$createTextNode, type LexicalNode} from 'lexical';
import {$createMentionNode} from '../nodes/MentionNode';
import {$createChannelMentionNode} from '../nodes/ChannelMentionNode';
import {$createEmojiNode} from '../nodes/EmojiNode';
import * as AvatarUtils from '~/utils/AvatarUtils';

// Matches (in capture group order):
// 1: custom emoji animated prefix (a or undefined)
// 2: custom emoji name
// 3: custom emoji id
// 4: role mention id
// 5: user mention id
// 6: channel mention id
// 7/8: @everyone / @here (full match check)
const WIRE_FORMAT_PATTERN =
	/<(a)?:(\w+):(\d+)>|<@&(\d+)>|<@(\d+)>|<#(\d+)>|(?<=^|\s)@everyone|(?<=^|\s)@here/g;

/**
 * Parses a single line of wire format text into an array of Lexical nodes.
 * Must be called inside editor.update() or editorState.read().
 *
 * Handles: custom emoji (<a:name:id>, <:name:id>), user mentions (<@id>),
 * role mentions (<@&id>), channel mentions (<#id>), @everyone, @here.
 */
export function $parseLineToNodes(line: string): Array<LexicalNode> {
	const nodes: Array<LexicalNode> = [];
	let lastIndex = 0;

	WIRE_FORMAT_PATTERN.lastIndex = 0;
	let match: RegExpExecArray | null;

	while ((match = WIRE_FORMAT_PATTERN.exec(line)) !== null) {
		if (match.index > lastIndex) {
			nodes.push($createTextNode(line.slice(lastIndex, match.index)));
		}

		const fullMatch = match[0];
		if (match[2] !== undefined && match[3] !== undefined) {
			// Custom emoji: <a:name:id> or <:name:id>
			const animated = match[1] === 'a';
			const name = match[2];
			const emojiId = match[3];
			const src = AvatarUtils.getEmojiURL({id: emojiId, animated});
			nodes.push($createEmojiNode('custom', name, emojiId, animated, src, null));
		} else if (match[4] !== undefined) {
			// Role mention: <@&id>
			nodes.push($createMentionNode('role', match[4]));
		} else if (match[5] !== undefined) {
			// User mention: <@id>
			nodes.push($createMentionNode('user', match[5]));
		} else if (match[6] !== undefined) {
			// Channel mention: <#id>
			nodes.push($createChannelMentionNode(match[6]));
		} else if (fullMatch.includes('@everyone')) {
			nodes.push($createMentionNode('everyone', 'everyone'));
		} else if (fullMatch.includes('@here')) {
			nodes.push($createMentionNode('here', 'here'));
		}

		lastIndex = match.index + fullMatch.length;
	}

	if (lastIndex < line.length) {
		nodes.push($createTextNode(line.slice(lastIndex)));
	}

	return nodes;
}

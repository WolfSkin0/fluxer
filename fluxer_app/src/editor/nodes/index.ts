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

import type {Klass, LexicalNode} from 'lexical';

export {
	MentionNode,
	$createMentionNode,
	$isMentionNode,
	type MentionType,
	type SerializedMentionNode,
} from './MentionNode';

export {
	ChannelMentionNode,
	$createChannelMentionNode,
	$isChannelMentionNode,
	type SerializedChannelMentionNode,
} from './ChannelMentionNode';

export {
	EmojiNode,
	$createEmojiNode,
	$isEmojiNode,
	type EmojiType,
	type SerializedEmojiNode,
} from './EmojiNode';

import {MentionNode} from './MentionNode';
import {ChannelMentionNode} from './ChannelMentionNode';
import {EmojiNode} from './EmojiNode';

export const EDITOR_NODES: Array<Klass<LexicalNode>> = [
	MentionNode,
	ChannelMentionNode,
	EmojiNode,
];

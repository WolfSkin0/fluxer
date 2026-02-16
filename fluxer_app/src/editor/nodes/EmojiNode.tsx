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

import type React from 'react';
import type {EditorConfig, LexicalEditor, LexicalUpdateJSON, NodeKey, Spread} from 'lexical';
import {$applyNodeReplacement, DecoratorNode} from 'lexical';
import type {SerializedLexicalNode} from 'lexical';
import {EmojiComponent} from '../components/EmojiComponent';

export type EmojiType = 'custom' | 'unicode';

export type SerializedEmojiNode = Spread<
	{
		emojiType: EmojiType;
		name: string;
		emojiId: string | null;
		animated: boolean;
		src: string | null;
		unicode: string | null;
	},
	SerializedLexicalNode
>;

export class EmojiNode extends DecoratorNode<React.ReactElement> {
	__emojiType: EmojiType;
	__name: string;
	__emojiId: string | null;
	__animated: boolean;
	__src: string | null;
	__unicode: string | null;

	static override getType(): string {
		return 'emoji';
	}

	static override clone(node: EmojiNode): EmojiNode {
		return new EmojiNode(
			node.__emojiType,
			node.__name,
			node.__emojiId,
			node.__animated,
			node.__src,
			node.__unicode,
			node.__key,
		);
	}

	constructor(
		emojiType: EmojiType,
		name: string,
		emojiId: string | null,
		animated: boolean,
		src: string | null,
		unicode: string | null,
		key?: NodeKey,
	) {
		super(key);
		this.__emojiType = emojiType;
		this.__name = name;
		this.__emojiId = emojiId;
		this.__animated = animated;
		this.__src = src;
		this.__unicode = unicode;
	}

	override createDOM(config: EditorConfig): HTMLElement {
		const span = document.createElement('span');
		const className = config.theme.emoji;
		if (className) {
			span.className = className;
		}
		return span;
	}

	override updateDOM(): false {
		return false;
	}

	override isInline(): boolean {
		return true;
	}

	override isKeyboardSelectable(): boolean {
		return true;
	}

	override getTextContent(): string {
		if (this.__emojiType === 'custom') {
			const prefix = this.__animated ? 'a' : '';
			return `<${prefix}:${this.__name}:${this.__emojiId}>`;
		}
		return this.__unicode ?? `:${this.__name}:`;
	}

	static override importJSON(serializedNode: SerializedEmojiNode): EmojiNode {
		return $createEmojiNode(
			serializedNode.emojiType,
			serializedNode.name,
			serializedNode.emojiId,
			serializedNode.animated,
			serializedNode.src,
			serializedNode.unicode,
		);
	}

	override updateFromJSON(serializedNode: LexicalUpdateJSON<SerializedEmojiNode>): this {
		return super.updateFromJSON(serializedNode);
	}

	override exportJSON(): SerializedEmojiNode {
		return {
			...super.exportJSON(),
			emojiType: this.__emojiType,
			name: this.__name,
			emojiId: this.__emojiId,
			animated: this.__animated,
			src: this.__src,
			unicode: this.__unicode,
		};
	}

	override decorate(_editor: LexicalEditor, _config: EditorConfig): React.ReactElement {
		return (
			<EmojiComponent
				nodeKey={this.__key}
				emojiType={this.__emojiType}
				name={this.__name}
				emojiId={this.__emojiId}
				animated={this.__animated}
				unicode={this.__unicode}
			/>
		);
	}
}

export function $createEmojiNode(
	emojiType: EmojiType,
	name: string,
	emojiId: string | null,
	animated: boolean,
	src: string | null,
	unicode: string | null,
): EmojiNode {
	return $applyNodeReplacement(new EmojiNode(emojiType, name, emojiId, animated, src, unicode));
}

export function $isEmojiNode(node: unknown): node is EmojiNode {
	return node instanceof EmojiNode;
}

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
import {ChannelMentionComponent} from '../components/ChannelMentionComponent';

export type SerializedChannelMentionNode = Spread<
	{
		channelId: string;
	},
	SerializedLexicalNode
>;

export class ChannelMentionNode extends DecoratorNode<React.ReactElement> {
	__channelId: string;

	static override getType(): string {
		return 'channel-mention';
	}

	static override clone(node: ChannelMentionNode): ChannelMentionNode {
		return new ChannelMentionNode(node.__channelId, node.__key);
	}

	constructor(channelId: string, key?: NodeKey) {
		super(key);
		this.__channelId = channelId;
	}

	override createDOM(config: EditorConfig): HTMLElement {
		const span = document.createElement('span');
		const className = config.theme.channelMention;
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
		return `<#${this.__channelId}>`;
	}

	static override importJSON(serializedNode: SerializedChannelMentionNode): ChannelMentionNode {
		return $createChannelMentionNode(serializedNode.channelId);
	}

	override updateFromJSON(serializedNode: LexicalUpdateJSON<SerializedChannelMentionNode>): this {
		return super.updateFromJSON(serializedNode);
	}

	override exportJSON(): SerializedChannelMentionNode {
		return {
			...super.exportJSON(),
			channelId: this.__channelId,
		};
	}

	override decorate(_editor: LexicalEditor, _config: EditorConfig): React.ReactElement {
		return (
			<ChannelMentionComponent
				nodeKey={this.__key}
				channelId={this.__channelId}
			/>
		);
	}
}

export function $createChannelMentionNode(channelId: string): ChannelMentionNode {
	return $applyNodeReplacement(new ChannelMentionNode(channelId));
}

export function $isChannelMentionNode(node: unknown): node is ChannelMentionNode {
	return node instanceof ChannelMentionNode;
}

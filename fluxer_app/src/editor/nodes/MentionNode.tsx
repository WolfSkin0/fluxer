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
import {MentionComponent} from '../components/MentionComponent';

export type MentionType = 'user' | 'role' | 'everyone' | 'here';

export type SerializedMentionNode = Spread<
	{
		mentionType: MentionType;
		id: string;
	},
	SerializedLexicalNode
>;

export class MentionNode extends DecoratorNode<React.ReactElement> {
	__mentionType: MentionType;
	__id: string;

	static override getType(): string {
		return 'mention';
	}

	static override clone(node: MentionNode): MentionNode {
		return new MentionNode(node.__mentionType, node.__id, node.__key);
	}

	constructor(mentionType: MentionType, id: string, key?: NodeKey) {
		super(key);
		this.__mentionType = mentionType;
		this.__id = id;
	}

	override createDOM(config: EditorConfig): HTMLElement {
		const span = document.createElement('span');
		const className = config.theme.mention;
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
		switch (this.__mentionType) {
			case 'user':
				return `<@${this.__id}>`;
			case 'role':
				return `<@&${this.__id}>`;
			case 'everyone':
				return '@everyone';
			case 'here':
				return '@here';
		}
	}

	static override importJSON(serializedNode: SerializedMentionNode): MentionNode {
		return $createMentionNode(serializedNode.mentionType, serializedNode.id);
	}

	override updateFromJSON(serializedNode: LexicalUpdateJSON<SerializedMentionNode>): this {
		return super.updateFromJSON(serializedNode);
	}

	override exportJSON(): SerializedMentionNode {
		return {
			...super.exportJSON(),
			mentionType: this.__mentionType,
			id: this.__id,
		};
	}

	override decorate(_editor: LexicalEditor, _config: EditorConfig): React.ReactElement {
		return (
			<MentionComponent
				nodeKey={this.__key}
				mentionType={this.__mentionType}
				id={this.__id}
			/>
		);
	}
}

export function $createMentionNode(mentionType: MentionType, id: string): MentionNode {
	return $applyNodeReplacement(new MentionNode(mentionType, id));
}

export function $isMentionNode(node: unknown): node is MentionNode {
	return node instanceof MentionNode;
}

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

import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {ClearEditorPlugin} from '@lexical/react/LexicalClearEditorPlugin';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import type {LexicalEditor} from 'lexical';
import {createFluxerEditorConfig} from './config';
import {FluxerEditorShell} from './FluxerEditorShell';
import {AutoFocusPlugin} from './plugins/AutoFocusPlugin';
import {AutocompletePlugin} from './plugins/AutocompletePlugin';
import {ClipboardPlugin} from './plugins/ClipboardPlugin';
import {ContentObserverPlugin} from './plugins/ContentObserverPlugin';
import {DraftSyncPlugin} from './plugins/DraftSyncPlugin';
import {EditorBridgePlugin} from './plugins/EditorBridgePlugin';
import {KeyboardPlugin} from './plugins/KeyboardPlugin';
import {MarkdownFormattingPlugin} from './plugins/MarkdownFormattingPlugin';
import {SubmitPlugin} from './plugins/SubmitPlugin';
import {WordBoundaryPlugin} from './plugins/WordBoundaryPlugin';
import type {ChannelRecord} from '~/records/ChannelRecord';

export interface FluxerEditorProps {
	channel: ChannelRecord | null;
	channelId: string;
	disabled: boolean;
	isMobile: boolean;
	placeholder: string;
	draft: string | null;
	onEditorReady: (editor: LexicalEditor) => void;
	onSubmit: () => void;
	onCharCountChange?: (length: number) => void;
	className?: string;
	autocompleteAnchorRef?: React.RefObject<HTMLElement | null>;
}

export function FluxerEditor({
	channel,
	channelId,
	disabled,
	isMobile,
	placeholder,
	draft,
	onEditorReady,
	onSubmit,
	onCharCountChange,
	className,
	autocompleteAnchorRef,
}: FluxerEditorProps) {
	const config = createFluxerEditorConfig({
		namespace: `channel-${channelId}`,
		editable: !disabled,
	});

	return (
		<LexicalComposer key={channelId} initialConfig={config}>
			<FluxerEditorShell
				className={className}
				placeholder={placeholder}
			/>
			<HistoryPlugin />
			<ClearEditorPlugin />
			<EditorBridgePlugin onEditorReady={onEditorReady} />
			<ClipboardPlugin />
			<AutocompletePlugin channel={channel} anchorRef={autocompleteAnchorRef} />
			<SubmitPlugin onSubmit={onSubmit} isMobile={isMobile} />
			<MarkdownFormattingPlugin />
			<WordBoundaryPlugin />
			<ContentObserverPlugin channelId={channelId} enabled={!disabled} onCharCountChange={onCharCountChange} />
			<DraftSyncPlugin channelId={channelId} draft={draft} />
			<KeyboardPlugin channelId={channelId} isMobile={isMobile} enabled={!disabled} />
			<AutoFocusPlugin disabled={disabled} isMobile={isMobile} />
		</LexicalComposer>
	);
}

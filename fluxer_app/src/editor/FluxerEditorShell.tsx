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

import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {LexicalErrorBoundary} from '@lexical/react/LexicalErrorBoundary';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {clsx} from 'clsx';
import styles from './FluxerEditor.module.css';

interface FluxerEditorShellProps {
	className?: string;
	placeholder: string;
	spellCheck?: boolean;
}

export function FluxerEditorShell({
	className,
	placeholder,
	spellCheck = true,
}: FluxerEditorShellProps) {
	return (
		<div className={styles.editorContainer}>
			<RichTextPlugin
				contentEditable={
					<ContentEditable
						className={clsx(styles.contentEditable, className)}
						data-channel-textarea
						spellCheck={spellCheck}
						aria-label={placeholder}
						aria-placeholder={placeholder}
						placeholder={<div className={styles.placeholder}>{placeholder}</div>}
					/>
				}
				ErrorBoundary={LexicalErrorBoundary}
			/>
		</div>
	);
}

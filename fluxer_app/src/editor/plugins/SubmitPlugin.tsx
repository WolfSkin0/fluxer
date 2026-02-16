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
	COMMAND_PRIORITY_NORMAL,
	INSERT_LINE_BREAK_COMMAND,
	KEY_ENTER_COMMAND,
} from 'lexical';
import {useEffect} from 'react';

export function SubmitPlugin({
	onSubmit,
	isMobile,
}: {
	onSubmit: () => void;
	isMobile: boolean;
}) {
	const [editor] = useLexicalComposerContext();

	useEffect(() => {
		return editor.registerCommand(
			KEY_ENTER_COMMAND,
			(event) => {
				if (event === null) {
					return false;
				}

					if (event.shiftKey) {
					event.preventDefault();
					editor.dispatchCommand(INSERT_LINE_BREAK_COMMAND, false);
					return true;
				}

				if (isMobile) {
					return false;
				}

				event.preventDefault();
				onSubmit();
				return true;
			},
			COMMAND_PRIORITY_NORMAL,
		);
	}, [editor, onSubmit, isMobile]);

	return null;
}

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

import {
	type AutocompleteOption,
	isMentionMember,
	isMentionRole,
	isMentionUser,
	isSpecialMention,
} from '@app/components/channel/Autocomplete';
import {AutocompleteItem} from '@app/components/channel/AutocompleteItem';
import styles from '@app/components/channel/AutocompleteMention.module.css';
import {StatusAwareAvatar} from '@app/components/uikit/StatusAwareAvatar';
import {useParams} from '@app/lib/router/React';
import GuildStore from '@app/stores/GuildStore';
import * as ColorUtils from '@app/utils/ColorUtils';
import * as NicknameUtils from '@app/utils/NicknameUtils';
import {useLingui} from '@lingui/react/macro';
import {observer} from 'mobx-react-lite';
import type React from 'react';

export const AutocompleteMention = observer(function AutocompleteMention({
	onSelect,
	keyboardFocusIndex,
	hoverIndex,
	options,
	onMouseEnter,
	onMouseLeave,
	rowRefs,
}: {
	onSelect: (option: AutocompleteOption) => void;
	keyboardFocusIndex: number;
	hoverIndex: number;
	options: Array<AutocompleteOption>;
	onMouseEnter: (index: number) => void;
	onMouseLeave: () => void;
	rowRefs?: React.MutableRefObject<Array<HTMLButtonElement | null>>;
}) {
	const {t} = useLingui();
	const {guildId} = useParams() as {guildId?: string};
	const guild = GuildStore.getGuild(guildId ?? '');
	const members = options.filter(isMentionMember);
	const users = options.filter(isMentionUser);
	const roles = options.filter(isMentionRole);
	const specialMentions = options.filter(isSpecialMention);

	const membersOffset = 0;
	const usersOffset = members.length;
	const rolesOffset = members.length + users.length;
	const specialOffset = members.length + users.length + roles.length;

	return (
		<>
			{/* Members section */}
			{members.length > 0 && (
				<>
					<div className={styles.sectionHeader}>{t`Members`}</div>
					{members.map((option, index) => {
						const currentIndex = membersOffset + index;
						return (
							<AutocompleteItem
								key={option.member.user.id}
								icon={<StatusAwareAvatar user={option.member.user} size={24} guildId={guildId} />}
								name={NicknameUtils.getNickname(option.member.user, guild?.id)}
								description={option.member.user.tag}
								isKeyboardSelected={currentIndex === keyboardFocusIndex}
								isHovered={currentIndex === hoverIndex}
								onSelect={() => onSelect(option)}
								onMouseEnter={() => onMouseEnter(currentIndex)}
								onMouseLeave={onMouseLeave}
								innerRef={
									rowRefs
										? (node) => {
												rowRefs.current[currentIndex] = node;
											}
										: undefined
								}
							/>
						);
					})}
				</>
			)}
			{/* Users section (DM channels) */}
			{users.length > 0 && (
				<>
					{members.length === 0 && <div className={styles.sectionHeader}>{t`Users`}</div>}
					{users.map((option, index) => {
						const currentIndex = usersOffset + index;
						return (
							<AutocompleteItem
								key={option.user.id}
								icon={<StatusAwareAvatar user={option.user} size={24} />}
								name={option.user.username}
								description={option.user.tag}
								isKeyboardSelected={currentIndex === keyboardFocusIndex}
								isHovered={currentIndex === hoverIndex}
								onSelect={() => onSelect(option)}
								onMouseEnter={() => onMouseEnter(currentIndex)}
								onMouseLeave={onMouseLeave}
								innerRef={
									rowRefs
										? (node) => {
												rowRefs.current[currentIndex] = node;
											}
										: undefined
								}
							/>
						);
					})}
				</>
			)}
			{/* Roles section */}
			{roles.length > 0 && (
				<>
					<div className={styles.sectionHeader}>{t`Roles`}</div>
					{roles.map((option, index) => {
						const currentIndex = rolesOffset + index;
						return (
							<AutocompleteItem
								key={option.role.id}
								name={
									<span style={{color: option.role.color ? ColorUtils.int2rgb(option.role.color) : undefined}}>
										@{option.role.name}
									</span>
								}
								description={t`Notify users with this role who have permission to view this channel.`}
								isKeyboardSelected={currentIndex === keyboardFocusIndex}
								isHovered={currentIndex === hoverIndex}
								onSelect={() => onSelect(option)}
								onMouseEnter={() => onMouseEnter(currentIndex)}
								onMouseLeave={onMouseLeave}
								innerRef={
									rowRefs
										? (node) => {
												rowRefs.current[currentIndex] = node;
											}
										: undefined
								}
							/>
						);
					})}
				</>
			)}
			{/* Special mentions section (@everyone, @here) */}
			{specialMentions.length > 0 && (
				<>
					<div className={styles.sectionHeader}>{t`Special`}</div>
					{specialMentions.map((option, index) => {
						const currentIndex = specialOffset + index;
						return (
							<AutocompleteItem
								key={option.kind}
								name={option.kind}
								description={
									option.kind === '@everyone'
										? t`Notify everyone who has permission to view this channel.`
										: t`Notify everyone online who has permission to view this channel.`
								}
								isKeyboardSelected={currentIndex === keyboardFocusIndex}
								isHovered={currentIndex === hoverIndex}
								onSelect={() => onSelect(option)}
								onMouseEnter={() => onMouseEnter(currentIndex)}
								onMouseLeave={onMouseLeave}
								innerRef={
									rowRefs
										? (node) => {
												rowRefs.current[currentIndex] = node;
											}
										: undefined
								}
							/>
						);
					})}
				</>
			)}
		</>
	);
});

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

import {matchSorter} from 'match-sorter';
import React from 'react';
import {Permissions} from '@fluxer/constants/src/ChannelConstants';
import type {AutocompleteOption} from '~/components/channel/Autocomplete';
import type {ChannelRecord} from '~/records/ChannelRecord';
import type {GuildMemberRecord} from '~/records/GuildMemberRecord';
import type {UserRecord} from '~/records/UserRecord';
import GuildMemberStore from '~/stores/GuildMemberStore';
import GuildStore from '~/stores/GuildStore';
import type {SearchContext} from '~/stores/MemberSearchStore';
import MemberSearchStore from '~/stores/MemberSearchStore';
import PermissionStore from '~/stores/PermissionStore';
import UserStore from '~/stores/UserStore';

const MEMBER_SEARCH_LIMIT = 25;
const DISPLAY_LIMIT = 10;

const SPECIAL_MENTION_OPTIONS: ReadonlyArray<{type: 'mention'; kind: '@everyone' | '@here'}> = [
	{type: 'mention', kind: '@everyone'},
	{type: 'mention', kind: '@here'},
];

interface ParsedMentionQuery {
	usernameQuery: string;
	tagQuery: string | null;
	hasTagSeparator: boolean;
}

function parseMentionQuery(query: string): ParsedMentionQuery {
	const hashIndex = query.indexOf('#');
	if (hashIndex === -1) {
		return {
			usernameQuery: query,
			tagQuery: null,
			hasTagSeparator: false,
		};
	}
	return {
		usernameQuery: query.slice(0, hashIndex),
		tagQuery: query.slice(hashIndex + 1),
		hasTagSeparator: true,
	};
}

function filterDMUsers(
	users: Array<UserRecord>,
	parsedQuery: ParsedMentionQuery,
): Array<{type: 'mention'; kind: 'user'; user: UserRecord}> {
	let matchedUsers: typeof users;
	if (parsedQuery.hasTagSeparator) {
		const usernameQueryLower = parsedQuery.usernameQuery.toLowerCase();
		const tagQueryLower = parsedQuery.tagQuery?.toLowerCase() ?? '';
		matchedUsers = users.filter(
			(user) =>
				user.username.toLowerCase().startsWith(usernameQueryLower) &&
				(tagQueryLower === '' || user.discriminator.startsWith(tagQueryLower)),
		);
	} else {
		matchedUsers = matchSorter(users, parsedQuery.usernameQuery, {
			keys: ['username', 'tag'],
		});
	}

	return matchedUsers
		.map((user) => ({
			type: 'mention' as const,
			kind: 'user' as const,
			user,
		}))
		.sort((a, b) => a.user.username.toLowerCase().localeCompare(b.user.username.toLowerCase()))
		.slice(0, DISPLAY_LIMIT);
}

function filterGuildMembers(
	membersToUse: Array<GuildMemberRecord>,
	parsedQuery: ParsedMentionQuery,
): Array<{type: 'mention'; kind: 'member'; member: GuildMemberRecord}> {
	let matchedMembers: typeof membersToUse;
	if (parsedQuery.hasTagSeparator) {
		const usernameQueryLower = parsedQuery.usernameQuery.toLowerCase();
		const tagQueryLower = parsedQuery.tagQuery?.toLowerCase() ?? '';
		matchedMembers = membersToUse.filter(
			(member) =>
				(member.user.username.toLowerCase().startsWith(usernameQueryLower) ||
					member.nick?.toLowerCase().startsWith(usernameQueryLower)) &&
				(tagQueryLower === '' || member.user.discriminator.startsWith(tagQueryLower)),
		);
	} else {
		matchedMembers = matchSorter(membersToUse, parsedQuery.usernameQuery, {
			keys: ['nick', 'user.username', 'user.tag'],
		});
	}

	return matchedMembers
		.map((member) => ({
			type: 'mention' as const,
			kind: 'member' as const,
			member,
		}))
		.sort((a, b) => a.member.user.username.toLowerCase().localeCompare(b.member.user.username.toLowerCase()))
		.slice(0, DISPLAY_LIMIT);
}

export function useMentionAutocompleteData(
	channel: ChannelRecord | null,
	query: string | null,
): Array<AutocompleteOption> {
	const [memberSearchResults, setMemberSearchResults] = React.useState<Array<GuildMemberRecord>>([]);
	const searchContextRef = React.useRef<SearchContext | null>(null);
	const currentGuildIdRef = React.useRef<string | null>(null);
	const memberFetchDebounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);

	React.useEffect(() => {
		const context = MemberSearchStore.getSearchContext((results) => {
			const guildId = currentGuildIdRef.current;
			const guildMemberRecords: Array<GuildMemberRecord> = results
				.map((transformed) => {
					if (guildId) {
						const member = GuildMemberStore.getMember(guildId, transformed.id);
						return member ?? null;
					}
					const guilds = GuildStore.getGuilds();
					for (const guild of guilds) {
						const member = GuildMemberStore.getMember(guild.id, transformed.id);
						if (member) {
							return member;
						}
					}
					return null;
				})
				.filter((m): m is GuildMemberRecord => m !== null);

			setMemberSearchResults(guildMemberRecords);
		}, MEMBER_SEARCH_LIMIT);

		searchContextRef.current = context;

		return () => {
			context.destroy();
			searchContextRef.current = null;
			if (memberFetchDebounceTimerRef.current) {
				clearTimeout(memberFetchDebounceTimerRef.current);
				memberFetchDebounceTimerRef.current = null;
			}
		};
	}, []);

	const isGuildFullyLoaded = channel?.guildId ? GuildMemberStore.isGuildFullyLoaded(channel.guildId) : false;

	React.useEffect(() => {
		const context = searchContextRef.current;
		if (!context) return;

		if (query === null || !channel?.guildId) {
			currentGuildIdRef.current = null;
			context.clearQuery();
			setMemberSearchResults([]);
			if (memberFetchDebounceTimerRef.current) {
				clearTimeout(memberFetchDebounceTimerRef.current);
				memberFetchDebounceTimerRef.current = null;
			}
			return;
		}

		const guildId = channel.guildId;
		currentGuildIdRef.current = guildId;

		const cachedMembers = GuildMemberStore.getMembers(guildId);
		if (cachedMembers.length > 0) {
			const cachedMatches = matchSorter(cachedMembers, query, {
				keys: ['nick', 'user.username', 'user.tag'],
			}).slice(0, MEMBER_SEARCH_LIMIT);
			setMemberSearchResults(cachedMatches);
		} else {
			setMemberSearchResults([]);
		}

		if (isGuildFullyLoaded) {
			context.clearQuery();
			setMemberSearchResults([]);
			if (memberFetchDebounceTimerRef.current) {
				clearTimeout(memberFetchDebounceTimerRef.current);
				memberFetchDebounceTimerRef.current = null;
			}
			return;
		}

		context.setQuery(query);
		if (memberFetchDebounceTimerRef.current) {
			clearTimeout(memberFetchDebounceTimerRef.current);
		}
		memberFetchDebounceTimerRef.current = setTimeout(() => {
			void MemberSearchStore.fetchMembersInBackground(query, [guildId]);
			memberFetchDebounceTimerRef.current = null;
		}, 300);
	}, [query, channel?.guildId, isGuildFullyLoaded]);

	return React.useMemo(() => {
		if (query === null || !channel) return [];

		const matchedText = query;
		const canMentionEveryone = PermissionStore.can(Permissions.MENTION_EVERYONE, channel);

		if (!channel.guildId) {
			const users = channel.recipientIds
				.map((id) => UserStore.getUser(id))
				.filter((user): user is NonNullable<typeof user> => user != null);

			const parsedQuery = parseMentionQuery(matchedText);
			const userOptions = filterDMUsers(users, parsedQuery);

			return [...userOptions, ...SPECIAL_MENTION_OPTIONS];
		}

		const membersToUse =
			memberSearchResults.length > 0 ? memberSearchResults : GuildMemberStore.getMembers(channel.guildId ?? '');

		const parsedQuery = parseMentionQuery(matchedText);
		const queryForMatching = parsedQuery.usernameQuery.trim();

		const members = filterGuildMembers(membersToUse, parsedQuery);

		const mentionableRoles = GuildStore.getGuildRoles(channel.guildId ?? '').filter(
			(role) => canMentionEveryone || role.mentionable,
		);

		const matchedRoles = queryForMatching
			? matchSorter(mentionableRoles, queryForMatching, {
					keys: ['name'],
					threshold: matchSorter.rankings.CONTAINS,
				})
			: mentionableRoles;

		const roles = matchedRoles
			.sort((a, b) => b.position - a.position)
			.slice(0, DISPLAY_LIMIT)
			.map((role) => ({
				type: 'mention' as const,
				kind: 'role' as const,
				role,
			}));

		const specialMentions = canMentionEveryone
			? SPECIAL_MENTION_OPTIONS.filter((mention) => {
					if (!queryForMatching) return true;
					return mention.kind.toLowerCase().includes(queryForMatching.toLowerCase());
				})
			: [];

		return [...members, ...roles, ...specialMentions];
	}, [query, channel, memberSearchResults]);
}

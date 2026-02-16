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

import * as ContextMenuActionCreators from '@app/actions/ContextMenuActionCreators';
import * as DraftActionCreators from '@app/actions/DraftActionCreators';
import * as MessageActionCreators from '@app/actions/MessageActionCreators';
import * as ModalActionCreators from '@app/actions/ModalActionCreators';
import {modal} from '@app/actions/ModalActionCreators';
import * as PopoutActionCreators from '@app/actions/PopoutActionCreators';
import * as ScheduledMessageActionCreators from '@app/actions/ScheduledMessageActionCreators';
import {TooManyAttachmentsModal} from '@app/components/alerts/TooManyAttachmentsModal';
import {ChannelAttachmentArea} from '@app/components/channel/ChannelAttachmentArea';
import {ChannelStickersArea} from '@app/components/channel/ChannelStickersArea';
import {EditBar} from '@app/components/channel/EditBar';
import {
	getMentionDescription,
	getMentionTitle,
	MentionEveryonePopout,
} from '@app/components/channel/MentionEveryonePopout';
import {MessageCharacterCounter} from '@app/components/channel/MessageCharacterCounter';
import {ReplyBar} from '@app/components/channel/ReplyBar';
import {ScheduledMessageEditBar} from '@app/components/channel/ScheduledMessageEditBar';
import wrapperStyles from '@app/components/channel/textarea/InputWrapper.module.css';
import {MobileTextareaPlusBottomSheet} from '@app/components/channel/textarea/MobileTextareaPlusBottomSheet';
import {TextareaButton} from '@app/components/channel/textarea/TextareaButton';
import {TextareaButtons} from '@app/components/channel/textarea/TextareaButtons';
import styles from '@app/components/channel/textarea/TextareaInput.module.css';
import {TextareaPlusMenu} from '@app/components/channel/textarea/TextareaPlusMenu';
import {ConfirmModal} from '@app/components/modals/ConfirmModal';
import {ExpressionPickerSheet} from '@app/components/modals/ExpressionPickerSheet';
import {ScheduleMessageModal} from '@app/components/modals/ScheduleMessageModal';
import FocusRing from '@app/components/uikit/focus_ring/FocusRing';
import {openPopout} from '@app/components/uikit/popout/Popout';
import {Scroller, type ScrollerHandle} from '@app/components/uikit/Scroller';
import {FluxerEditor} from '@app/editor/FluxerEditor';
import {clearEditor, serializeEditorToText} from '@app/editor/serialization';
import {useTextareaAttachments} from '@app/hooks/useCloudUpload';
import {useContextMenuHoverState} from '@app/hooks/useContextMenuHoverState';
import {useMarkdownKeybinds} from '@app/hooks/useMarkdownKeybinds';
import {type SendMessageFunction, useMessageSubmission} from '@app/hooks/useMessageSubmission';
import {useSlowmode} from '@app/hooks/useSlowmode';
import {useTextareaExpressionPicker} from '@app/hooks/useTextareaExpressionPicker';
import {type MentionConfirmationInfo} from '@app/hooks/useTextareaSubmit';
import {CloudUpload} from '@app/lib/CloudUpload';
import {ComponentDispatch} from '@app/lib/ComponentDispatch';
import type {ChannelRecord} from '@app/records/ChannelRecord';
import AccessibilityStore from '@app/stores/AccessibilityStore';
import ChannelStickerStore from '@app/stores/ChannelStickerStore';
import DeveloperOptionsStore from '@app/stores/DeveloperOptionsStore';
import DraftStore from '@app/stores/DraftStore';
import KeyboardModeStore from '@app/stores/KeyboardModeStore';
import MessageEditMobileStore from '@app/stores/MessageEditMobileStore';
import MessageEditStore from '@app/stores/MessageEditStore';
import MessageReplyStore from '@app/stores/MessageReplyStore';
import MessageStore from '@app/stores/MessageStore';
import MobileLayoutStore from '@app/stores/MobileLayoutStore';
import PermissionStore from '@app/stores/PermissionStore';
import ScheduledMessageEditorStore from '@app/stores/ScheduledMessageEditorStore';
import UserStore from '@app/stores/UserStore';
import * as ChannelUtils from '@app/utils/ChannelUtils';
import {openFilePicker} from '@app/utils/FilePickerUtils';
import * as FileUploadUtils from '@app/utils/FileUploadUtils';
import {Limits} from '@app/utils/limits/UserLimits';
import {normalizeMessageContent} from '@app/utils/MessageRequestUtils';
import * as MessageSubmitUtils from '@app/utils/MessageSubmitUtils';
import * as PlaceholderUtils from '@app/utils/PlaceholderUtils';
import {Permissions} from '@fluxer/constants/src/ChannelConstants';
import {
	MAX_ATTACHMENTS_PER_MESSAGE,
	MAX_MESSAGE_LENGTH_NON_PREMIUM,
	MAX_MESSAGE_LENGTH_PREMIUM,
} from '@fluxer/constants/src/LimitConstants';
import {$createTextNode, $getRoot, $insertNodes, type LexicalEditor} from 'lexical';
import {$createEmojiNode} from '~/editor/nodes/EmojiNode';
import * as AvatarUtils from '~/utils/AvatarUtils';
import {useLingui} from '@lingui/react/macro';
import {PlusCircleIcon} from '@phosphor-icons/react';
import {clsx} from 'clsx';
import {observer} from 'mobx-react-lite';
import type React from 'react';
import {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';

function readBorderBoxBlockSize(entry: ResizeObserverEntry): number {
	const borderBoxSize = (
		entry as ResizeObserverEntry & {borderBoxSize?: ReadonlyArray<{blockSize: number}> | {blockSize: number}}
	).borderBoxSize;

	if (Array.isArray(borderBoxSize) && borderBoxSize[0] && typeof borderBoxSize[0].blockSize === 'number') {
		return borderBoxSize[0].blockSize;
	}

	if (borderBoxSize && 'blockSize' in borderBoxSize && typeof borderBoxSize.blockSize === 'number') {
		return borderBoxSize.blockSize;
	}

	return (entry.target as HTMLElement).getBoundingClientRect().height;
}

const ChannelTextareaContent = observer(
	({
		channel,
		draft,
		disabled,
		canAttachFiles,
		canSendFavoriteMemeId,
	}: {
		channel: ChannelRecord;
		draft: string | null;
		disabled: boolean;
		canAttachFiles: boolean;
		canSendFavoriteMemeId: boolean;
	}) => {
		const {t, i18n} = useLingui();
		const [isFocused, setIsFocused] = useState(false);
		const [isInputAreaFocused, setIsInputAreaFocused] = useState(false);
		const [charCount, setCharCount] = useState(0);
		const [showAllButtons, setShowAllButtons] = useState(true);
		const [pendingMentionConfirmation, setPendingMentionConfirmation] = useState<MentionConfirmationInfo | null>(null);
		const mentionPopoutKey = useMemo(() => `mention-everyone-${channel.id}`, [channel.id]);
		const mentionModalKey = useMemo(() => `mention-everyone-modal-${channel.id}`, [channel.id]);
		const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
		const [mobilePlusSheetOpen, setMobilePlusSheetOpen] = useState(false);

		const editorRef = useRef<LexicalEditor | null>(null);
		const editorElementRef = useRef<HTMLElement | null>(null);
		const expressionPickerTriggerRef = useRef<HTMLButtonElement>(null);
		const invisibleExpressionPickerTriggerRef = useRef<HTMLDivElement>(null);
		const containerRef = useRef<HTMLDivElement>(null);
		const scrollerRef = useRef<ScrollerHandle>(null);
		const plusButtonRef = useRef<HTMLButtonElement | null>(null);
		useMarkdownKeybinds(isFocused);
		const plusContextMenuOpen = useContextMenuHoverState(plusButtonRef);

		const handleEditorReady = useCallback((editor: LexicalEditor) => {
			editorRef.current = editor;
			editorElementRef.current = editor.getRootElement();
		}, []);

		const textareaHeightRef = useRef<number>(0);
		const handleTextareaHeightChange = useCallback((height: number) => {
			textareaHeightRef.current = height;
		}, []);

		const inputBoxHeightRef = useRef<number | null>(null);
		const pendingLayoutDeltaRef = useRef(0);
		const flushScheduledRef = useRef(false);

		useLayoutEffect(() => {
			const el = containerRef.current;
			if (!el || typeof ResizeObserver === 'undefined') return;

			inputBoxHeightRef.current = null;
			pendingLayoutDeltaRef.current = 0;
			flushScheduledRef.current = false;

			const flush = () => {
				flushScheduledRef.current = false;
				const delta = pendingLayoutDeltaRef.current;
				pendingLayoutDeltaRef.current = 0;
				if (!delta) return;

				ComponentDispatch.dispatch('LAYOUT_RESIZED', {
					channelId: channel.id,
					heightDelta: delta,
				});
			};

			const ro = new ResizeObserver((entries) => {
				const entry = entries[0];
				if (!entry) return;

				const nextHeight = Math.round(readBorderBoxBlockSize(entry));
				const prevHeight = inputBoxHeightRef.current;

				if (prevHeight == null) {
					inputBoxHeightRef.current = nextHeight;
					return;
				}

				const delta = nextHeight - prevHeight;
				if (!delta) return;

				inputBoxHeightRef.current = nextHeight;
				pendingLayoutDeltaRef.current += delta;

				if (!flushScheduledRef.current) {
					flushScheduledRef.current = true;
					queueMicrotask(flush);
				}
			});

			ro.observe(el);
			return () => ro.disconnect();
		}, [channel.id]);

		const showGifButton = AccessibilityStore.showGifButton;
		const showMemesButton = AccessibilityStore.showMemesButton;
		const showStickersButton = AccessibilityStore.showStickersButton;
		const showEmojiButton = AccessibilityStore.showEmojiButton;
		const showMessageSendButton = AccessibilityStore.showMessageSendButton;
		const editingMessageId = MessageEditStore.getEditingMessageId(channel.id);
		const editingMobileMessageId = MessageEditMobileStore.getEditingMobileMessageId(channel.id);
		const mobileLayout = MobileLayoutStore;
		const replyingMessage = MessageReplyStore.getReplyingMessage(channel.id);
		const referencedMessage = replyingMessage ? MessageStore.getMessage(channel.id, replyingMessage.messageId) : null;
		const editingMessage = editingMobileMessageId ? MessageStore.getMessage(channel.id, editingMobileMessageId) : null;
		const currentUser = UserStore.getCurrentUser();
		const maxMessageLength = currentUser?.maxMessageLength ?? MAX_MESSAGE_LENGTH_NON_PREMIUM;
		const premiumMaxLength = Limits.getPremiumValue('max_message_length', MAX_MESSAGE_LENGTH_PREMIUM);
		const maxAttachments = currentUser?.maxAttachmentsPerMessage ?? MAX_ATTACHMENTS_PER_MESSAGE;

		const uploadAttachments = useTextareaAttachments(channel.id);
		const {isSlowmodeActive} = useSlowmode(channel);
		const scheduledMessageEditorState = ScheduledMessageEditorStore.getEditingState();
		const isEditingScheduledMessage = ScheduledMessageEditorStore.isEditingChannel(channel.id);
		const editingScheduledMessage = isEditingScheduledMessage ? scheduledMessageEditorState : null;
		const hasMessageSchedulingAccess = UserStore.getCurrentUser()?.isStaff() ?? false;

		const clearEditorContent = useCallback(() => {
			if (editorRef.current) {
				clearEditor(editorRef.current);
			}
		}, []);

		const {sendMessage, sendOptimisticMessage} = useMessageSubmission({
			channel,
			referencedMessage: referencedMessage ?? null,
			replyingMessage,
			clearSegments: clearEditorContent,
		});

		const handleCancelScheduledEdit = useCallback(() => {
			ScheduledMessageEditorStore.stopEditing();
			DraftActionCreators.deleteDraft(channel.id);
			clearEditorContent();
		}, [channel.id, clearEditorContent]);

		const handleSendMessage: SendMessageFunction = useCallback(
			(...args) => {
				clearEditorContent();
				sendMessage(...args);
			},
			[sendMessage, clearEditorContent],
		);

		const handleMentionConfirmationNeeded = useCallback((info: MentionConfirmationInfo) => {
			setPendingMentionConfirmation(info);
		}, []);

		const handleMentionConfirm = useCallback(() => {
			if (pendingMentionConfirmation) {
				handleSendMessage(pendingMentionConfirmation.content, false, pendingMentionConfirmation.tts);
				setPendingMentionConfirmation(null);
			}
		}, [pendingMentionConfirmation, handleSendMessage]);

		const handleMentionCancel = useCallback(() => {
			setPendingMentionConfirmation(null);
			editorRef.current?.focus();
		}, []);

		useEffect(() => {
			if (!pendingMentionConfirmation) {
				PopoutActionCreators.close(mentionPopoutKey);
				ModalActionCreators.popWithKey(mentionModalKey);
				return;
			}

			if (mobileLayout.enabled) {
				const index = pendingMentionConfirmation.mentionType;
				const title = getMentionTitle(index, pendingMentionConfirmation.roleName);
				const description = getMentionDescription(
					index,
					pendingMentionConfirmation.memberCount,
					pendingMentionConfirmation.roleName,
				);

				ModalActionCreators.pushWithKey(
					modal(() => (
						<ConfirmModal
							title={title}
							description={description}
							primaryText={t`Continue`}
							secondaryText={t`Cancel`}
							onPrimary={() => {
								handleMentionConfirm();
							}}
							onSecondary={() => {
								handleMentionCancel();
							}}
						/>
					)),
					mentionModalKey,
				);

				return () => {
					ModalActionCreators.popWithKey(mentionModalKey);
				};
			}

			const containerElement = containerRef.current;
			if (!containerElement) {
				return;
			}

			openPopout(
				containerElement,
				{
					render: ({onClose}) => (
						<MentionEveryonePopout
							mentionType={pendingMentionConfirmation.mentionType}
							memberCount={pendingMentionConfirmation.memberCount}
							roleName={pendingMentionConfirmation.roleName}
							onConfirm={() => {
								handleMentionConfirm();
								onClose();
							}}
							onCancel={() => {
								handleMentionCancel();
								onClose();
							}}
						/>
					),
					position: 'top-start',
					offsetMainAxis: 8,
					shouldAutoUpdate: true,
					returnFocusRef: editorElementRef as React.RefObject<HTMLElement>,
					onCloseRequest: () => {
						handleMentionCancel();
						return true;
					},
				},
				mentionPopoutKey,
			);

			return () => {
				PopoutActionCreators.close(mentionPopoutKey);
			};
		}, [
			pendingMentionConfirmation,
			mentionPopoutKey,
			mentionModalKey,
			handleMentionConfirm,
			handleMentionCancel,
			mobileLayout.enabled,
		]);

		const getEditorContent = useCallback(() => {
			return editorRef.current ? serializeEditorToText(editorRef.current) : '';
		}, []);

		const hasScheduleContent = charCount > 0 || uploadAttachments.length > 0;
		const canScheduleMessage = hasMessageSchedulingAccess && !disabled && hasScheduleContent;

		const handleOpenScheduleModal = useCallback(() => {
			if (!hasMessageSchedulingAccess) {
				return;
			}
			setIsScheduleModalOpen(true);
		}, [hasMessageSchedulingAccess]);

		const handleOpenMobilePlusSheet = useCallback(() => {
			setMobilePlusSheetOpen(true);
		}, []);

		const handleCloseMobilePlusSheet = useCallback(() => {
			setMobilePlusSheetOpen(false);
		}, []);

		const handleScheduleSubmit = useCallback(
			async (scheduledLocalAt: string, timezone: string) => {
				const actualContent = getEditorContent().trim();
				if (!actualContent && uploadAttachments.length === 0) {
					return;
				}

				const normalized = normalizeMessageContent(actualContent, undefined);

				if (editingScheduledMessage) {
					await ScheduledMessageActionCreators.updateScheduledMessage(i18n, {
						channelId: channel.id,
						scheduledMessageId: editingScheduledMessage.scheduledMessageId,
						scheduledLocalAt,
						timezone,
						normalized,
						payload: editingScheduledMessage.payload,
						replyMentioning: replyingMessage?.mentioning,
					});
					ScheduledMessageEditorStore.stopEditing();
				} else {
					await ScheduledMessageActionCreators.scheduleMessage(i18n, {
						channelId: channel.id,
						content: actualContent,
						scheduledLocalAt,
						timezone,
						messageReference: MessageSubmitUtils.prepareMessageReference(channel.id, referencedMessage),
						replyMentioning: replyingMessage?.mentioning,
						favoriteMemeId: undefined,
						stickers: undefined,
						tts: false,
						hasAttachments: uploadAttachments.length > 0,
					});
				}

				clearEditorContent();
				setIsScheduleModalOpen(false);
			},
			[
				channel.id,
				clearEditorContent,
				getEditorContent,
				editingScheduledMessage,
				referencedMessage,
				replyingMessage?.mentioning,
				setIsScheduleModalOpen,
				uploadAttachments.length,
			],
		);

		const handleFileButtonClick = async () => {
			if (disabled || !canAttachFiles) {
				return;
			}

			const files = await openFilePicker({multiple: true});
			const result = await FileUploadUtils.handleFileUpload(
				channel.id,
				files,
				uploadAttachments.length,
				maxAttachments,
			);

			if (!result.success && result.error === 'too_many_attachments') {
				ModalActionCreators.push(modal(() => <TooManyAttachmentsModal />));
			}
		};

		const handleUploadMessageAsFile = useCallback(async () => {
			if (disabled || !canAttachFiles) {
				return;
			}

			const currentContent = getEditorContent();
			const result = await FileUploadUtils.convertTextToFile(
				channel.id,
				currentContent,
				uploadAttachments.length,
				maxAttachments,
			);

			if (!result.success) {
				if (result.error === 'too_many_attachments') {
					ModalActionCreators.push(modal(() => <TooManyAttachmentsModal />));
				}
				return;
			}

			clearEditorContent();
			DraftActionCreators.deleteDraft(channel.id);
		}, [disabled, canAttachFiles, getEditorContent, channel.id, uploadAttachments.length, maxAttachments, clearEditorContent]);

		useEffect(() => {
			const handleGifSelect = (payload?: unknown) => {
				const {gif, autoSend} = (payload ?? {}) as {gif?: {url: string}; autoSend?: boolean};
				if (!gif) return;
				if (autoSend) {
					sendOptimisticMessage({content: gif.url}, {hasAttachments: false});
				} else {
					const editor = editorRef.current;
					if (editor) {
						editor.update(() => {
							const {$getRoot, $createTextNode, $getSelection, $isRangeSelection} = require('lexical');
							const selection = $getSelection();
							if ($isRangeSelection(selection)) {
								const currentText = $getRoot().getTextContent();
								const prefix = currentText.length > 0 && !currentText.endsWith(' ') ? ' ' : '';
								selection.insertRawText(`${prefix}${gif.url} `);
							}
						});
						editor.focus();
					}
				}
			};
			return ComponentDispatch.subscribe('GIF_SELECT', handleGifSelect);
		}, [sendOptimisticMessage]);

		useEffect(() => {
			const handleStickerSelect = (payload?: unknown) => {
				const {sticker} = (payload ?? {}) as {sticker?: {toJSON: () => unknown}};
				if (!sticker) return;
				sendOptimisticMessage({content: '', stickers: [sticker.toJSON()]}, {hasAttachments: false});
			};
			return ComponentDispatch.subscribe('STICKER_SELECT', handleStickerSelect);
		}, [sendOptimisticMessage]);

		const handleEmojiSelect = useCallback(
			(emoji: {name: string; id?: string; uniqueName?: string; animated?: boolean; surrogates?: string}, shiftKey?: boolean) => {
				const editor = editorRef.current;
				if (editor) {
					editor.update(() => {
						const currentText = $getRoot().getTextContent();
						const needsLeadingSpace = currentText.length > 0 && !currentText.endsWith(' ');

						const nodesToInsert = [];
						if (needsLeadingSpace) {
							nodesToInsert.push($createTextNode(' '));
						}

						if (emoji.id) {
							// Custom emoji: create EmojiNode directly
							const animated = Boolean(emoji.animated);
							const src = AvatarUtils.getEmojiURL({id: emoji.id, animated});
							nodesToInsert.push($createEmojiNode('custom', emoji.name, emoji.id, animated, src, null));
						} else {
							// Unicode emoji: create EmojiNode with unicode data
							const name = emoji.uniqueName ?? emoji.name;
							const unicode = emoji.surrogates ?? null;
							nodesToInsert.push($createEmojiNode('unicode', name, null, false, null, unicode));
						}

						const trailingSpace = $createTextNode(' ');
						nodesToInsert.push(trailingSpace);
						$insertNodes(nodesToInsert);
						trailingSpace.selectEnd();
					});
					editor.focus();
				}

				if (!shiftKey && channel.id) {
					const ExpressionPickerActionCreators = require('~/actions/ExpressionPickerActionCreators');
					ExpressionPickerActionCreators.close();
					PopoutActionCreators.close(`expression-picker-${channel.id}`);
				}
			},
			[channel.id],
		);

		const {expressionPickerOpen, setExpressionPickerOpen, handleExpressionPickerTabToggle, selectedTab} =
			useTextareaExpressionPicker({
				channelId: channel.id,
				onEmojiSelect: handleEmojiSelect,
				expressionPickerTriggerRef,
				invisibleExpressionPickerTriggerRef,
				textareaRef: editorElementRef as React.RefObject<HTMLElement | null>,
			});

		const hasPendingSticker = ChannelStickerStore.getPendingSticker(channel.id) !== null;
		const hasAttachments = uploadAttachments.length > 0;
		const showAttachments = hasAttachments;
		const showStickers = hasPendingSticker;
		const isOverCharacterLimit = charCount > maxMessageLength;

		const checkMentionConfirmation = useCallback(
			(content: string, tts?: boolean): boolean => {
				const guildId = channel.guildId ?? null;
				if (!guildId) return false;

				const ChannelStoreModule = require('~/stores/ChannelStore').default;
				const GuildMemberStoreModule = require('~/stores/GuildMemberStore').default;
				const GuildStoreModule = require('~/stores/GuildStore').default;
				const PresenceStoreModule = require('~/stores/PresenceStore').default;
				const {StatusTypes: ST} = require('@fluxer/constants/src/StatusConstants');

				const ch = ChannelStoreModule.getChannel(channel.id);
				const canMentionEveryone = Boolean(ch && PermissionStore.can(Permissions.MENTION_EVERYONE, ch));

				const MENTION_EVERYONE_THRESHOLD = import.meta.env.DEV ? 0 : 50;
				const ROLE_MENTION_PATTERN = /<@&(\d+)>/g;

				type MType = '@everyone' | '@here' | 'role';
				const mentionCandidates: Array<{mentionType: MType; memberIds: Set<string>; roleId?: string; roleName?: string}> = [];

				const guildMemberCount = GuildMemberStoreModule.getMemberCount(guildId);
				const guildMembers = GuildMemberStoreModule.getMembers(guildId);
				const guildMemberIds = new Set<string>(guildMembers.map((m: {user: {id: string}}) => m.user.id));

				if (guildMemberCount > MENTION_EVERYONE_THRESHOLD && canMentionEveryone) {
					if (content.includes('@everyone')) {
						mentionCandidates.push({mentionType: '@everyone', memberIds: guildMemberIds});
					}
					if (content.includes('@here')) {
						const hereMemberIds = new Set<string>();
						for (const member of guildMembers) {
							const status = PresenceStoreModule.getStatus(member.user.id);
							if (status === ST.OFFLINE || status === ST.INVISIBLE) continue;
							hereMemberIds.add(member.user.id);
						}
						if (hereMemberIds.size > 0) {
							mentionCandidates.push({mentionType: '@here', memberIds: hereMemberIds});
						}
					}
				}

				const guild = GuildStoreModule.getGuild(guildId);
				if (guild) {
					ROLE_MENTION_PATTERN.lastIndex = 0;
					const mentionedRoles = new Set<string>();
					let match: RegExpExecArray | null = null;
					while ((match = ROLE_MENTION_PATTERN.exec(content))) {
						mentionedRoles.add(match[1]);
					}
					if (mentionedRoles.size > 0) {
						for (const roleId of mentionedRoles) {
							if (roleId === guild.id) continue;
							const role = guild.roles[roleId];
							if (!role) continue;
							const roleMemberIds = new Set<string>();
							for (const member of guildMembers) {
								if (member.roles.has(roleId)) {
									roleMemberIds.add(member.user.id);
								}
							}
							if (roleMemberIds.size <= MENTION_EVERYONE_THRESHOLD) continue;
							const canMentionRole = canMentionEveryone || role.mentionable;
							if (!canMentionRole) continue;
							mentionCandidates.push({mentionType: 'role', memberIds: roleMemberIds, roleId, roleName: role.name});
						}
					}
				}

				if (mentionCandidates.length === 0) return false;
				const uniqueMemberIds = new Set<string>();
				for (const candidate of mentionCandidates) {
					candidate.memberIds.forEach((id) => uniqueMemberIds.add(id));
				}
				if (uniqueMemberIds.size === 0) return false;

				const mentionTypePriority: Record<MType, number> = {'@everyone': 3, '@here': 2, role: 1};
				mentionCandidates.sort((a, b) => {
					if (b.memberIds.size !== a.memberIds.size) return b.memberIds.size - a.memberIds.size;
					return mentionTypePriority[b.mentionType] - mentionTypePriority[a.mentionType];
				});

				const highestImpact = mentionCandidates[0];
				handleMentionConfirmationNeeded({
					mentionType: highestImpact.mentionType,
					memberCount: uniqueMemberIds.size,
					content,
					tts,
					roleId: highestImpact.roleId,
					roleName: highestImpact.roleName,
				});
				return true;
			},
			[channel.id, channel.guildId, handleMentionConfirmationNeeded],
		);

		const onSubmit = useCallback(async () => {
			if (isSlowmodeActive && !editingMessage) return;

			const actualContent = getEditorContent().trim();

			if (editingMessage && mobileLayout.enabled) {
				if (!actualContent) {
					MessageActionCreators.showDeleteConfirmation(i18n, {
						message: editingMessage,
						onDelete: () => MessageActionCreators.stopEditMobile(channel.id),
					});
				} else {
					MessageActionCreators.edit(channel.id, editingMessage.id, actualContent).then(() => {
						MessageActionCreators.stopEditMobile(channel.id);
					});
				}
				clearEditorContent();
				return;
			}

			if (!actualContent && uploadAttachments.length === 0 && !hasPendingSticker) return;

			const ReplaceCommandUtils = require('~/utils/ReplaceCommandUtils');
			const replaceCommand = ReplaceCommandUtils.parseReplaceCommand(actualContent);
			if (replaceCommand) {
				const lastMessage = MessageStore.getLastEditableMessage(channel.id);
				if (lastMessage) {
					const newContent = ReplaceCommandUtils.executeReplaceCommand(lastMessage.content, replaceCommand);
					if (newContent !== lastMessage.content) {
						MessageActionCreators.edit(lastMessage.channelId, lastMessage.id, newContent);
					}
				}
				clearEditorContent();
				return;
			}

			const CommandUtils = require('~/utils/CommandUtils');
			if (CommandUtils.isCommand(actualContent)) {
				const parsedCommand = CommandUtils.parseCommand(actualContent);
				if (parsedCommand.type !== 'unknown') {
					if (parsedCommand.type === 'me' || parsedCommand.type === 'spoiler') {
						const transformedContent = CommandUtils.transformWrappingCommands(actualContent);
						if (!checkMentionConfirmation(transformedContent)) {
							handleSendMessage(transformedContent, false);
						}
					} else if (parsedCommand.type === 'tts') {
						if (!checkMentionConfirmation(parsedCommand.content, true)) {
							handleSendMessage(parsedCommand.content, false, true);
						}
					} else {
						try {
							await CommandUtils.executeCommand(parsedCommand, channel.id, channel.guildId ?? undefined);
							clearEditorContent();
							DraftActionCreators.deleteDraft(channel.id);
							const {TypingUtils} = require('~/utils/TypingUtils');
							TypingUtils.clear(channel.id);
							if (parsedCommand.type !== 'msg') {
								MessageActionCreators.stopReply(channel.id);
							}
						} catch (error) {
							console.error('Failed to execute command:', error);
							const errorMessage = CommandUtils.createSystemMessage(
								channel.id,
								`Failed to execute command: ${error instanceof Error ? error.message : 'Unknown error'}`,
							);
							MessageActionCreators.createOptimistic(channel.id, errorMessage.toJSON());
						}
					}
					return;
				}
			}

			if (!checkMentionConfirmation(actualContent)) {
				handleSendMessage(actualContent, false);
			}
		}, [
			channel.id,
			channel.guildId,
			getEditorContent,
			uploadAttachments.length,
			clearEditorContent,
			editingMessage,
			mobileLayout.enabled,
			isSlowmodeActive,
			handleSendMessage,
			hasPendingSticker,
			checkMentionConfirmation,
		]);

		const handleEscapeKey = useCallback(
			(event: KeyboardEvent) => {
				if (event.key !== 'Escape') return;

				if (hasAttachments || hasPendingSticker || replyingMessage) {
					event.preventDefault();

					if (hasAttachments) {
						CloudUpload.clearTextarea(channel.id);
					}

					if (hasPendingSticker) {
						ChannelStickerStore.removePendingSticker(channel.id);
					}

					if (replyingMessage) {
						MessageActionCreators.stopReply(channel.id);
					}

					return;
				}

				if (isInputAreaFocused && KeyboardModeStore.keyboardModeEnabled) {
					event.preventDefault();
					KeyboardModeStore.exitKeyboardMode();
					return;
				}

				if (AccessibilityStore.escapeExitsKeyboardMode) {
					KeyboardModeStore.exitKeyboardMode();
				}
			},
			[
				channel.id,
				hasAttachments,
				hasPendingSticker,
				replyingMessage,
				isInputAreaFocused,
				KeyboardModeStore.keyboardModeEnabled,
				AccessibilityStore.escapeExitsKeyboardMode,
			],
		);

		useEffect(() => {
			const rootElement = editorElementRef.current;
			if (!rootElement) return;
			rootElement.addEventListener('keydown', handleEscapeKey);
			return () => rootElement.removeEventListener('keydown', handleEscapeKey);
		}, [handleEscapeKey]);

		const handleSubmit = useCallback(() => {
			if (isOverCharacterLimit || isEditingScheduledMessage) {
				return;
			}
			onSubmit();
		}, [isOverCharacterLimit, onSubmit, isEditingScheduledMessage]);

		const placeholderText = disabled
			? t`You do not have permission to send messages in this channel.`
			: channel.guildId != null
				? PlaceholderUtils.getChannelPlaceholder(channel.name || t`channel`, t`Message #`, Number.MAX_SAFE_INTEGER)
				: PlaceholderUtils.getDMPlaceholder(
						ChannelUtils.getDMDisplayName(channel),
						channel.isDM() ? t`Message @` : t`Message `,
						Number.MAX_SAFE_INTEGER,
					);

		useEffect(() => {
			const unsubscribe = ComponentDispatch.subscribe('FOCUS_TEXTAREA', (payload?: unknown) => {
				const {channelId, enterKeyboardMode} = (payload ?? {}) as {channelId?: string; enterKeyboardMode?: boolean};
				if (channelId && channelId !== channel.id) return;
				if (disabled) return;
				if (editorRef.current) {
					if (enterKeyboardMode) {
						KeyboardModeStore.enterKeyboardMode(true);
					} else {
						KeyboardModeStore.exitKeyboardMode();
					}
					editorRef.current.focus();
				}
			});
			return unsubscribe;
		}, [channel.id]);

		useEffect(() => {
			if (!canAttachFiles || disabled) return;
			const unsubscribe = ComponentDispatch.subscribe('TEXTAREA_UPLOAD_FILE', (payload?: unknown) => {
				const {channelId} = (payload ?? {}) as {channelId?: string};
				if (channelId && channelId !== channel.id) return;
				handleFileButtonClick();
			});
			return unsubscribe;
		}, [channel.id, canAttachFiles, disabled]);

		useLayoutEffect(() => {
			if (!containerRef.current) return;

			let lastWidth = -1;

			const checkButtonVisibility = () => {
				if (!containerRef.current) return;
				const containerWidthLocal = containerRef.current.offsetWidth;

				if (containerWidthLocal === lastWidth) return;
				lastWidth = containerWidthLocal;

				const shouldShowAll = containerWidthLocal > 500;
				setShowAllButtons(shouldShowAll);
			};

			const resizeObserver = new ResizeObserver(checkButtonVisibility);
			resizeObserver.observe(containerRef.current);
			checkButtonVisibility();

			return () => {
				resizeObserver.disconnect();
			};
		}, [mobileLayout.enabled]);

		const handleCancelEdit = useCallback(() => {
			clearEditorContent();
		}, [clearEditorContent]);

		const handlePlusMenuClick = useCallback(
			(event: React.MouseEvent) => {
				event.preventDefault();
				event.stopPropagation();

				ContextMenuActionCreators.openFromElementTopLeft(event, () => (
					<TextareaPlusMenu
						onUploadFile={handleFileButtonClick}
						onSchedule={handleOpenScheduleModal}
						canSchedule={canScheduleMessage}
						canAttachFiles={canAttachFiles}
						canSendMessages={!disabled}
						textareaValue={getEditorContent()}
						onUploadAsFile={handleUploadMessageAsFile}
					/>
				));
			},
			[
				canAttachFiles,
				canScheduleMessage,
				disabled,
				handleFileButtonClick,
				handleOpenScheduleModal,
				getEditorContent,
				handleUploadMessageAsFile,
			],
		);

		const hasStackedSections = Boolean(
			referencedMessage ||
				(editingMessage && mobileLayout.enabled) ||
				uploadAttachments.length > 0 ||
				hasPendingSticker,
		);

		const topBarContent =
			editingMessage && mobileLayout.enabled ? (
				<EditBar channel={channel} onCancel={handleCancelEdit} />
			) : (
				referencedMessage && (
					<ReplyBar
						replyingMessageObject={referencedMessage}
						shouldReplyMention={replyingMessage?.mentioning ?? false}
						setShouldReplyMention={(mentioning) => MessageActionCreators.setReplyMentioning(channel.id, mentioning)}
						channel={channel}
					/>
				)
			);

		const renderSection = (content: React.ReactNode) => <div className={wrapperStyles.stackSection}>{content}</div>;

		return (
			<>
				{topBarContent && renderSection(<div className={wrapperStyles.topBarContainer}>{topBarContent}</div>)}

				{hasMessageSchedulingAccess &&
					editingScheduledMessage &&
					renderSection(
						<ScheduledMessageEditBar
							scheduledLocalAt={editingScheduledMessage.scheduledLocalAt}
							timezone={editingScheduledMessage.timezone}
							onCancel={handleCancelScheduledEdit}
						/>,
					)}

				<FocusRing
					focusTarget={editorElementRef}
					ringTarget={containerRef}
					offset={0}
					enabled={!disabled && AccessibilityStore.showTextareaFocusRing}
					ringClassName={styles.textareaFocusRing}
				>
					<div
						ref={containerRef}
						className={clsx(
							wrapperStyles.box,
							wrapperStyles.wrapperSides,
							styles.textareaOuter,
							mobileLayout.enabled && styles.textareaOuterMobile,
							hasStackedSections ? wrapperStyles.roundedBottom : wrapperStyles.roundedAll,
							wrapperStyles.bottomSpacing,
							disabled && wrapperStyles.disabled,
							!mobileLayout.enabled && styles.textareaOuterMinHeight,
						)}
					>
						{showAttachments && renderSection(<ChannelAttachmentArea channelId={channel.id} />)}
						{showStickers &&
							renderSection(<ChannelStickersArea channelId={channel.id} hasAttachments={hasAttachments} />)}

						{renderSection(
							<div className={clsx(styles.mainWrapperDense, disabled && wrapperStyles.disabled)}>
								<div className={clsx(styles.uploadButtonColumn, styles.sideButtonPadding)}>
									<TextareaButton
										icon={PlusCircleIcon}
										label={t`Open menu`}
										onClick={handlePlusMenuClick}
										forceHover={plusContextMenuOpen}
										ref={plusButtonRef}
									/>
								</div>

								<div
									className={styles.contentAreaDense}
									onFocus={() => {
										setIsFocused(true);
										setIsInputAreaFocused(true);
									}}
									onBlur={() => {
										setIsFocused(false);
										setIsInputAreaFocused(false);
									}}
								>
									<Scroller ref={scrollerRef} fade={true} className={styles.scroller} key="channel-textarea-scroller">
										<div style={{display: 'flex', flexDirection: 'column'}}>
											<FluxerEditor
												channel={channel}
												channelId={channel.id}
												disabled={disabled}
												isMobile={mobileLayout.enabled}
												placeholder={placeholderText}
												draft={draft}
												onEditorReady={handleEditorReady}
												onSubmit={handleSubmit}
												onCharCountChange={setCharCount}
												className={styles.textarea}
												autocompleteAnchorRef={containerRef}
											/>
										</div>
									</Scroller>
								</div>

								<TextareaButtons
									disabled={disabled}
									showAllButtons={showAllButtons}
									showGifButton={showGifButton}
									showMemesButton={showMemesButton}
									showStickersButton={showStickersButton}
									showEmojiButton={showEmojiButton}
									showMessageSendButton={showMessageSendButton}
									showVoiceMessageButton={false}
									expressionPickerOpen={expressionPickerOpen}
									selectedTab={selectedTab}
									isMobile={mobileLayout.enabled}
									isSlowmodeActive={isSlowmodeActive}
									isOverLimit={isOverCharacterLimit}
									hasContent={charCount > 0}
									hasAttachments={uploadAttachments.length > 0}
									expressionPickerTriggerRef={expressionPickerTriggerRef}
									invisibleExpressionPickerTriggerRef={invisibleExpressionPickerTriggerRef}
									onExpressionPickerToggle={handleExpressionPickerTabToggle}
									onSubmit={handleSubmit}
									disableSendButton={isEditingScheduledMessage}
									channelId={channel.id}
								/>
								{isScheduleModalOpen && hasMessageSchedulingAccess && (
									<ScheduleMessageModal
										onClose={() => setIsScheduleModalOpen(false)}
										onSubmit={handleScheduleSubmit}
										initialScheduledLocalAt={editingScheduledMessage?.scheduledLocalAt}
										initialTimezone={editingScheduledMessage?.timezone}
										title={isEditingScheduledMessage ? t`Reschedule Message` : undefined}
										submitLabel={isEditingScheduledMessage ? t`Update` : undefined}
										helpText={
											isEditingScheduledMessage
												? t`This will modify the existing scheduled message rather than sending immediately.`
												: undefined
										}
									/>
								)}
							</div>,
						)}

						<MessageCharacterCounter
							currentLength={charCount}
							maxLength={maxMessageLength}
							canUpgrade={maxMessageLength < premiumMaxLength}
							premiumMaxLength={premiumMaxLength}
						/>

					</div>
				</FocusRing>

				{mobileLayout.enabled && (
					<>
						<ExpressionPickerSheet
							isOpen={expressionPickerOpen}
							onClose={() => setExpressionPickerOpen(false)}
							channelId={channel.id}
							onEmojiSelect={handleEmojiSelect}
						/>
						<MobileTextareaPlusBottomSheet
							isOpen={mobilePlusSheetOpen}
							onClose={handleCloseMobilePlusSheet}
							onUploadFile={handleFileButtonClick}
							textareaValue={getEditorContent()}
							onUploadAsFile={handleUploadMessageAsFile}
						/>
					</>
				)}
			</>
		);
	},
);

export const ChannelTextarea = observer(({channel}: {channel: ChannelRecord}) => {
	const draft = DraftStore.getDraft(channel.id);
	const forceNoSendMessages = DeveloperOptionsStore.forceNoSendMessages;
	const forceNoAttachFiles = DeveloperOptionsStore.forceNoAttachFiles;

	const disabled = channel.isPrivate()
		? forceNoSendMessages
		: forceNoSendMessages || !PermissionStore.can(Permissions.SEND_MESSAGES, channel);
	const canAttachFiles = channel.isPrivate()
		? !forceNoAttachFiles
		: !forceNoAttachFiles && PermissionStore.can(Permissions.ATTACH_FILES, channel);
	const canEmbedLinks = channel.isPrivate() ? true : PermissionStore.can(Permissions.EMBED_LINKS, channel);
	const canSendFavoriteMemeId = canAttachFiles && canEmbedLinks;

	return (
		<ChannelTextareaContent
			key={channel.id}
			channel={channel}
			disabled={disabled}
			canAttachFiles={canAttachFiles}
			canSendFavoriteMemeId={canSendFavoriteMemeId}
			draft={draft}
		/>
	);
});

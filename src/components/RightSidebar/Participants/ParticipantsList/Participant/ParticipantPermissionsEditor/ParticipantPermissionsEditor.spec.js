import Vuex from 'vuex'
import { createLocalVue, mount } from '@vue/test-utils'
import { cloneDeep } from 'lodash'
import storeConfig from '../../../../../../store/storeConfig'
import { PARTICIPANT, ATTENDEE } from '../../../../../../constants'

import PermissionsEditor from '../../../../../PermissionsEditor/PermissionsEditor.vue'
import ParticipantPermissionsEditor from './ParticipantPermissionsEditor'

describe('ParticipantPermissionsEditor.vue', () => {
	let conversation
	let participant
	let store
	let localVue
	let testStoreConfig

	beforeEach(() => {
		localVue = createLocalVue()
		localVue.use(Vuex)

		participant = {
			displayName: 'Alice',
			inCall: PARTICIPANT.CALL_FLAG.DISCONNECTED,
			actorId: 'alice-actor-id',
			actorType: ATTENDEE.ACTOR_TYPE.USERS,
			participantType: PARTICIPANT.TYPE.USER,
			attendeePermissions: PARTICIPANT.PERMISSIONS.CALL_START
				| PARTICIPANT.PERMISSIONS.PUBLISH_AUDIO
				| PARTICIPANT.PERMISSIONS.PUBLISH_VIDEO,
			attendeeId: 'alice-attendee-id',
			status: '',
			statusIcon: '🌧️',
			statusMessage: 'rainy',
			sessionIds: [
				'session-id-alice',
			],
		}

		const conversationGetterMock = jest.fn().mockReturnValue(conversation)

		testStoreConfig = cloneDeep(storeConfig)
		testStoreConfig.modules.tokenStore.getters.getToken = () => () => 'current-token'
		testStoreConfig.modules.conversationsStore.getters.conversation = () => conversationGetterMock
		// Add a mock function for the action and see if its called and with which arguments
		testStoreConfig.modules.participantsStore.actions.setPermissions = jest.fn()
		store = new Vuex.Store(testStoreConfig)

	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	/**
	 * @param {object} participant Participant with optional user status data
	 */
	const mountParticipantPermissionsEditor = (participant) => {
		return mount(ParticipantPermissionsEditor, {
			localVue,
			store,
			propsData: {
				participant,
				token: 'fdslk033',
			},
		})
	}

	describe('Properly renders the checkboxes when mounted', () => {
		test('Properly renders the call start checkbox', async () => {
			const wrapper = await mountParticipantPermissionsEditor(participant)
			const callStartCheckbox = wrapper.findComponent(PermissionsEditor).findComponent({ ref: 'callStart' })
			expect(callStartCheckbox.vm.$options.propsData.checked).toBe(true)
		})

		test('Properly renders the lobby Ignore checkbox', async () => {
			const wrapper = await mountParticipantPermissionsEditor(participant)
			const lobbyIgnoreCheckbox = wrapper.findComponent(PermissionsEditor).findComponent({ ref: 'lobbyIgnore' })
			expect(lobbyIgnoreCheckbox.vm.$options.propsData.checked).toBe(false)
		})

		test('Properly renders the publish audio checkbox', async () => {
			const wrapper = await mountParticipantPermissionsEditor(participant)
			const publishAudioCheckbox = wrapper.findComponent(PermissionsEditor).findComponent({ ref: 'publishAudio' })
			expect(publishAudioCheckbox.vm.$options.propsData.checked).toBe(true)
		})

		test('Properly renders the publish video checkbox', async () => {
			const wrapper = await mountParticipantPermissionsEditor(participant)
			const publishVideoCheckbox = wrapper.findComponent(PermissionsEditor).findComponent({ ref: 'publishVideo' })
			expect(publishVideoCheckbox.vm.$options.propsData.checked).toBe(true)
		})

		test('Properly renders the publish screen checkbox', async () => {
			const wrapper = await mountParticipantPermissionsEditor(participant)
			const publishScreenCheckbox = wrapper.findComponent(PermissionsEditor).findComponent({ ref: 'publishScreen' })
			expect(publishScreenCheckbox.vm.$options.propsData.checked).toBe(false)
		})
	})

	describe('Dispatches the aciton to set the right permissions', async () => {

		test('Dispatches setPermissions with the correct permissions value when a permission is subtracted', async () => {
			const wrapper = await mountParticipantPermissionsEditor(participant)

			// Add a permission
			wrapper.findComponent(PermissionsEditor).setData({ lobbyIgnore: true })

			// Click the submit button
			await wrapper.findComponent(PermissionsEditor).find({ ref: 'submit' }).trigger('click')

			expect(testStoreConfig.modules.participantsStore.actions.setPermissions).toHaveBeenCalledWith(
				// The first argument is the context object
				expect.anything(),
				expect.objectContaining({
					permissions: PARTICIPANT.PERMISSIONS.CALL_START
						| PARTICIPANT.PERMISSIONS.LOBBY_IGNORE
						| PARTICIPANT.PERMISSIONS.PUBLISH_AUDIO
						| PARTICIPANT.PERMISSIONS.PUBLISH_VIDEO
						| PARTICIPANT.PERMISSIONS.CUSTOM,
				})
			)
		})

		test('Dispatches setPermissions with the correct permissions value when a permission is added', async () => {
			const wrapper = mountParticipantPermissionsEditor(participant)

			// Remove a permission
			wrapper.findComponent(PermissionsEditor).setData({ publishAudio: false })

			// Click the submit button
			await wrapper.findComponent(PermissionsEditor).find({ ref: 'submit' }).trigger('click')

			expect(testStoreConfig.modules.participantsStore.actions.setPermissions).toHaveBeenCalledWith(
				// The first argument is the context object
				expect.anything(),
				expect.objectContaining({
					permissions: PARTICIPANT.PERMISSIONS.CALL_START
						| PARTICIPANT.PERMISSIONS.PUBLISH_VIDEO
						| PARTICIPANT.PERMISSIONS.CUSTOM,
				})
			)
		})
	})
})
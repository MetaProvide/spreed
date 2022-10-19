<!--
  - @copyright Copyright (c) 2021 Marco Ambrosini <marcoambrosini@pm.me>
  -
  - @author Marco Ambrosini <marcoambrosini@pm.me>
  -
  - @license GNU AGPL version 3 or any later version
  -
  - This program is free software: you can redistribute it and/or modify
  - it under the terms of the GNU Affero General Public License as
  - published by the Free Software Foundation, either version 3 of the
  - License, or (at your option) any later version.
  -
  - This program is distributed in the hope that it will be useful,
  - but WITHOUT ANY WARRANTY; without even the implied warranty of
  - MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
  - GNU Affero General Public License for more details.
  -
  - You should have received a copy of the GNU Affero General Public License
  - along with this program. If not, see <http://www.gnu.org/licenses/>.
-->

<template>
	<Modal v-if="modal"
		class="talk-modal"
		size="large"
		@close="closeModal">
		<div class="device-checker">
			<div class="modal-header">
				<button
					class="adminly-close-button"
					@click="closeModal" />
			</div>
			<h2 class="device-checker__title">
				{{ t('spreed', 'Camera and microphone check') }}
			</h2>
			<!-- Preview -->
			<div class="device-checker__preview">
				<!-- eslint-disable-next-line -->
				<video v-show="showVideo"
					ref="video"
					class="preview__video"
					disable-picture-in-picture="true"
					tabindex="-1" />
				<div v-show="!showVideo"
					class="preview__novideo" />
			</div>

			<!--
				Toggle audio and video on and off before starting or joining
				a call.
			-->
			<div class="device-checker__call-preferences">
				<!-- Audio toggle -->
				<button
					v-tooltip="audioButtonTooltip"
					class="device-toggle"
					:aria-label="audioButtonTooltip"
					:disabled="!audioPreviewAvailable"
					@click="toggleAudio">
					<span class="device-toggle__icon">
						<Microphone
							v-if="audioOn"
							title=""
							decorative
							:size="20" />
						<MicrophoneOff
							v-else
							title=""
							decorative
							:size="20" />
					</span>
				</button>
				<VolumeIndicator
					class="indicator"
					:audio-preview-available="audioPreviewAvailable"
					:current-volume="currentVolume"
					:volume-threshold="volumeThreshold"
					:disabled="!audioOn" />

				<!-- Video toggle -->
				<button
					v-tooltip="videoButtonTooltip"
					class="device-toggle"
					:aria-label="videoButtonTooltip"
					:disabled="!videoPreviewAvailable"
					@click="toggleVideo">
					<span class="device-toggle__icon">
						<Video
							v-if="videoOn"
							title=""
							decorative
							:size="20" />
						<VideoOff
							v-else
							title=""
							decorative
							:size="20" />
					</span>
				</button>

				<!-- Blur toggle -->
				<button
					v-if="videoPreviewAvailable && blurPreviewAvailable"
					v-tooltip="blurButtonTooltip"
					class="device-toggle"
					:aria-label="blurButtonTooltip"
					:disabled="!blurPreviewAvailable"
					@click="toggleBlur">
					<span class="device-toggle__icon">
						<Blur
							v-if="blurOn"
							slot="icon"
							:size="20"
							decorative
							title="" />
						<BlurOff
							v-else
							slot="icon"
							:size="20"
							decorative
							title="" />
					</span>
				</button>
			</div>

			<!-- Device selection -->
			<div class="device-checker__device-selection">
				<button v-if="!showDeviceSelection"
					class="select-devices"
					@click="showDeviceSelection = true">
					<span class="select-devices__icon">
						<Cog
							title=""
							decorative
							:size="20" />
					</span>
					<span> {{ t('spreed', 'Choose devices') }}</span>
				</button>
				<template v-if="showDeviceSelection">
					<MediaDevicesSelector kind="audioinput"
						:devices="devices"
						:device-id="audioInputId"
						@update:deviceId="audioInputId = $event" />
					<MediaDevicesSelector kind="videoinput"
						:devices="devices"
						:device-id="videoInputId"
						@update:deviceId="videoInputId = $event" />
				</template>
			</div>
			<CheckboxRadioSwitch :checked.sync="showDeviceChecker"
				class="checkbox">
				{{ t('spreed', 'Always show this dialog before joining a call in this conversation.') }}
			</CheckboxRadioSwitch>

			<!-- Join call -->
			<CallButton
				class="call-button"
				:force-join-call="true" />
		</div>
	</Modal>
</template>

<script>
import Modal from '@nextcloud/vue/dist/Components/Modal'
import Tooltip from '@nextcloud/vue/dist/Directives/Tooltip'
import { devices } from '../../mixins/devices'
import MediaDevicesSelector from '../MediaDevicesSelector.vue'
import Cog from 'vue-material-design-icons/Cog.vue'
import Microphone from 'vue-material-design-icons/Microphone'
import MicrophoneOff from 'vue-material-design-icons/MicrophoneOff'
import Video from 'vue-material-design-icons/Video'
import VideoOff from 'vue-material-design-icons/VideoOff'
import Blur from 'vue-material-design-icons/Blur'
import BlurOff from 'vue-material-design-icons/BlurOff'
import { localMediaModel } from '../../utils/webrtc/index'
import CallButton from '../TopBar/CallButton.vue'
import { subscribe, unsubscribe } from '@nextcloud/event-bus'
import CheckboxRadioSwitch from '@nextcloud/vue/dist/Components/CheckboxRadioSwitch'
import BrowserStorage from '../../services/BrowserStorage'
import VolumeIndicator from '../VolumeIndicator/VolumeIndicator.vue'

export default {
	name: 'DeviceChecker',

	directives: {
		Tooltip,
	},

	components: {
		Modal,
		MediaDevicesSelector,
		Cog,
		Microphone,
		MicrophoneOff,
		Video,
		VideoOff,
		Blur,
		BlurOff,
		CallButton,
		CheckboxRadioSwitch,
		VolumeIndicator,
	},

	mixins: [devices],

	data() {
		return {
			model: localMediaModel,
			modal: false,
			showDeviceSelection: false,
			audioOn: undefined,
			videoOn: undefined,
			blurOn: undefined,
			showDeviceChecker: true,

		}
	},

	computed: {
		displayName() {
			return this.$store.getters.getDisplayName()
		},

		guestName() {
			return this.$store.getters.getGuestName(
				this.$store.getters.getToken(),
				this.$store.getters.getActorId(),
			)
		},

		firstLetterOfGuestName() {
			const customName = this.guestName !== t('spreed', 'Guest') ? this.guestName : '?'
			return customName.charAt(0)
		},

		userId() {
			return this.$store.getters.getUserId()
		},

		token() {
			return this.$store.getters.getToken()
		},

		showVideo() {
			return this.videoPreviewAvailable && this.videoOn
		},

		blurPreviewAvailable() {
			return this.virtualBackground.isAvailable()
		},

		audioButtonTooltip() {
			if (!this.audioPreviewAvailable) {
				return t('spreed', 'No audio')
			}
			return this.audioOn ? t('spreed', 'Mute audio') : t('spreed', 'Unmute audio')
		},

		videoButtonTooltip() {
			if (!this.videoPreviewAvailable) {
				return t('spreed', 'No camera')
			}
			return this.videoOn ? t('spreed', 'Disable video') : t('spreed', 'Enable video')
		},

		blurButtonTooltip() {
			return this.blurOn ? t('spreed', 'Disable background blur') : t('spreed', 'Blur background')
		},
	},

	watch: {
		modal(newValue) {
			if (newValue) {
				this.audioOn = !localStorage.getItem('audioDisabled_' + this.token)
				this.videoOn = !localStorage.getItem('videoDisabled_' + this.token)
				this.blurOn = !!localStorage.getItem('virtualBackgroundEnabled_' + this.token)

				this.initializeDevicesMixin()
			} else {
				this.stopDevicesMixin()
			}
		},

		showDeviceChecker(newValue) {
			if (newValue) {
				BrowserStorage.setItem('showDeviceChecker' + this.token, 'true')
			} else {
				BrowserStorage.setItem('showDeviceChecker' + this.token, 'false')
			}
		},

		audioInputId(audioInputId) {
			if (this.showDeviceSelection && audioInputId && !this.audioOn) {
				this.toggleAudio()
			}
		},

		videoInputId(videoInputId) {
			if (this.showDeviceSelection && videoInputId && !this.videoOn) {
				this.toggleVideo()
			}
		},

		blurOn() {
			this.virtualBackground.setEnabled(this.blurOn)
		},
	},

	mounted() {
		subscribe('talk:device-checker:show', this.showModal)
		subscribe('talk:device-checker:hide', this.closeModal)
	},

	beforeDestroy() {
		unsubscribe('talk:device-checker:show', this.showModal)
		unsubscribe('talk:device-checker:hide', this.closeModal)
	},

	methods: {
		showModal() {
			this.modal = true
		},

		closeModal() {
			this.modal = false
			this.showDeviceSelection = false
		},

		toggleAudio() {
			if (!this.audioOn) {
				localStorage.removeItem('audioDisabled_' + this.token)
				this.audioOn = true
			} else {
				localStorage.setItem('audioDisabled_' + this.token, 'true')
				this.audioOn = false
			}
		},

		toggleVideo() {
			if (!this.videoOn) {
				localStorage.removeItem('videoDisabled_' + this.token)
				this.videoOn = true
			} else {
				localStorage.setItem('videoDisabled_' + this.token, 'true')
				this.videoOn = false
			}
		},

		toggleBlur() {
			if (!this.blurOn) {
				localStorage.setItem('virtualBackgroundEnabled_' + this.token, 'true')
				this.blurOn = true
			} else {
				localStorage.removeItem('virtualBackgroundEnabled_' + this.token)
				this.blurOn = false
			}
		},
	},
}
</script>

<style lang="scss" scoped>
@import '../../assets/variables.scss';
@import '../../assets/avatar.scss';
@include avatar-mixin(64px);
@include avatar-mixin(128px);

.device-checker {
	width: 350px;
	padding: 20px;
	background-color: var(--color-main-background);
	overflow-y: auto;
	overflow-x: hidden;
	&__title {
		text-align: center;
		color: var(--color-main-text);
	}
	&__preview {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		border-radius: 12px;
		background-color: var(--adminly-light-blue) !important;
		height: 200px;
		margin: 1.5rem;
	}

	&__device-selection {
		width: 100%;
		padding-bottom: 1rem;
		padding-top: 1.5rem;
	}

	&__call-preferences {
		height: $clickable-area;
		display: flex;
		justify-content: center;
		align-items: center;
	}
}

.preview {
	&__video {
		max-width: 100%;
		object-fit: contain;
	}

	&__novideo {
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		width: 100%;
		height: 100%;
		background-image: url('../../../img/user.svg');
		background-position: center;
		background-repeat: no-repeat;
	}
}

.select-devices {
	display: flex;
	align-items: center;
	justify-content: center;
	background: none;
	border: none;
	box-shadow: none;
	padding: 0;
	margin: auto;
	&__icon {
		margin-right: 4px;
	}
	opacity: 0.8;
	&:hover,
	&:focus {
		opacity: 1;
	}
}

.device-toggle {
	background: none;
	border: none;
}

.call-button {
	display: flex;
	justify-content: center;
	align-items: center;
	min-width: 150px;
	margin: auto;
	padding-block: 1rem;
}

.checkbox {
	display: flex;
	justify-content: center;
	margin: 14px;
}

.indicator {
	margin-left: -8px;
}

::v-deep .modal-container {
	display: flex !important;
}

.modal-header{
	display: flex;
}

.adminly-close-button {
	margin-left: auto;
	background-image: url('../../../img/close.svg');
	background-position: center;
	background-repeat: no-repeat;
	padding-inline: 1rem !important;
	background-color: white;
	box-shadow: none;
	border: none;
}

.material-design-icon svg {
	color: transparent;
	width: 30px;
	height: 30px;
}

.material-design-icon {
	background-repeat: no-repeat;
	background-position: center;
	background-size: contain;
}

.microphone-icon svg{
	background-image: url('../../../img/adminly-microphone.svg');
}

.microphone-off-icon svg{
	background-image: url('../../../img/adminly-microphone-mute.svg');
}

.video-icon svg{
	background-image: url('../../../img/adminly-video.svg');
}

.video-off-icon svg{
	background-image: url('../../../img/adminly-video-disabled.svg');
}

.blur-icon svg{
	background-image: url('../../../img/adminly-background-blur.svg');
}

.blur-off-icon svg{
	background-image: url('../../../img/adminly-background-blur-off.svg');
}

.cog-icon svg{
	background-repeat: no-repeat;
	width: 31px;
	background-image: url('../../../img/adminly-devices.svg');
}
</style>

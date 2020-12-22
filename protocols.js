const ENDPOINTS = {
  BEGIN_PAIR: '/pairing/start',
  KEY_PRESS: '/key_command/',
  POWER_MODE: '/state/device/power_mode',
  SETTINGS: '/menu_native/dynamic/audio_settings',
  INPUTS: '/menu_native/dynamic/audio_settings/input',
  CURRENT_INPUT: '/menu_native/dynamic/audio_settings/input/current_input',
  VOLUME: '/menu_native/dynamic/audio_settings/audio/volume',
  MUTE: '/menu_native/dynamic/audio_settings/audio/mute'
}

const KEYS = {
  PAUSE: [2, 2],
  PLAY: [2, 3],
  VOL_DOWN: [5, 0],
  VOL_UP: [5, 1],
  MUTE_OFF: [5, 2],
  MUTE_ON: [5, 3],
  MUTE_TOGGLE: [5, 4],
  POW_OFF: [11, 0],
  POW_ON: [11, 1],
  POW_TOGGLE: [11, 2]
}

module.exports = { ENDPOINTS, KEYS }

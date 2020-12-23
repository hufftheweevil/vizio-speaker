let EventEmitter = require('events')
let request = require('request')

const { ENDPOINTS, KEYS } = require('./protocols')

class Speaker extends EventEmitter {
  constructor(host) {
    super()
    this.host = host
    this.settings = new Menu(this, ENDPOINTS.SETTINGS)
    this.settings.on('ready', () => this.emit('ready'))
    this._lastPoll = {}
  }

  sendRequest(method, path = '', data) {
    let options = {
      method,
      url: `https://${this.host}:9000${path}`,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      rejectUnauthorized: false
    }
    if (data) options.body = JSON.stringify(data)

    return new Promise((resolve, reject) => {
      request(options, function (error, response = {}) {
        if (error) {
          if (error.code == 'ETIMEDOUT') console.error(error)
          resolve(error)
        }
        let res = {}
        try {
          res = JSON.parse(response.body)
        } catch (e) {
          res = response.body
        }
        resolve(res)
      })
    })
  }

  async keyCommand([codeset, code]) {
    let data = {
      KEYLIST: [
        {
          CODESET: codeset,
          CODE: code,
          ACTION: 'KEYPRESS'
        }
      ]
    }
    let res = await this.sendRequest('put', ENDPOINTS.KEY_PRESS, data)
    return res?.STATUS?.RESULT
  }

  async pair() {
    let id = 'node-app-' + new Date().getTime()

    let data = {
      DEVICE_NAME: id,
      DEVICE_ID: id
    }
    let res = await this.sendRequest('put', ENDPOINTS.BEGIN_PAIR, data)

    if (res?.STATUS?.RESULT) {
      return res.STATUS.RESULT
    } else {
      throw Error(JSON.stringify(res))
    }
  }

  power = {
    get: async () => {
      let res = await this.sendRequest('get', ENDPOINTS.POWER_MODE)
      let val = res?.ITEMS?.[0]?.VALUE
      return val === 1 ? 'On' : val === 0 ? 'Off' : undefined
    },
    on: () => this.keyCommand(KEYS.POW_ON),
    off: () => this.keyCommand(KEYS.POW_OFF),
    toggle: () => this.keyCommand(KEYS.POW_TOGGLE)
  }

  input = {
    list: async () => {
      let res = await this.sendRequest('get', ENDPOINTS.INPUTS)
      return res?.ITEMS?.map(item => item.NAME).filter(name => name != 'Current Input')
    },
    get: async () => {
      let res = await this.sendRequest('get', ENDPOINTS.CURRENT_INPUT)
      return res?.ITEMS?.[0]?.VALUE
    },
    set: async name => {
      let inputList = await this.input.list()
      let currentInput = await this.input.current()

      if (inputList.STATUS.RESULT !== 'SUCCESS' || currentInput.STATUS.RESULT !== 'SUCCESS')
        throw Error({ list: inputList, current: currentInput })

      let inputName = inputList.ITEMS?.find(
        item =>
          item.NAME.toLowerCase() === name.toLowerCase() ||
          item.VALUE.NAME.toLowerCase() === name.toLowerCase()
      )?.NAME

      if (!inputName) throw Error(`Input: ${name} not found in list:`, inputList)

      let data = {
        REQUEST: 'MODIFY',
        VALUE: inputName,
        HASHVAL: currentInput.ITEMS[0].HASHVAL
      }
      let res = await this.sendRequest('put', ENDPOINTS.CURRENT_INPUT, data)
      return res?.STATUS?.RESULT
    }
  }

  volume = {
    down: () => this.keyCommand(KEYS.VOL_DOWN),
    up: () => this.keyCommand(KEYS.VOL_UP),
    get: async () => {
      let res = await this.sendRequest('get', ENDPOINTS.VOLUME)
      return res?.ITEMS?.[0]?.VALUE
    },
    set: async value => {
      if (typeof value !== 'number') throw Error('value must be a number')
      if (value < 0 || value > 100)
        throw Error('value is out of range, please enter a number between 0 to 100 inclusive')

      let settings = await this.settings.audio.get()
      let volume = settings.ITEMS?.find(i => i.CNAME === 'volume')
      if (!volume) throw Error('no volume setting found')

      let data = {
        REQUEST: 'MODIFY',
        HASHVAL: volume.HASHVAL,
        VALUE: Math.round(value)
      }
      let res = await this.sendRequest('put', ENDPOINTS.VOLUME, data)
      return res?.STATUS?.RESULT
    },
    getMute: async () => {
      let res = await this.sendRequest('get', ENDPOINTS.MUTE)
      return res?.ITEMS?.[0]?.VALUE
    },
    unmute: () => this.keyCommand(KEYS.MUTE_OFF),
    mute: () => this.keyCommand(KEYS.MUTE_ON),
    toggleMute: () => this.keyCommand(KEYS.MUTE_TOGGLE)
  }

  media = {
    play: () => this.keyCommand(KEYS.PLAY),
    pause: () => this.keyCommand(KEYS.PAUSE)
  }

  poll(interval = 60000) {
    if (interval <= 0) return this.stopPoll()
    if (interval < 5000) interval = 5000
    if (this._timer) clearInterval(this._timer)
    this._timer = setInterval(this._poll.bind(this), interval)
    this._poll(true)
  }

  async _poll(init) {
    // If no one else is listening, stop polling
    if (this.listenerCount('change') == 0) return this.stopPoll()
    // Get basic state
    let state = {}
    state.power = await this.power.get()
    state.input = await this.input.get()
    state.volume = await this.volume.get()
    state.mute = await this.volume.getMute()
    // Check if diff
    if (init || JSON.stringify(state) !== JSON.stringify(this._lastPoll)) {
      this.emit('change', state)
      this._lastPoll = state
    }
  }

  stopPoll() {
    clearInterval(this._timer)
    delete this._timer
  }
}

class Menu extends EventEmitter {
  constructor(speaker, path) {
    super()
    this.speaker = speaker
    this.path = path
    this._lastResult = {}
    this.isReady = false
    this.get()
  }
  ready() {
    if (this.isReady) return
    this.isReady = true
    this.emit('ready')
  }
  get cache() {
    let obj = {}
    this.items?.forEach(itemName => {
      let val = this[itemName]?.cache
      if (val) obj[itemName] = val
    })
    return obj
  }
  async get() {
    // Fetch settings at this path
    this._lastResult = await this.speaker.sendRequest('get', this.path)
    // If is menu
    if (this._lastResult.TYPE?.match(/MENU/)) {
      // Make array of next endpoints
      this.items = this._lastResult.ITEMS.map(item => item.CNAME)
      // For each item
      for (let item of this._lastResult.ITEMS) {
        let name = item.CNAME
        let newPath = this.path + '/' + name
        if (item.TYPE.match(/MENU/)) {
          // Sub menu
          if (this[name]) {
            // If already known, propogate get()
            await this[name].get()
          } else {
            // If new, create sub menu
            this[name] = new Menu(this.speaker, newPath)
            this[name].on('ready', this.checkIfReady.bind(this))
          }
        } else {
          // Endpoint setting or action
          if (this[name]) {
            this[name]._lastResult = item
          } else {
            let Maker = item.TYPE.match(/ACTION/) ? Action : Setting
            this[name] = new Maker(this.speaker, newPath, item)
          }
        }
      }
    }
    if (!this.isReady) this.checkIfReady()
    return this.cache
  }
  checkIfReady() {
    if (this.items?.every(name => this[name]?.isReady)) this.ready()
  }
}

class Setting {
  constructor(speaker, path, res) {
    this.speaker = speaker
    this.path = path
    this._lastResult = res
    this.isReady = true
  }
  get cache() {
    let item = this._lastResult
    return item?.VALUE?.NAME == '' ? item?.NAME : item?.VALUE
  }
  async get() {
    let res = await this.speaker.sendRequest('get', this.path)
    this._lastResult = res.ITEMS[0]
    return this.cache
  }
  async set(value) {
    let data = {
      REQUEST: 'MODIFY',
      HASHVAL: this._lastResult.HASHVAL,
      VALUE: value
    }
    return this.speaker.sendRequest('put', this.path, data)
  }
}

class Action {
  constructor(speaker, path, res) {
    this.speaker = speaker
    this.path = path
    this._lastResult = res
    this.isReady = true
  }
  async do() {
    let data = {
      REQUEST: 'ACTION',
      HASHVAL: this._lastResult.HASHVAL
    }
    return this.speaker.sendRequest('put', this.path, data)
  }
}

module.exports = Speaker

# vizio-speaker

Module to communicate with Vizio SmartCast speakers.

(If you need to communicate with Vizio SmartCast TVs, see [heathbar/vizio-smart-cast](https://github.com/heathbar/vizio-smart-cast))

## Example

```JavaScript
let vizio = require('vizio-speaker')
let speaker = new vizio('192.168.0.101')

speaker.input.current().then(console.log)
// example output: 'HDMI'
```

## Installation

```bash
npm install vizio-speaker --save
```

- **Note 1:** There is no discovery. You must know the IP address.
- **Note 2:** Pairing is required only once between each client/speaker pair.

## API

All function calls return a Promise.

### `pair()`

Pairs with speaker if not already done. Resolves to a [Result](#result).

### `power`

| Call             | Description            | Resolves To       |
| ---------------- | ---------------------- | ----------------- |
| `power.get()`    | Get current power mode | [State](#state)   |
| `power.on()`     | Turn speaker on        | [Result](#result) |
| `power.off()`    | Turn speaker off       | [Result](#result) |
| `power.toggle()` | Toggle speaker power   | [Result](#result) |

### `input`

| Call                   | Description                 | Resolves To       |
| ---------------------- | --------------------------- | ----------------- |
| `input.get()`          | Get current input mode      | String            |
| `input.list()`         | Get list of all input modes | Array of String   |
| `input.set(inputName)` | Set input mode              | [Result](#result) |

### `volume`

| Call                  | Description        | Resolves To       |
| --------------------- | ------------------ | ----------------- |
| `volume.get()`        | Get current volume | Number            |
| `volume.up()`         | Increase volume    | [Result](#result) |
| `volume.down()`       | Decrease volume    | [Result](#result) |
| `volume.set(level)`   | Set speaker volume | [Result](#result) |
| `volume.getMute()`    | Get mute state     | [State](#state)   |
| `volume.unmute()`     | Unmute             | [Result](#result) |
| `volume.mute()`       | Mute               | [Result](#result) |
| `volume.toggleMute()` | Toggle mute state  | [Result](#result) |

### `media`

| Call            | Description                   | Resolves To       |
| --------------- | ----------------------------- | ----------------- |
| `media.play()`  | Resume media that was playing | [Result](#result) |
| `media.pause()` | Pause media that is playing   | [Result](#result) |

### `settings`

A [Menu](#menu) object that replicates the menu found in the SmartCast App.

### Types

##### Result

`String` <`SUCCESS`\|`INVALID_PARAMETER`>

##### State

`String` <`On`\|`Off`>

##### Menu

`Object`

- `cache` - An object of the menu's last known settings
- `get()` - A promise to retrieve the latest menu settings
- other keys - Sub [Menu](#menu), [Setting](#setting) or [Action](#action) object

##### Setting

`Object`

- `cache` - The last known value of the setting
- `get()` - A promise to retrieve the latest setting value
- `set(value)` - A promise to change the setting value

##### Action

`Object`

- `do()` - A promise to do the action

import { Ticker } from './ticker.js';
import { audioSamples } from './samples.js';
import { Slider, Tooltip } from './controls.js';

// Resolves the promise at 'time'
function audioTimeTrigger(audioCtx, time) {
	// A little hacky:
	// Play silence and stop at 'time', then catch the 'ended'
	// event to resolve the promise once 'time' has been reached
	// The promise is guaranteed to be resolved after the time specified, never before.
	return new Promise((res, rej) => {
		const source = audioCtx.createBufferSource();
		source.buffer = audioCtx.createBuffer(1, 1, 22050);
		source.connect(audioCtx.destination);
		source.start(time - source.buffer.duration);
		source.stop(time);
		source.addEventListener('ended', res);
	});
}

let loadedImages = false;
let images = {
	'record': null,
	'sample': null,
	'delete': null,
	'volume': null,
	'length': null,
	'snapping': null
}
function loadImages() {
	if (loadedImages) return;
	loadedImages = true;
	for (const name in images) {
		const image = new Image();
		image.onload = () => images[name] = image;
		image.src = `assets/${name}.png`;
	}
}

/**
 * Represents a single clock that gets drawn to the screen
 */
export function Clock(audioCtx) {
	loadImages();

	const gainNode = audioCtx.createGain();
	gainNode.gain.value = 0.7;
	let destination = null;

	// The available divisions to choose from
	const divOptions = [2, 3, 4, 6, 8, 12, 16];

	this.toDelete = false;

	let radius = 80,
	    handleRadius = 0.2 * radius,
	    color = [0, 0, 0].map(x => Math.floor(100 + Math.random() * 155)),
	    position = { x: 0, y: 0 },
	    length = 1,
	    rawBeats = [],
	    beats = [],
	    ticker = null,
	    divisions = 4,
	    bpm = 120,
	    sample = audioSamples[0],
	    timeOffset = 0,
	    showControls = false,
	    recordingState = 0, // 0 - not recording, 1 - counting down, 2 - recording
	    changingControl = false; // If the user is changing a value in the controls using a slider


	/*
	 * The sections of the controls pie that appears when a clock is hovered over
	 */

	const controls = [
		{ name: "Record", image: 'record', action: () => this.recordBeats() },
		{ name: "Change sample", image: 'sample', action: () => this.nextSample() },
		{ name: "Delete", image: 'delete', action: () => {
			this.toDelete = true;
			if (ticker) ticker.stop();
		}},
		{ name: "Volume", image: 'volume', slider: new Slider(
			() => this.getVolume(),
			val => this.setVolume(val),
			0, 1, 0, 0.4,
			() => `Volume: ${Math.round(this.getVolume() * 100)}%`
		)},
		{ name: "Length", image: 'length', slider: new Slider(
			() => this.getLength(),
			val => this.setLength(val),
			1, 12, 1, 4,
			() => `Length: ${this.getLength()} beats`
		)},
		{ name: "Snapping", image: 'snapping', slider: new Slider(
			() => divOptions.indexOf(divisions),
			index => this.setDivisions(divOptions[index]),
			0, divOptions.length - 1, 1, 4,
			() => `Snapping: 1/${divisions}`
		)},
	];


	/*
	 * Functions for time calculations
	 */

	const offsetTime = () => audioCtx.currentTime + timeOffset;
	const realTime = () => audioCtx.currentTime;
	const toOffsetTime = time => time + timeOffset;
	const toRealTime = time => time - timeOffset;
	const timeToAngle = time => 2 * Math.PI * ((time % duration) / duration - 0.25);
	const beatToAngle = beat => 2 * Math.PI * ((beat % length) / length - 0.25);
	const beatToTime = beat => 60 / bpm * beat;
	const timeToBeat = time => bpm / 60 * time;


	/*
	 * Getters and setters
	 */

	this.getPosition = () => position;
	this.setPosition = function(x, y) {
		position = { x, y };
		return this;
	}

	this.getLength = () => length;
	this.setLength = function(val) {
		length = val;
		this.recalculateBeats();
		return this;
	}

	this.getVolume = () => gainNode.gain.value;
	this.setVolume = function(val) {
		gainNode.gain.value = val;
	}

	this.getBPM = () => bpm;
	this.setBPM = function(val) {
		bpm = val;
		this.recalculateBeats();
		return this;
	}

	this.getDivisions = () => divisions;
	this.setDivisions = function(val) {
		divisions = val;
		this.recalculateBeats();
		return this;
	}

	this.getTimeOffset = () => timeOffset;
	this.setTimeOffset = function(val) {
		timeOffset = val;
		this.recalculateBeats();
		return this;
	}


	/*
	 * Other methods
	 */

	/**
	 * Returns a string with this clock's properties
	 */
	this.getDebugString = function() {
		return [
			`radius: ${radius}`,
		    `handleRadius: ${handleRadius}`,
		    `color: ${color}`,
		    `position: ${position.x}, ${position.y}`,
		    `length: ${length} beats`,
		    `volume: ${this.getVolume()}`,
		    `rawBeats: [${rawBeats.join(', ')}]`,
		    `beats: [${beats.join(', ')}]`,
		    `divisions: ${divisions}`,
		    `bpm: ${bpm}`,
		    `sample: ${sample.name}`,
		    `timeOffset: ${timeOffset} s`,
		    `showControls: ${showControls}`,
		    `recordingState: ${["Idle", "Waiting", "Recording"][recordingState]}`,
		].join('\n');
	}

	/**
	 * Click handler for the pie controls
	 */
	this.click = function(x, y) {
		if (!showControls || recordingState > 0) return;
		const rad2 = Math.pow(y - position.y, 2) + Math.pow(x - position.x, 2);
		if (rad2 <= handleRadius*handleRadius) {
			const moveListener = e => this.setPosition(e.clientX, e.clientY);
			window.addEventListener('mousemove', moveListener);
			window.addEventListener('mouseup', () => window.removeEventListener('mousemove', moveListener));
			return;
		}
		const angle = Math.atan2(y - position.y, x - position.x) + Math.PI;
		const index = Math.floor(controls.length * 0.5 * angle / Math.PI);
		const control = controls[index];
		if (control.action) {
			control.action(this);
		}
		if (control.slider) {
			changingControl = true;
			control.slider.startChanging(x, y).then(() => changingControl = false);
		}
	}

	/**
	 * Show controls for changing parameters, will be overridden when recording
	 */
	this.showControls = function() {
		showControls = true;
	}

	/**
	 * Hide controls, show clock face
	 */
	this.hideControls = function() {
		showControls = false;
	}

	/**
	 * Change the clock's sample sound
	 */
	this.nextSample = function() {
		sample = audioSamples[(audioSamples.findIndex(s => s === sample) + 1) % audioSamples.length];
		if (ticker) ticker.setSample(sample);
		return this;
	}

	/**
	 * Is the position (x, y) within the clock?
	 */
	this.containsPosition = function(x, y) {
		const dx = x - position.x;
		const dy = y - position.y;
		return dx * dx + dy * dy < radius * radius;
	}

	/**
	 * Connect the clock to an audio input
	 */
	this.connect = function(dest) {
		gainNode.connect(dest);
		destination = dest;
		return this;
	}

	/**
	 * Should be called when any timing properties (e.g. BPM) are changed
	 */
	this.recalculateBeats = function() {
		this.setBeats(rawBeats);
		return this;
	}

	/**
	 * Provide times in beats that the clock should play
	 * Any beats outside of the range will be removed
	 * Beats will be snapped to 'snapInterval'
	 */
	this.setBeats = function(b) {
		// Save the raw beats so that we can change snapping, bpm etc. later and not lose any notes
		const snapInterval = 1/divisions;
		rawBeats = b;
		beats = rawBeats
		// Snap beats to 'snapInterval'
			.map(t => snapInterval > 0 ? Math.round(t / snapInterval) * snapInterval : t)
		// Remove duplicates
			.filter((val, i, arr) => arr.indexOf(val) === i)
		// Remove beats outside 'length'
			.filter(b => b >= 0 && b < length);

		if (ticker) {
			ticker.setGain(0, 0.5);
			ticker.stop();
		}
		// Make the ticker start at a whole number of lengths
		ticker = new Ticker(audioCtx, sample)
			.loopEvery(beatToTime(length))
			.queueBeats(beats.map(b => beatToTime(b)))
			.connect(gainNode)
			.start(-timeOffset);

		return this;
	}

	/**
	 * Will count down 4 beats (with a metronome) and then begin recording from the start of the next full 'clock length'
	 */
	let recordingListener = null;
	this.recordBeats = function() {
		if (recordingListener) {
			window.removeEventListener('keypress', recordingListener);
			recordingListener = null;
		}
		this.setBeats([]);

		const t = offsetTime();
		const duration = beatToTime(length);
		let startTime = t + (duration - t % duration);
		while (startTime - t < beatToTime(4)) startTime += duration;
		const endTime = startTime + duration;

		(async () => {
			recordingState = 1;

			// Create ticker to count in
			new Ticker(audioCtx, audioSamples.find(s => s.name === "sticks"))
				.queueBeats([0, 1, 2, 3].map(b => beatToTime(b)))
				.connect(destination)
				.start(toRealTime(startTime) - beatToTime(4));

			// Wait until time to start recording
			await audioTimeTrigger(audioCtx, toRealTime(startTime - 0.1)); // 0.1s fudge factor to prevent keypresses at startTime being missed
			recordingState = 2;

			// Add beats as the key is pressed
			const beats = [];
			const recordBeat = e => {
				// Constrain t to be within recording time
				const t = Math.max(startTime, Math.min(endTime, offsetTime()));
				if (['KeyD', 'KeyF', 'KeyJ', 'KeyK'].includes(e.code)) {
					ticker.playNow();
					beats.push(timeToBeat(t - startTime));
					this.setBeats(beats);
				}
			};
			recordingListener = recordBeat;
			window.addEventListener('keypress', recordBeat);

			// Wait for end of recording time
			await audioTimeTrigger(audioCtx, toRealTime(endTime));
			recordingState = 0;
			recordingListener = null;
			window.removeEventListener('keypress', recordBeat);
		})();
	}


	/**
	 * Provide canvas context
	 */
	const background = window.getComputedStyle(document.documentElement).getPropertyValue('--color-background-alt');
	this.render = function(ctx) {
		const currentBeat = timeToBeat(offsetTime());
		const currentBeatInBar = currentBeat % length;

		ctx.fillStyle = background;
		ctx.strokeStyle = `rgb(${color.join(', ')})`;

		// Static border
		ctx.lineWidth = 4;
		ctx.beginPath();
		ctx.arc(Math.floor(position.x), Math.floor(position.y), Math.floor(radius), 0, 2 * Math.PI);
		ctx.fill();
		ctx.stroke();

		if (showControls && !changingControl && recordingState === 0) {
			// Controls pie
			for (let i = 0; i < controls.length; i++) {
				const deltaAngle = 2 * Math.PI / controls.length;
				const lineAngle = i * deltaAngle - Math.PI;
				const endpoint = [position.x + radius * Math.cos(lineAngle), position.y + radius * Math.sin(lineAngle)];
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.moveTo(Math.floor(position.x), Math.floor(position.y));
				ctx.lineTo(...endpoint.map(x => Math.floor(x)));
				ctx.stroke();
				if (controls[i].image && images[controls[i].image]) {
					const imagesize = radius / 3;
					const imageradius = handleRadius + (radius - handleRadius) * 0.54;
					const image = images[controls[i].image];
					const imagepos = [
						position.x + imageradius * Math.cos(lineAngle + deltaAngle/2) - imagesize/2,
						position.y + imageradius * Math.sin(lineAngle + deltaAngle/2) - imagesize/2
					];
					ctx.globalAlpha = 0.7;
					ctx.drawImage(image, ...imagepos.map(x => Math.floor(x)), imagesize, imagesize);
					ctx.globalAlpha = 1;
				}
			}
		} else {
			// Time indicator around border
			ctx.lineWidth = 8;
			ctx.beginPath();
			if (currentBeat % (2 * length) <= length) {
				ctx.arc(Math.floor(position.x), Math.floor(position.y), Math.floor(radius), beatToAngle(0), beatToAngle(currentBeat))
			} else {
				ctx.arc(Math.floor(position.x), Math.floor(position.y), Math.floor(radius), beatToAngle(currentBeat), beatToAngle(0))
			}
			ctx.stroke();

			// Beats and snap indicators
			const snapInterval = 1 / divisions;
			for (let beat = 0; beat < length; beat += snapInterval) {
				const angle = beatToAngle(beat);
				ctx.lineWidth = 2;
				ctx.beginPath();
				if (beats.includes(beat)) {
					ctx.moveTo(Math.floor(position.x), Math.floor(position.y));
					if (currentBeatInBar >= beat && currentBeatInBar - beat < Math.max(snapInterval, 1/16)) ctx.lineWidth = 6;
				} else {
					ctx.moveTo(Math.floor(position.x + 0.9 * radius * Math.cos(angle)), Math.floor(position.y + 0.9 * radius * Math.sin(angle)));
				}
				ctx.lineTo(Math.floor(position.x + radius * Math.cos(angle)), Math.floor(position.y + radius * Math.sin(angle)));
				ctx.stroke();
			}
		}

		// Drag handle
		ctx.lineWidth = 4;
		ctx.beginPath();
		ctx.arc(Math.floor(position.x), Math.floor(position.y), Math.floor(handleRadius), 0, 2 * Math.PI);
		if (recordingState === 2) {
			ctx.fillStyle = "#dd3333";
		}
		ctx.fill();
		ctx.stroke();
	}

}

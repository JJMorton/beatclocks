export function Ticker(audioCtx, sample) {

	const gainNode = audioCtx.createGain();
	let audioBuffer = sample.buffer;
	let queue = []; // The times of beats to be played in ms
	let startTime = 0; // The time that the first beat was played at
	let intervalID = null;
	let repeatInterval = 0;

	window.times = [];
	window.skips = [];

	// Called every 'lookahead' seconds by setInterval()
	const scheduler = () => {
		while (queue.length > 0 && queue[0] + startTime < audioCtx.currentTime + this.scheduleLimit) {
			const time = queue.shift();
			if (repeatInterval > 0) queue.push(time + repeatInterval)
			if (startTime + time >= audioCtx.currentTime) {
				window.times.push(startTime + time);
				const source = audioCtx.createBufferSource();
				source.buffer = audioBuffer;
				source.connect(gainNode);
				source.start(startTime + time);
			} else {
				window.skips.push(startTime + time);
			}
		}
	};

	this.lookahead = 0.025; // Interval to check for beats to schedule (in s)
	this.scheduleLimit = 0.1; // How far in advance notes can be scheduled (in s)

	this.start = function(time = null) {
		startTime = time === null ? audioCtx.currentTime : time;
		intervalID = window.setInterval(scheduler, this.lookahead * 1000);
		return this;
	}

	this.stop = function() {
		window.clearInterval(intervalID);
		intervalID = null;
		return this;
	}

	this.queueBeats = function(times) {
		queue.push(...times);
		return this;
	}

	this.connect = function(dest) {
		gainNode.connect(dest);
		return this;
	}

	this.setGain = function(gain, fade = 0) {
		gainNode.gain.linearRampToValueAtTime(gain, audioCtx.currentTime + fade);
		return this;
	}

	this.playNow = function() {
		const source = audioCtx.createBufferSource();
		source.buffer = audioBuffer;
		source.connect(gainNode);
		source.start(0);
		return this;
	}

	this.setSample = function(sample) {
		audioBuffer = sample.buffer;
		return this;
	}

	this.loopEvery = function(interval) {
		repeatInterval = interval;
		return this;
	}

}

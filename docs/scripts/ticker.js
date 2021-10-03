/**
 * Use to accurately schedule playing an audio clip.
 * Based off this very good article:
 *     https://www.html5rocks.com/en/tutorials/audio/scheduling/
 */
export function Ticker(audioCtx, sample) {

	const gainNode = audioCtx.createGain();
	let audioBuffer = sample.buffer;
	let queue = []; // The times of beats to be played in ms
	let startTime = 0; // The time that the first beat was played at
	let intervalID = null;
	let repeatInterval = 0;

	// Called every 'lookahead' seconds by setInterval().
	// Schedules the playing of all the notes within the next 'this.scheduleLimit' seconds.
	const scheduler = () => {
		while (queue.length > 0 && queue[0] + startTime < audioCtx.currentTime + this.scheduleLimit) {
			const time = queue.shift();
			if (repeatInterval > 0) queue.push(time + repeatInterval)
			if (startTime + time >= audioCtx.currentTime) {
				const source = audioCtx.createBufferSource();
				source.buffer = audioBuffer;
				source.connect(gainNode);
				source.start(startTime + time);
			}
		}
	};

	/**
	 * Interval to check for beats to schedule (in s)
	 */
	this.lookahead = 0.025;

	/**
	 * How far in advance notes can be scheduled (in s)
	 */
	this.scheduleLimit = 0.1;

	/**
	 * Start playing the beats at the specified time (or right now), this can be used to:
	 *   a. Schedule a time to start at in the future
	 *   b. Specify a time in the past that the ticker would have started at (the ticker then
	 *      jumps to the correct position)
	 */
	this.start = function(time = null) {
		startTime = time === null ? audioCtx.currentTime : time;
		intervalID = window.setInterval(scheduler, this.lookahead * 1000);
		return this;
	}

	/**
	 * Stop playing the queued beats, this will not clear the queue.
	 * Any beats within the next 'this.scheduleLimit' will still play, because
	 * they will have been scheduled by the audio API.
	 */
	this.stop = function() {
		window.clearInterval(intervalID);
		intervalID = null;
		return this;
	}

	/**
	 * Times should be specified as a duration after the time at which
	 * the ticker was/will be started. e.g. a time of 0 will play as soon as
	 * the ticker starts.
	 */
	this.queueBeats = function(times) {
		queue.push(...times);
		return this;
	}

	/**
	 * Connect the ticker's output to an audio node with an input.
	 * Nothing will be audiable if this isn't called.
	 */
	this.connect = function(dest) {
		gainNode.connect(dest);
		return this;
	}

	/**
	 * Set the volume of the ticker, with an optional duration over which
	 * the volume should fade to the specified value.
	 */
	this.setGain = function(gain, fade = 0) {
		gainNode.gain.linearRampToValueAtTime(gain, audioCtx.currentTime + fade);
		return this;
	}

	/**
	 * Simply play the ticker's audio sample right now.
	 */
	this.playNow = function() {
		const source = audioCtx.createBufferSource();
		source.buffer = audioBuffer;
		source.connect(gainNode);
		source.start(0);
		return this;
	}

	/**
	 * Set the audio sample for the ticker to play.
	 */
	this.setSample = function(sample) {
		audioBuffer = sample.buffer;
		return this;
	}

	/**
	 * If the passed interval is non-zero, the ticker will requeue every played
	 * note 'interval' seconds later.
	 * Pass an interval of 0 to stop the looping.
	 */
	this.loopEvery = function(interval) {
		repeatInterval = interval;
		return this;
	}

}

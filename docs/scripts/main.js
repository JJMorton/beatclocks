/*
 * TODO:
 * - Create pie controls when hoving over clock
 * - Delete, record, sample, length, snapping, volume
 * - Hide controls while recording (+ recording indicator and visual countdown)
 * 
 * - Audio effects?
 * 
 * - 'sections' that play in sequence, each playing for a specified number of beats
 * - Option to loop single section
 */

import { Ticker } from '/scripts/ticker.js';
import { Clock } from '/scripts/clock.js';
import { audioSamples, fetchSamples } from '/scripts/samples.js';

window.addEventListener('load', async function() {
	'use strict';

	const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
	const gainNode = audioCtx.createGain();
	gainNode.gain.setValueAtTime(0.2, 0);
	gainNode.connect(audioCtx.destination);

	const canvas = document.querySelector('#maincanvas');
	const ctx = canvas.getContext('2d');
	canvasFillWindow(canvas);
	window.addEventListener('resize', () => canvasFillWindow(canvas));
	function canvasFillWindow(canvas) {
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight * 0.95;
	}

	let showDebug = false;
	const debuginfoElt = document.getElementById("debughoverinfo");
	let mousePos = { x: 0, y: 0 };

	// Need to fetch and process the samples before trying to use them
	await fetchSamples(audioCtx);

	const clocks = [];
	let bpm = 100;
	let timeOffset = -0.3; // So that we don't skip the first beat when the page is loading etc.
	const setBPM = function(val) {
		timeOffset = bpm / val * (audioCtx.currentTime + timeOffset) - audioCtx.currentTime;
		bpm = val;
		for (const clock of clocks) {
			clock.setBPM(bpm).setTimeOffset(timeOffset);
		}
	}

	// Add a regular hihat clock to start with
	clocks.push(
		new Clock(audioCtx)
			.setPosition(canvas.width / 2, canvas.height / 2)
			.setLength(2)
			.setTimeOffset(timeOffset)
			.setBPM(bpm)
			.setBeats([0, 0.5, 1])
			.connect(gainNode)
	);

	// Let clocks handle clicks, or add a new clock if clicked background
	canvas.addEventListener('click', e => {
		const clicked = clocks.find(c => c.containsPosition(mousePos.x, mousePos.y));
		if (clicked) {
			clicked.click(mousePos.x, mousePos.y);
		} else {
			clocks.push(
				new Clock(audioCtx)
					.setPosition(mousePos.x, mousePos.y)
					.setLength(4)
					.setBeats([0])
					.setTimeOffset(timeOffset)
					.setBPM(bpm)
					.connect(gainNode)
			);
		}
	});

	// Render loop
	(function animate() {
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		if (showDebug) {
			debuginfoElt.innerText = "Hover a clock to see its debug info";
			debuginfoElt.style.top = `${mousePos.y + 5}px`;
			debuginfoElt.style.left = `${mousePos.x + 5}px`;
		}

		for (const clock of clocks) {
			clock.render(ctx, audioCtx.currentTime);
			if (clock.containsPosition(mousePos.x, mousePos.y)) {
				clock.showControls();
				if (showDebug) debuginfoElt.innerText = clock.getDebugString();
			} else {
				clock.hideControls();
			}
		}


		window.requestAnimationFrame(animate);
	})();

	// UI handlers
	{
		const volumeControl = document.getElementById('volume');
		volumeControl.addEventListener('input', e => {
			gainNode.gain.setValueAtTime(e.target.value, 0);
		});
		volumeControl.value = gainNode.gain.value;

		const BPMControl = document.getElementById('bpm');
		BPMControl.addEventListener('input', e => {
			setBPM(e.target.value);
		});
		BPMControl.value = bpm;

		window.addEventListener('mousemove', e => {
			mousePos = { x: e.pageX, y: e.pageY };
		});

		window.addEventListener('keydown', e => {
			if (e.code === 'ShiftLeft') {
				showDebug = true;
				debuginfoElt.style.display = "block";
			}
		});
		window.addEventListener('keyup', e => {
			if (e.code === 'ShiftLeft') {
				showDebug = false;
				debuginfoElt.style.display = "none";
			}
		});
	}
});

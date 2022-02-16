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

import { Clock } from '/scripts/clock.js';
import { fetchSamples } from '/scripts/samples.js';
import { Slider } from '/scripts/controls.js';

window.addEventListener('load', async function() {
	'use strict';

	const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
	const gainNode = audioCtx.createGain();
	gainNode.gain.setValueAtTime(0.7, 0);
	gainNode.connect(audioCtx.destination);

	const canvas = document.querySelector('#maincanvas');
	const ctx = canvas.getContext('2d', {alpha: false});
	canvasFillWindow(canvas);
	window.addEventListener('resize', () => canvasFillWindow(canvas));
	function canvasFillWindow(canvas) {
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
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
			.setBeats([0, 1])
			.connect(gainNode)
	);

	// Let clocks handle clicks, or add a new clock if clicked background
	canvas.addEventListener('mousedown', e => {
		if (e.button != 0) return;
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
	const background = window.getComputedStyle(document.documentElement).getPropertyValue('--color-background');
	(function animate() {
		ctx.fillStyle = background;
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		if (showDebug) {
			debuginfoElt.innerText = "Hover a clock to see its debug info";
			debuginfoElt.style.top = `${mousePos.y + 5}px`;
			debuginfoElt.style.left = `${mousePos.x + 5}px`;
		}

		for (const clock of clocks) {
			if (clock.toDelete) {
				clocks.splice(clocks.indexOf(clock), 1);
				continue;
			}
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
		window.addEventListener('mousemove', e => {
			mousePos = { x: e.clientX, y: e.clientY };
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

		const BPMElt = document.getElementById('bpm');
		const BPMEltValue = BPMElt.querySelector('.value');
		const BPMSlider = new Slider(() => bpm, val => {
			setBPM(val);
			BPMEltValue.textContent = val.toString().padStart(3, '0');
		}, 50, 200, 1, 40);
		BPMSlider.init();
		BPMElt.addEventListener('mousedown', e => {
			BPMSlider.startChanging(e.clientX, e.clientY);
		});

		const volumeElt = document.getElementById('volume');
		const volumeEltValue = volumeElt.querySelector('.value');
		const volumeSlider = new Slider(() => gainNode.gain.value * 100, val => {
			gainNode.gain.setValueAtTime(val / 100, 0);
			volumeEltValue.textContent = val.toString().padStart(3, '0');
		}, 0, 100, 1, 40);
		volumeSlider.init();
		volumeElt.addEventListener('mousedown', e => {
			volumeSlider.startChanging(e.clientX, e.clientY);
		});
	}
});

/*
 * Just contains the audio samples that are available, so they
 * can be loaded once and imported by anything
 */

function fetchAudioSource(audioCtx, path) {
	return new Promise((res, rej) => {
		const req = new XMLHttpRequest();
		req.open('GET', path);
		req.responseType = 'arraybuffer';
		req.addEventListener('load', () => {
			audioCtx.decodeAudioData(req.response, buffer => {
				res(buffer);
			}, rej);
		});
		req.addEventListener('error', rej);
		req.send();
	});
}

function Sample(name) {
	this.name = name;
	this.buffer = null;
}

export const audioSamples = [
	new Sample('hihat_closed'),
	new Sample('hihat_open'),
	new Sample('kick'),
	new Sample('snare'),
	new Sample('rim'),
	new Sample('timbale_1'),
	new Sample('timbale_2'),
	new Sample('sticks')
];

export async function fetchSamples(audioCtx) {
	for (const source of audioSamples) {
		const audioData = await fetchAudioSource(audioCtx, `/samples/latin/${source.name}.wav`);
		source.buffer = audioData;
	}
}

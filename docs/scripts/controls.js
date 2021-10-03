/**
 * For creating controls that can be changed by dragging the mouse up and down
 * @param getter: Function to fetch the value of the control
 * @param setter: Function to set the value of the control
 * @param min: Minimum value of the control
 * @param max: Maximum value of the control
 * @param step: Interval of allowed values (set to 0 for continuous scale)
 * @param sens: How much the value should change over 100 pixels
 * @param tooltip: Function that returns text to be shown in the tooltip
 */
export function Slider(getter, setter, min, max, step, sens, tooltip = null) {

	const changePerPixel = sens / 100;
	let mouseYStart = 0;
	let valueStart = 0;

	function constrainValue(val) {
		val = Math.max(min, Math.min(max, val)); // Constrain to between min and max
		if (step > 0) val = step * Math.round(val / step); // Only allow intervals of 'step'
		return val;
	}

	/**
	 * Should be called when the mouse is pressed down
	 * Returns a promise that resolves when the user finishes changing the value
	 */
	this.startChanging = function(mouseX, mouseY) {

		let tt = tooltip ? new Tooltip(mouseX, mouseY, tooltip) : null;
		mouseYStart = mouseY;
		valueStart = getter();
		document.body.style.cursor = 'ns-resize';

		function mousemove(e) {
			const deltaY = e.clientY - mouseYStart;
			let val = valueStart - deltaY * changePerPixel;
			setter(constrainValue(val));
		}

		return new Promise((res, rej) => {
			window.addEventListener('mousemove', mousemove);
			window.addEventListener('mouseup', () => {
				window.removeEventListener('mousemove', mousemove);
				document.body.style.cursor = 'default';
				if (tt) tt.remove();
				res();
			});
		});
	};

	this.init = function() {
		setter(constrainValue(getter()));
	};

}

export function Tooltip(x, y, getContent) {
	this.element = document.createElement('p');
	this.element.classList.add('tooltip');
	this.element.textContent = getContent();
	this.element.style.left = x.toString() + 'px';
	this.element.style.top = y.toString() + 'px';
	const listener = function(e) {
		this.element.style.left = e.clientX.toString() + 'px';
		this.element.style.top = e.clientY.toString() + 'px';
		this.element.textContent = getContent();
	}.bind(this);
	window.addEventListener('mousemove', listener);
	document.body.appendChild(this.element);

	this.remove = function() {
		window.removeEventListener('mousemove', listener);
		this.element.remove();
	};
}

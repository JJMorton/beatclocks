/**
 * For creating controls that can be changed by dragging the mouse up and down
 * @param getter: Function to fetch the value of the control
 * @param setter: Function to set the value of the control
 * @param min: Minimum value of the control
 * @param max: Maximum value of the control
 * @param step: Interval of allowed values (set to 0 for continuous scale)
 * @param sens: How much the value should change over 100 pixels
 */
export function Slider(getter, setter, min, max, step, sens) {

	const changePerPixel = sens / 100;
	let mouseYStart = 0;
	let valueStart = 0;

	function constrainValue(val) {
		val = Math.max(min, Math.min(max, val)); // Constrain to between min and max
		if (step > 0) val = step * Math.round(val / step); // Only allow intervals of 'step'
		return val;
	}

	function mousemove(e) {
		const deltaY = e.clientY - mouseYStart;
		let val = valueStart - deltaY * changePerPixel;
		setter(constrainValue(val));
	}

	/**
	 * Should be called when the mouse is pressed down
	 */
	this.startChanging = function(mouseY) {
		mouseYStart = mouseY;
		valueStart = getter();
		document.body.style.cursor = 'ns-resize';
		window.addEventListener('mousemove', mousemove);
		window.addEventListener('mouseup', () => {
			window.removeEventListener('mousemove', mousemove);
			document.body.style.cursor = 'default';
		});
	};

	this.init = function() {
		setter(constrainValue(getter()));
	};

}

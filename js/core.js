
const canvas = document.getElementById('draw_area')
const ctx = canvas.getContext('2d');

var center = [-1, 0];
var scale = 300;

/*
 * From http://beej.us/blog/2010/02/html5s-canvas-part-ii-pixel-manipulation/ 
 */
function setPixel(imageData, x, y, r, g, b, a) {
	index = (x + y * imageData.width) * 4;
	imageData.data[index+0] = r;
	imageData.data[index+1] = g;
	imageData.data[index+2] = b;
	imageData.data[index+3] = a;
}

function getPixel(imageData, x, y) {
	index = (x + y * imageData.width) * 4;
	d = imageData.data;
	return [d[index],
	        d[index+1],
		d[index+2]];
}

get_iteration_color = function(iteration) {
	r = (iteration * 5) % 255;
	g = Math.log(iteration) % 255;
	b = iteration % 255;
	return [r,g,b];
}

scale_x = function(x) {
	return (x - canvas.width / 2) / scale + center[0];
}

scale_y = function(y) {
	return ((canvas.height - y) - canvas.height / 2) / scale + center[1];
}

/*
 * Distance estimator
 */
complex_number = function(a,b) {
	obj = {a: a, b: b};

	obj.mult = function(num) {
		return complex_number(a * num.a - b * num.b,
		                      b * num.a + a * num.b);
	}
	obj.add = function(num) {
		return complex_number(a + num.a, b + num.b);
	}
	obj.magnitude = function() {
		return Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2));
	}
	return obj;
}

distance_estimator = function(z_a, z_b) {
	var iterations = 0;
	var z = complex_number(scale_x(z_a), scale_y(z_b));
	var c = z;
	var dz = complex_number(0, 0);
	var z2;

	const escape_radius = 2.0;

	var still_iterating = true
	while (z.magnitude() < escape_radius && iterations < max_iteration) {
		z2 = z.mult(z).add(c);
		dz = complex_number(2, 0).mult(z).mult(dz).add(complex_number(1,0));
		z = z2;
		iterations = iterations + 1;
	}
	const z_mag = z.magnitude();
	const dz_mag = dz.magnitude();
	return Math.log(z_mag*z_mag) * z_mag / dz_mag;
}

distance_estimator_color = function(x, y) {
	d = distance_estimator(x, y);
	if (d < 0.005)
		return [0,0,0];
	else
		return [255,255,255];
}

/*
 * Algorithm from http://en.wikipedia.org/wiki/Mandelbrot_set#For_programmers
 */
escape_iterations = function(x_raw, y_raw, max_iterations, old_data) {
	if (old_data && old_data.finished)
		return old_data;

	const x0 = scale_x(x_raw);
	const y0 = scale_y(y_raw);

	var a = 0;
	var b = 0;

	var iteration = 0;

	if (old_data) {
		a = old_data.a;
		b = old_data.b;
		iteration = old_data.iteration;
		max_iterations += iteration;
	}

	while (a*a + b*b < 4 && iteration < max_iterations) {
		xtemp = a*a - b*b + x0;
		b = 2*a*b + y0;
		a = xtemp;
		iteration = iteration + 1;
	}

	const result = {iteration: iteration, a: a, b: b};

	if (a*a + b*b < 4)
		result.finished = false;
	else
		result.finished = true;

	return result;
}

const section_size = 100;
const x_sections = canvas.width / section_size;
const y_sections = canvas.height / section_size;

var drawing = false;

/* 
 * Idea from http://www.html5rocks.com/en/tutorials/canvas/imagefilters/
 */
grey_image = function() {
	const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
	const data = imageData.data;
	for (var i = 0; i < data.length; i += 4) {
		data[i]   += 30;
		data[i+1] += 30;
		data[i+2] += 30;
	}
	ctx.putImageData(imageData, 0, 0);
}

get_data_at = function(data, x, y, width) {
	return data[x + y*width];
}

calculate_section_rectangular = function(section_x, section_y, width, height, total_width, data) {
	first_value = escape_iterations(section_x, section_y);

	draw_all = false;
	for (x = 0; x < width; x++) {
		if (! (first_value == escape_iterations(section_x + x, section_y) &&
		       first_value == escape_iterations(section_x + x, section_y + height - 1)))
			draw_all = true;
			break;
	}

	if (! draw_all) {
		for (y = 0; y < height; y++) {
			if (! (first_value == escape_iterations(section_x, section_y + y) &&
			       first_value == escape_iterations(section_x + width - 1, section_y + y))) {
				draw_all = true;
				break;
			}
		}
	}
	
	const result = [];
	if (draw_all) {
		const half_width = Math.floor(width / 2);
		const half_height = Math.floor(height / 2);
		calculate_section(section_x,              section_y,               half_width, half_height, total_width, data);
		calculate_section(section_x + half_width, section_y,               half_width, half_height, total_width, data);
		calculate_section(section_x,              section_y + half_height, half_width, half_height, total_width, data);
		calculate_section(section_x + half_width, section_y + half_height, half_width, half_height, total_width, data);
	}
	else {
		for (x = 0; x < width; x++) {
			for (y = 0; y < height; y++) {
				const g_x = x + section_x;
				const g_y = y + section_y;
				const index = g_x + g_y * total_width;
				data[index] = escape_iterations(g_x, g_y);
			}
		}
	}
}

calculate_section = function(section_x, section_y, max_iterations, section_data) {
	var index;
	const result = new Array(section_size * section_size);
	if (! section_data)
		section_data = [];
	if (! max_iterations)
		max_iterations = 50;
	for (var x = 0; x < section_size; x++) {
		for (var y = 0; y < section_size; y++) {
			index = x + y * section_size;
			result[index] = escape_iterations(section_x + x, section_y + y, max_iterations, section_data[index]);
		}
	}
	return result;
}

draw_section = function(section_x, section_y, max_iterations, section_data) {
/*	data = new Array(section_size * section_size);
	calculate_section(section_x, section_y, section_size, section_size, section_size, data)
	for (x = 0; x < section_size; x++) {
		for (y = 0; y < section_size; y++) {
			const g_x = x + section_x;
			const g_y = y + section_y;
			const index = g_x + g_y * section_size;
			const iter = data[index];
			if (iter == null)
				color = [0,0,0];
			else
				color = get_iteration_color(iter);
			setPixel(section_imageData, x, y, color[0],color[1],color[2],0xff)
		}
	}
	*/
	const calculated = calculate_section(section_x, section_y, max_iterations, section_data);
	const section_imageData = ctx.createImageData(section_size, section_size);

	var index, iter;
	for (var x = 0; x < section_size; x++) {
		for (var y = 0; y < section_size; y++) {
			index = x + y * section_size;
			iter = calculated[index];
			var color;
			if (iter.finished)
				color = get_iteration_color(iter.iteration);
			else
				color = [0,0,0];
			setPixel(section_imageData, x, y, color[0], color[1], color[2], 0xff)
		}
	}
	ctx.putImageData(section_imageData, section_x, section_y);
	return calculated;
}

/*
 * setInterval idea from http://www.sitepoint.com/multi-threading-javascript/
 */
var new_draw_toggle = false;
draw = function() {
	const current_new_draw_toggle = new_draw_toggle;

	var index;

	var refine_iteration = 0;
	var max_iterations = 100;
	grey_image();
	var x = 0;
	var y = 0;

	const sections_data = new Array(x_sections * y_sections);
	busy = false;
	const timer = setInterval(function() {
		if (! (new_draw_toggle === current_new_draw_toggle)) {
			clearInterval(timer);
			return;
		}
		if (!busy) {
			busy = true;
			if (x >= x_sections) {
				if (y + 1 >= y_sections) {
					x = 0;
					y = 0;
					refine_iteration += 1;
					if (refine_iteration > 4) {
						clearInterval(timer);
						return;
					}
				}
				else {
					y += 1;
					x = 0;
				}
			}
			index = x + y * x_sections;
			sections_data[index] = draw_section(x * section_size, y * section_size, max_iterations, sections_data[index]);
			x += 1;
			busy = false;
		}
	}, 100);
}

/*
 * From: http://answers.oreilly.com/topic/1929-how-to-use-the-canvas-and-draw-elements-in-html5/
 */
function getCursorPosition(e) {
	var x;
	var y;
	if (e.pageX || e.pageY) {
		x = e.pageX;
		y = e.pageY;
	}
	else {
		x = e.clientX + document.body.scrollLeft +
			document.documentElement.scrollLeft;
		y = e.clientY + document.body.scrollTop +
			document.documentElement.scrollTop;
	}

	x -= canvas.offsetLeft;
	y -= canvas.offsetTop;
	return [x, y];
}

canvas.onclick = function (e) {
	if(!drawing) {
		new_draw_toggle = ! new_draw_toggle;
		const pos = getCursorPosition(e);
		center = [scale_x(pos[0]), scale_y(pos[1])];
		scale *= 3;
		draw();
	}
}

draw();


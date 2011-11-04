
const canvas = document.getElementById('draw_area')
const ctx = canvas.getContext('2d');

const max_iteration = 100;

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

/*
 * Algorithm from http://en.wikipedia.org/wiki/Mandelbrot_set#For_programmers
 */
pixel_color = function(x_raw, y_raw) {
	const x0 = scale_x(x_raw);
	const y0 = scale_y(y_raw);

	var a = 0;
	var b = 0;

	var iteration = 0;

	while (a*a + b*b < 4 && iteration < max_iteration) {
		xtemp = a*a - b*b + x0;
		b = 2*a*b + y0;
		a = xtemp;
		iteration = iteration + 1;
	}

	if (a*a + b*b < 4)
		return "black";
	else
		return iteration;
}


const section_size = 100;
const x_sections = canvas.width / section_size;
const y_sections = canvas.height / section_size;

const section_imageData = ctx.createImageData(section_size, section_size);
var drawing = false;

/* 
 * From http://www.html5rocks.com/en/tutorials/canvas/imagefilters/
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

draw_section = function(section_x, section_y) {
	for (x = 0; x < section_size; x++) {
		for (y = 0; y < section_size; y++) {
			var color;
			/*d = distance_estimator(section_x + x, section_y + y);
			if (d < 0.005)
				color = [0,0,0];
			else
				color = [255,255,255];*/
			color_raw = pixel_color(section_x + x, section_y + y);
			if (color_raw === 'black')
				color = [0,0,0];
			else
				color = get_iteration_color(color_raw);
			setPixel(section_imageData, x, y, color[0], color[1], color[2], 0xff)
		}
	}
	ctx.putImageData(section_imageData, section_x, section_y);
}

/*
 * Idea from http://www.sitepoint.com/multi-threading-javascript/
 */
draw = function() {
	grey_image();
	drawing = true;
	var x = 0;
	var y = 0;

	busy = false;
	const timer = setInterval(function() {
		if (!busy) {
			busy = true;
			if (x > x_sections) {
				if (y > y_sections) {
					clearInterval(timer);
					drawing = false;
					return;
				}
				else {
					y += 1;
					x = 0;
				}
			}
			draw_section(x * section_size, y * section_size);
			x += 1;
			busy = false;
		}
	}, 50);
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
		const pos = getCursorPosition(e);
		center = [scale_x(pos[0]), scale_y(pos[1])];
		scale *= 3;
		draw();
	}
}

draw();


const canvas = document.getElementById('draw_area')
const ctx = canvas.getContext('2d');

var center = [-1, 0];
var scale = 300;

log2 = function(v) {
	return Math.log(v) / Math.log(2);
}

/*
 * Float comparison, from:
 * http://support.microsoft.com/kb/69333
 */
float_equal = function(a, b, accuracy) {
	if (!accuracy)
		accuracy = 1e15;
	return Math.abs(a - b) <= Math.abs(b) / accuracy;
}

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

/*
 * From http://jsres.blogspot.com/2008/01/convert-hsv-to-rgb-equivalent.html
 */
function hsv2rgb(h,s,v) {
// Adapted from http://www.easyrgb.com/math.html
// hsv values = 0 - 1, rgb values = 0 - 255
var r, g, b;
var RGB = new Array();
if(s==0){
  RGB['red']=RGB['green']=RGB['blue']=Math.round(v*255);
}else{
  // h must be < 1
  var var_h = h * 6;
  if (var_h==6) var_h = 0;
  //Or ... var_i = floor( var_h )
  var var_i = Math.floor( var_h );
  var var_1 = v*(1-s);
  var var_2 = v*(1-s*(var_h-var_i));
  var var_3 = v*(1-s*(1-(var_h-var_i)));
  if(var_i==0){ 
    var_r = v; 
    var_g = var_3; 
    var_b = var_1;
  }else if(var_i==1){ 
    var_r = var_2;
    var_g = v;
    var_b = var_1;
  }else if(var_i==2){
    var_r = var_1;
    var_g = v;
    var_b = var_3
  }else if(var_i==3){
    var_r = var_1;
    var_g = var_2;
    var_b = v;
  }else if (var_i==4){
    var_r = var_3;
    var_g = var_1;
    var_b = v;
  }else{ 
    var_r = v;
    var_g = var_1;
    var_b = var_2
  }
  //rgb results = 0 ÷ 255  
  RGB['red']=Math.round(var_r * 255);
  RGB['green']=Math.round(var_g * 255);
  RGB['blue']=Math.round(var_b * 255);
  }
return RGB;  
};

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

complex_magnitude = function(a, b) {
	return a*a + b*b;
}

/*
 * Algorithm from http://en.wikipedia.org/wiki/Mandelbrot_set#For_programmers
 */
calculate_pixel = function(x_raw, y_raw, max_iterations, old_data) {
	if (old_data && old_data.finished)
		return old_data;

	const x0 = scale_x(x_raw);
	const y0 = scale_y(y_raw);

	var z_a = scale_x(x_raw);
	var z_b = scale_y(y_raw);

	const c_a = z_a,
	      c_b = z_b;

//	var z_a_fast = z_a;
//	var z_b_fast = z_b;

	var dz_a = 0;
	var dz_b = 0;

	var iteration = 0;
//	var iteration_fast = 0;
	
	if (old_data) {
		z_a = old_data.z_a;
		z_b = old_data.z_b;
		dz_a = old_data.dz_a;
		dz_b = old_data.dz_b;
//		z_a_fast = old_data.z_a_fast;
//		z_b_fast = old_data.z_b_fast;
		iteration = old_data.iteration;
//		iteration_fast = old_data.iteration_fast;
		max_iterations += iteration;
	}

	var orbit_found = false;
	var escaped = false;
	var escaped_fast = false;

	var dz_a_new, z_a_new;
	while ((! (orbit_found || escaped || escaped_fast)) && iteration < max_iterations) {
		
		dz_a_new = 2 * (z_a * dz_a - z_b * dz_b) + 1;
		dz_b = 2 * (z_a * dz_b + dz_a * z_b);
		dz_a = dz_a_new;

		z_a_new = z_a * z_a - z_b * z_b + c_a;
		z_b = 2 * z_a * z_b + c_b;
		z_a = z_a_new;

/*		for (var i = 0; i < 2; i++) {
			z_a_fast_new = z_a_fast * z_a_fast - z_b_fast * z_b_fast + x0;
			z_b_fast = 2 * z_a_fast * z_b_fast + y0;
			z_a_fast = z_a_fast_new;
		}
*/		

/*		if (float_equal(z_a, z_a_fast) && float_equal(z_b, z_b_fast)) {
			orbit_found = true;
			break;
		}
		*/
		if (complex_magnitude(z_a, z_b) > 4) {
			escaped = true;
			break;
		}
		/*
		else if (complex_magnitude(z_a_fast, z_b_fast) > 4) {
			escaped_fast = true;
			break;
		}
		*/

		iteration += 1;
		//iteration_fast += 1;
	}

	const z_mag = z_a * z_a + z_b * z_b,
	      dz_mag = dz_a * dz_a + dz_b * dz_b,
	      distance_estimate = Math.log(z_mag*z_mag) * z_mag / dz_mag;

	const result = {
		distance_estimate: distance_estimate
	};

	if (escaped) { //(escaped || escaped_fast || orbit_found) {
		result.finished = true;
	//	if (escaped) 
		result.iteration = iteration;
/*		else if (escaped_fast)
			result.iteration = iteration_fast;
		else if (orbit_found) {
			result.orbit_found = true;
		}
*/
	}
	else {
		result.finished = false;
		result.z_a = z_a;
		result.z_b = z_b;
		result.dz_a = dz_a;
		result.dz_b = dz_b;
//		result.z_a_fast = z_a_fast;
//		result.z_b_fast = z_b_fast;
		result.iteration = iteration;
//		result.iteration_fast = iteration_fast;
	}

	return result;
}

const section_size = 100;
const x_sections = canvas.width / section_size;
const y_sections = canvas.height / section_size;

/* 
 * Idea from http://www.html5rocks.com/en/tutorials/canvas/imagefilters/
 */
grey_image = function() {
	const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
	const data = imageData.data;
	for (var i = 0; i < data.length; i += 4) {
		data[i]   += 10;
		data[i+1] += 10;
		data[i+2] += 10;
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
			result[index] = calculate_pixel(section_x + x, section_y + y, max_iterations, section_data[index]);
		}
	}
	return result;
}

draw_section = function(section_x, section_y, max_iterations, section_data) {
/*	data = new Array(section_size * section_size);
	calculate_section_rectangular(section_x, section_y, section_size, section_size, section_size, data)
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

	var index, c, color, hue, brightness;
	for (var x = 0; x < section_size; x++) {
		for (var y = 0; y < section_size; y++) {
			index = x + y * section_size;
			c = calculated[index];
			color = [];
			if (!c.finished) //(c.distance_estimate < 1e-5)
				color['red'] = color['green'] = color['blue'] = 255;
			else if (c.distance_estimate < 1e-5)
				color['red'] = color['green'] = color['blue'] = 0;
			else {
				iterations = c.iterations;
				hue = (360 * Math.log(iterations) / Math.log(2)) % 360;
				if ((iterations % 2) === 1)
					hue = (hue + 20) % 360;

				brightness = c.distance_estimate;
				color = hsv2rgb(hue, brightness, 1);
			}
			setPixel(section_imageData, x, y, color['red'], color['green'], color['blue'], 0xff)
		}
	}
	ctx.putImageData(section_imageData, section_x, section_y);
	return calculated;
}

/*
 * setInterval idea from http://www.sitepoint.com/multi-threading-javascript/
 * Uses 'Successive Dwell Limit' explained here:
 * http://mrob.com/pub/muency/automaticdwelllimit.html
 */
var new_draw_toggle = false;
draw = function() {
	const current_new_draw_toggle = new_draw_toggle;
	var current_time = (new Date()).getTime();

	var index;

	var refine_iteration = 0;
	var max_iterations = 50;
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
					console.log('drawing took', ((new Date()).getTime() - current_time) / 1000, 'seconds');
					current_time = (new Date()).getTime();
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
	new_draw_toggle = ! new_draw_toggle;
	const pos = getCursorPosition(e);
	center = [scale_x(pos[0]), scale_y(pos[1])];
	scale *= 3;
	grey_image();	
	draw();
}

draw();


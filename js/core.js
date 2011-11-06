
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
	var index = (x + y * imageData.width) * 4;
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
	var index = (x + y * imageData.width) * 4;
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
calculate_pixel = function(x_raw, y_raw, max_iterations, data) {
	if (data && data.finished)
		return data;

	if(! data) {
		data = {
			c_a: scale_x(x_raw),
			c_b: scale_y(y_raw),
			z_a: 0,
			z_b: 0,
			dz_a: 0,
			dz_b: 0,
			iteration: 0,
                }
	}
	max_iterations += data.iteration;

	var escaped = false;
	var iteration = data.iteration;

	var dz_a_new, z_a_new;
	while (! escaped && iteration < max_iterations) {

		dz_a_new = 2 * (data.z_a * data.dz_a - data.z_b * data.dz_b) + 1;
		data.dz_b = 2 * (data.z_a * data.dz_b + data.dz_a * data.z_b);
		data.dz_a = dz_a_new;

		z_a_new = data.z_a * data.z_a - data.z_b * data.z_b + data.c_a;
		data.z_b = 2 * data.z_a * data.z_b + data.c_b;
		data.z_a = z_a_new;
		
		if (complex_magnitude(data.z_a, data.z_b) > 4) {
			escaped = true;
			break;
		}
		iteration += 1;
	}

	data.escaped = escaped;
	data.iteration = iteration;

	if (escaped) {
		data.finished = true;

		const z_mag = data.z_a * data.z_a + data.z_b * data.z_b,
		      dz_mag = data.dz_a * data.dz_a + data.dz_b * data.dz_b;
		data.distance_estimate = Math.log(z_mag*z_mag) * z_mag / dz_mag;

		const escape_radius = 2;
//		data.continuous_iteration = iteration + log2(log2(Math.sqrt(data.z_a * data.z_a + data.z_b * data.z_b))) - log2(log2(escape_radius));
	}
	else {
		data.finished = false;
	}

	return data;
}

pixel_color = function(pixel_obj) {
	var color = [];
	if (! pixel_obj) {
		color['red'] = 0;
		color['green'] = 255;
		color['blue'] = 255;
	}
	else if (pixel_obj === 'small') {
		color['red'] = 0;
		color['green'] = 255;
		color['blue'] = 0;
	}
	else if ((! pixel_obj.finished) || pixel_obj.orbit_found)
		color['red'] = color['green'] = color['blue'] = 0;
	else {
/*		const dwell = pixel_obj.iteration;
		var iterations, hue, P;
		const finalrad = dwell - pixel_obj.continuous_iteration,
		      pixel_spacing = scale_x(1) - scale_x(0),
		      dscale = log2(pixel_obj.distance_estimate / pixel_spacing);

		if (dscale > 0)
			value = 1.0;
		else if (dscale > -8)
			value = (8 + dscale) / 8;
		else
			value = 0;

		P = Math.log(dwell) / Math.log(1e5);

		if (P < 0.5) {
			P = 1.0 - 1.5*P;
			angle = 1 - P;
			radius = Math.sqrt(P) 
		} 
		else { 
			P = 1.5*P - 0.5;
			angle = P;
			radius = Math.sqrt(P) 
		}

		if ((dwell % 2) === 1) {
			value *= 0.85;
			radius *= 0.667;
		}
*/

/*		const finalang = finalrad * 180 / Math.PI;
		if (finalang > Math.PI) {
			angle = angle + 0.02 
		}
		*/
/*
		angle = angle + 0.0001 * finalrad;
		hue = angle * 5; // 10;
		hue = hue - Math.floor(hue);
		saturation = radius - Math.floor(radius);
*/
//		value = Math.max(- Math.sqrt(pixel_obj.distance_estimate) + 0.5, 0);

//		color = hsv2rgb(hue, saturation, 0.5);
		color['red'] = (pixel_obj.iteration * 5) % 255;
		color['green'] = (Math.log(pixel_obj.distance_estimate) * 10) % 255;
		color['blue'] = 0;
	}
	return color;
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

calculate_section_rectangular = function(section_x, section_y, rel_x, rel_y, width, height, data) {
	const max_iterations = 50;
	var first_value = calculate_pixel(section_x + rel_x, section_y + rel_y, max_iterations);

	var draw_all = false;

	function is_equal(v1, v2) {
		return ((v1.finished === v2.finished) && (v1.iteration === v2.iteration));
//		return (v1.iteration === v2.iteration);
	}
	function get_global_x(x) {
		return section_x + x + rel_x;
	}
	function get_global_y(y) {
		return section_y + y + rel_y;
	}
	function get_index(x, y) {
		return x + rel_x + (y + rel_y) * section_size;
	}
	function calculate_relative(x, y) {
		return calculate_pixel(get_global_x(x), get_global_y(y), max_iterations);
	}
	function set_and_check_value(x, y) {
		const index = get_index(x, y);
		data[index] = calculate_relative(x, y);
		if (! is_equal(first_value, data[index]))
			draw_all = true;
	}

	var index_top, index_bottom;
	for (var x = 0; x < width ; x++) {
		set_and_check_value(x, 0);
		set_and_check_value(x, height - 1);
	}

	var index_left, index_right;
	if (! draw_all) {
		for (var y = 0; y < height; y++) {
			set_and_check_value(0, y);
			set_and_check_value(width - 1, y);
		}
	}
	
	if (draw_all && ! (width < 2) && ! (height < 2)) {
		const half_width = Math.floor(width / 2);
		const half_height = Math.floor(height / 2);
		function recur(x, y, width, height) {
			calculate_section_rectangular(section_x, section_y, x, y, width, height, data);
		}
		recur(rel_x,              rel_y,               half_width,         half_height);
		recur(rel_x + half_width, rel_y,               width - half_width, half_height);
		recur(rel_x,              rel_y + half_height, half_width,         height - half_height);
		recur(rel_x + half_width, rel_y + half_height, width - half_width, height - half_height);
	}
	else {
		var index, g_x, g_y;
		for (x = 0; x < width; x++) {
			for (y = 0; y < height; y++) {
//				g_x = x + section_x + rel_x;
//				g_y = y + section_y + rel_y;
				index = get_index(x, y); // x + rel_x + (y + rel_y) * section_size;
				if ((width < 2) && (height < 2))
					data[index] = 'small';
				//data[index] = first_value; 
				/*{
					c_a: first_value.c_a,
					c_b: first_value.c_b,
					z_a: first_value.z_a,
					z_b: first_value.z_b,
					dz_a: first_value.dz_a,
					dz_b: first_value.dz_b,
					iteration: first_value.iteration
				};*/

//				data[index] = calculate_relative(x, y);
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
	drawn = 0;
	const calculated = new Array(section_size * section_size);
	calculate_section_rectangular(section_x, section_y, 0, 0, section_size, section_size, calculated);
//	const calculated = calculate_section(section_x, section_y, max_iterations, section_data);
	const section_imageData = ctx.createImageData(section_size, section_size);

	var index, c, color, hue, brightness;
	for (var x = 0; x < section_size; x++) {
		for (var y = 0; y < section_size; y++) {
			index = x + y * section_size;
			c = calculated[index];
			color = pixel_color(c);
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
	var max_iterations = 100;
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
	new_draw_toggle = ! new_draw_toggle;
	const pos = getCursorPosition(e);
	center = [scale_x(pos[0]), scale_y(pos[1])];
	scale *= 3;
	grey_image();	
	draw();
}

draw();


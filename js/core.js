
/*
 * ====================================
 * GLOBAL
 * ====================================
 */

const canvas = document.getElementById('draw_area')
const ctx = canvas.getContext('2d');

const section_size = 100;
const x_sections = canvas.width / section_size;
const y_sections = canvas.height / section_size;

var center = [-1, 0];
var scale = 300;

/*
 * ====================================
 * UTIL
 * ====================================
 */

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

/*
 * ====================================
 * CALCULATE
 * ====================================
 */

scheme_plus = SchemeNumber.fn['+'];
scheme_minus = SchemeNumber.fn['-'];
scheme_div = SchemeNumber.fn['/'];
scheme_mult = SchemeNumber.fn['*'];

scale_x = function(x) {
	return (x - canvas.width / 2) / scale + center[0];
}

scale_y = function(y) {
	return ((canvas.height - y) - canvas.height / 2) / scale + center[1];
}

scale_x_arbitrary_precision = function(x) {
	return scheme_plus(scheme_div(scheme_minus(x ,scheme_div(canvas.width, 2)), scale), 
	                   center[0]);
}

scale_y_arbitrary_precision = function(y) {
	return scheme_plus(scheme_div(scheme_minus(scheme_minus(canvas.height, y), scheme_div(canvas.height, 2)), scale),
	                   center[1]);
}

/*
 * Algorithm from http://en.wikipedia.org/wiki/Mandelbrot_set#For_programmers
 */
calculate_pixel = function(x_raw, y_raw, max_iterations, data) {
	if (data && data.escaped)
		return data;

	if (data)
		max_iterations += data.iteration;

	const x0 = scale_x(x_raw),
	      y0 = scale_y(y_raw);
	if(! (data && (float_equal(data.c_a, x0) && float_equal(data.c_b, y0)))) {
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

	const c_a = data.c_a,
	      c_b = data.c_b;

	var z_a = data.z_a,
	    z_b = data.z_b,
	    dz_a = data.dz_a,
	    dz_b = data.dz_b,
	    iteration = data.iteration;

	var dz_a_new, z_a_new;
	while (z_a * z_a + z_b * z_b < 4 && iteration < max_iterations) {

		dz_a_new = 2 * (z_a * dz_a - z_b * dz_b) + 1;
		dz_b = 2 * (z_a * dz_b + dz_a * z_b);
		dz_a = dz_a_new;

		z_a_new = z_a * z_a - z_b * z_b + c_a;
		z_b = 2 * z_a * z_b + c_b;
		z_a = z_a_new;
		
		iteration += 1;
	}

	const result = {
		c_a: c_a, c_b: c_b, iteration: iteration,
		z_a: z_a, z_b: z_b, dz_a: dz_a, dz_b: dz_b
	}

	if (z_a * z_a + z_b * z_b > 4) { 
		result.escaped = true;

		const z_mag = z_a * z_a + z_b * z_b,
		      dz_mag = dz_a * dz_a + dz_b * dz_b;
		result.distance_estimate = Math.log(z_mag*z_mag) * z_mag / dz_mag;

		const escape_radius = 2;
		result.continuous_iteration = iteration + log2(log2(Math.sqrt(z_a * z_a + z_b * z_b))) - log2(log2(escape_radius));
	}
	else {
		result.escaped = false;
	}

	return result;
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
	else if ((! pixel_obj.escaped) || pixel_obj.orbit_found) 
		color['red'] = color['green'] = color['blue'] = 0;
	else {
		const dwell = pixel_obj.iteration;
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
		angle = angle + 0.0001 * finalrad;
		hue = angle * 2 ;
		hue = hue - Math.floor(hue);
		saturation = radius - Math.floor(radius);
		color = hsv2rgb(hue, saturation, (1 - value) / 2 + 0.1);
	}
	return color;
}

/*
 * Mariani/Silver optimization
 * http://mrob.com/pub/muency/marianisilveralgorithm.html
 */
calculate_section_rectangular = function(section_x, section_y, data, refine_iteration, max_iterations) {
	const calculate_inner_section = function(rel_x, rel_y, width, height) {	
		const is_equal = function(v1, v2) {
			return ((v1.escaped === v2.escaped) && (v1.iteration === v2.iteration));
		}
		const get_global_x = function(x) {
			return section_x + x + rel_x;
		}
		const get_global_y = function(y) {
			return section_y + y + rel_y;
		}
		const get_index = function(x, y) {
			return x + rel_x + (y + rel_y) * section_size;
		}
		const calculate_relative = function(x, y) {
			index = get_index(x, y);
			var new_value = data[index];
			if (new_value) {
				if (! (new_value.refine_iteration === refine_iteration)) {
					new_value = calculate_pixel(get_global_x(x), get_global_y(y), max_iterations, new_value);
				}
			}
			else {
				new_value = calculate_pixel(get_global_x(x), get_global_y(y), max_iterations);
			}
			new_value.refine_iteration = refine_iteration;
			return new_value;
		}
		const set_and_check_value = function(x, y) {
			index = get_index(x, y);
			var new_value = calculate_relative(x, y);
			data[index] = new_value;
			if (! is_equal(first_value, new_value))
				draw_all = true;
		}

		if ((width < 5) && (height < 5)) {
			for (x = 0; x < width; x++) {
				for (y = 0; y < height; y++) {
					index = get_index(x, y);
					data[index] = calculate_relative(x,y);
				}
			}
			return;
		}

		var first_value = calculate_relative(0,0),
		    draw_all = false,
		    index_top, index_bottom;

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

		if (draw_all) {
			const half_width = Math.floor(width / 2);
			const half_height = Math.floor(height / 2);
			function recur(x, y, width, height) {
				calculate_inner_section(x, y, width, height);
			}
			recur(rel_x,              rel_y,               half_width,         half_height);
			recur(rel_x + half_width, rel_y,               width - half_width, half_height);
			recur(rel_x,              rel_y + half_height, half_width,         height - half_height);
			recur(rel_x + half_width, rel_y + half_height, width - half_width, height - half_height);
		}
		else {
			var index, g_x, g_y;
			// don't copy the border - it is already calculated
			for (x = 1; x < width - 1; x++) {
				for (y = 1; y < height - 1; y++) {
					index = get_index(x, y);
					data[index] = first_value; 
				}
			}
		}
	}
	calculate_inner_section(0, 0, section_size, section_size);
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

/*
 * ====================================
 * UI
 * ====================================
 */

if (document.body.offsetWidth < 500) {
	canvas.setAttribute('width', 300);
	canvas.setAttribute('height', 300);
	scale = 120;
}

parse_hash = function() {
	if (! location.hash) {
		update_hash();
	}
	const h = location.hash,
	      s = h.split('_'),
	      scale_raw = s[0].split('scale=')[1],
	      center_raw = s[1].split('center=')[1],
	      center_array_raw = center_raw.split(',');
	if(! isNaN(scale_raw)) {
		scale = parseFloat(scale_raw);
	}
	if(! (isNaN(center_array_raw[0]) && isNaN(center_array_raw[1]))) {
		center = [parseFloat(center_array_raw[0]),
		          parseFloat(center_array_raw[1])];
	}
	stop_drawing();
	redraw();
}

update_hash = function() {
	location.hash = 'scale=' + scale + '_center=' + center;
}

_JUNK_ = function() {
	var is_sharing = false;
	share = function(should_share) {
		is_sharing = should_share;
		share_dialog = document.getElementById('share');
		if (should_share)
			share_dialog.style.display = 'block';
		else
			share_dialog.style.display = 'none';
	}
	share(false);

	share_toggle = function() {
		share(! is_sharing);
	}
}();

/*
 * ====================================
 * DRAWING
 * ====================================
 */

function draw_section(section_x, section_y, max_iterations, refine_iteration, section_data) {
	var calculated;
	if (section_data)
		calculated = section_data;
	else
		calculated = new Array(section_size * section_size);
	calculate_section_rectangular(section_x, section_y, calculated, refine_iteration, max_iterations);
//	const calculated = calculate_section(section_x, section_y, max_iterations, section_data);
	const section_imageData = ctx.createImageData(section_size, section_size);

	var index, c, color, hue, brightness;
	for (var x = 0; x < section_size; x++) {
		for (var y = 0; y < section_size; y++) {
			index = x + y * section_size;
			c = calculated[index];
			color = pixel_color(c);
			setPixel(section_imageData, x, y, color['red'], color['green'], color['blue'], 0xff);
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
_JUNK_ = function() {
	var max_iterations = 100,
	    max_refine_iterations = 4,
	    refine_iteration = 0,
	    sections_data,
	    new_draw_toggle = false;
	if (canvas.width < 500)
	       max_iterations = 20;	

	console.log(max_iterations);
	const draw_sections = function() {
		const current_new_draw_toggle = new_draw_toggle;
		var x = 0,
		    y = 0,
		    current_time = (new Date()).getTime(),
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
						if (refine_iteration >= max_refine_iterations) {
							clearInterval(timer);
							console.log('finished drawing');
							return;
						}
					}
					else {
						y += 1;
						x = 0;
					}
				}
				index = x + y * x_sections;
				sections_data[index] = draw_section(x * section_size, y * section_size, 
						max_iterations, refine_iteration, sections_data[index]);
				x += 1;
				busy = false;
			}
		}, 50);
	}
	
	refine = function() {
		max_refine_iterations += 1;
		draw_sections()
	}

	const draw = function() {
		refine_iteration = 0;
		max_refine_iterations = 4;
		sections_data = new Array(section_size * section_size);
		draw_sections();
	}

	redraw = function() {
		grey_image();
		draw();
	}

	stop_drawing = function() {
		new_draw_toggle = ! new_draw_toggle;
	}

}();

var clicking = false;
_JUNK_ = function() {
	var mouse_down = false;
	var start_position;
	const selection_canvas = document.getElementById('selection_canvas'),
	      selection_canvas_ctx = selection_canvas.getContext('2d');
	const selection_area = document.getElementById('selection_area');

	selection_canvas_ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
	selection_canvas_ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
	const draw_rect = function(x1,y1,x2,y2) {
		selection_canvas_ctx.fillRect(x1,y1,x2,y2);
		selection_canvas_ctx.strokeRect(x1,y1,x2,y2);
	}
	const clear = function() {
		selection_canvas_ctx.clearRect(0,0,selection_canvas.width, selection_canvas.height);
	}

	const get_scale_factor = function() {
		return Math.sqrt(Math.pow(selection_canvas.width, 2) / Math.pow(selection_canvas.height, 2) + 1)
	}

	selection_canvas.onmousedown = function(e) {
		mouse_down = true;
		share(false);
		start_position = getCursorPosition(e);
		selection_height = 0;
		selection_width = 0;
		return false; // if not, the crosshair becomes a text cursor
	}

	selection_canvas.onmouseup = function(e) {
		if (mouse_down) {
			mouse_down = false;
			clear();
			stop_drawing();
			center = [scale_x(start_position[0] + selection_width / 2),
			          scale_y(start_position[1] + selection_height / 2)];
			if (selection_height < 5) {
				scale *= 3;
			}
			else {
				scale *= canvas.width / selection_width;
			}
			redraw();
			clicking = true;
			update_hash();
			clicking = false;
		}
	}

	selection_canvas.onmousemove = function(e) {
		if (mouse_down) {
			const current_position = getCursorPosition(e),
			      cursor_width = current_position[0] - start_position[0],
			      cursor_height = current_position[1] - start_position[1],
			      distance = Math.sqrt(Math.pow(cursor_width, 2) + Math.pow(cursor_height, 2));
			selection_height = distance / get_scale_factor();
			selection_width = Math.sqrt(Math.pow(distance, 2) - Math.pow(selection_height, 2));
			clear();
			draw_rect(start_position[0], start_position[1], selection_width, selection_height);
		}
	}

	selection_canvas.onselectstart = function() { return false; } // if not, the crosshair becomes a text cursor (IE version)
}();

window.onhashchange = function () {
	if (!clicking)
		parse_hash();
	document.getElementById('share_url').value = location.href;
}

parse_hash();
document.getElementById('share_url').value = location.href;


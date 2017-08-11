exports.isURL = function (str) {
	let YT_URL_REG = /youtube\.com\/watch\?v=[a-zA-Z0-9\-\_]{11}$/
	let YT_MURL_REG = /youtu\.be\/[a-zA-Z0-9\-\_]{11}$/

	if (YT_URL_REG.test(str)) {
		return true;
	} else {
		return YT_MURL_REG.test(str) ? true : false;
	}
	return false;
}

exports.isID = function(str) {
	if (/^[a-zA-Z0-9\-\_]{11}$/.test(str)) {
		return true;
	} else {
		return false;
	}
}

exports.getID = function(str) {
	return str.match(/[a-zA-Z0-9\-_]{11}$/)[0];
}

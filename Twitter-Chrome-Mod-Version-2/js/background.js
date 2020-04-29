console.log("BACKGROUND")

// var URL_HEADER = 'http://127.0.0.1:8000'
var URL_HEADER = 'https://twitter-shield.si.umich.edu'

chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse) {
		if (request.contentScriptQuery == 'getFollowingList') {
			var url = URL_HEADER + "/get_following?user=" + request.accountName;
			console.log(url)

		}
	}

)
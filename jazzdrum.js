
var menu = $('#top').find('menu');

// position arrow on resize
function positionMenuArrow() {
	var current = menu.find('.current');
	menu.find('.arrow').css('left', current.offset().left + (current.outerWidth() / 2));
}

$(window).on('resize', positionMenuArrow);

menu.on('click', 'a', function(e) {
	var el = $(this),
		href = el.attr('href'),
		currentSection = $('#main').find('.current');

	e.preventDefault();

	menu.find('.current').removeClass('current');

	el.addClass('current');

	positionMenuArrow();

	if (currentSection.length) {
		currentSection.fadeOut(300).promise().done(function() {
			$(href).addClass('current').fadeIn(300);
		});
	} else {
		$(href).addClass('current').fadeIn(300);
	}
});

menu.find('a:first').trigger('click')



// Remix with any track.
// To build your own back-end, take a look at remix-server:  
// var apiKey = 'FILDTEOIK2HBORODV';
var apiKey = 'UZSOV7KGRQJV7GYXG';
var trackID;
var trackURL;

var remixer;
var player;
var track;
var remixed;

var fs;

var trackID = 'TRKULLE13C543DFD6B';
var trackURL = 'audio/elvinsolo.mp3';

var drumInfos = [
	{
		name: ''
	},

	{
		name: 'Elvin Jones',
		'id': 'TRKULLE13C543DFD6B',
		'url': 'audio/elvinsolo.mp3'
	},
	{
		name: 'Tony Williams',
		// 'id': 'TRCADMM13E209D904A',
		'id': 'TRAAGLG13E1BB84E00',
		'url': 'audio/tony-williams-1972.mp3'
	},
	{
		name: 'Philly Joe Jones',
		'id': 'TRXBZCJ13E20EC085B',
		'url': 'audio/philly-joe-jones.mp3'
	},
	{
		name: 'Baby Dodds',
		// 'id': 'TRKFUWC13E20BEDC2E',
		'id': 'TRHTVHD13CD25B0AE8',
		'url': 'audio/baby-dodds-spooky.mp3'
	}
]

var useParamTRID = true;

var drumInfo = drumInfos[1];


// Set up the key variables
var context;
var medianBarLength;
var medianBarLengthMS;

var timeoutId;
var timeouts = [];

var numSliders = 8;

var segsToPlay = new Array(numSliders);
var sliderValues = new Array(numSliders);
var masterSegsToPlay;
var clusters = new Array(numSliders);

var sleeptime = 0;
var delay = 0; // maybe remove this declaration? I just added it in so I could debug
var tic = 0;

var barStartTime = 0;
var last_reset = 0;


function beginRemix() {
    $("#info").text("Remixing...");

    // Only use the filesystem if we have access to it..
    if (fs) {
        remixer.saveRemixLocally(fs, remixed, function(saveURL) {
            $('#downloadButton').html('<a href="' + saveURL + '" target="_blank">Download Remix</a>')
        });
    }

    $('.btn-remixed').removeAttr('disabled');
    $("#info").text("Remix complete!");
}

// Get an estimation of analysis time
function fetchQinfo() {
    // var url = 'http://remix.echonest.com/Uploader/qinfo?callback=?'
	var url = 'http://54.242.144.133:8080/Uploader/qinfo?callback=?';
    $.getJSON(url, {}, function(data) {
        $("#info").text("Estimated analysis time: " + Math.floor(data.estimated_wait * 1.2) + " seconds.");
    });
}

// Get the analysis, if it is ready
function analyzeAudio(audio, tag, callback) {
    // var url = 'http://remix.echonest.com/Uploader/qanalyze?callback=?'
	var url = 'http://54.242.144.133:8080/Uploader/qanalyze?callback=?';
	console.log('audio url:');
	console.log(audio);
    $.getJSON(url, { url:audio, api_key:apiKey, tag:tag}, function(data) {
        if (data.status === 'done' || data.status === 'error') {
            callback(data);
        } else {
            $("#info").text(data.status + ' - ready in about ' + data.estimated_wait + ' secs. ');
            setTimeout(function() { analyzeAudio(audio, tag, callback); }, 8000);
        } 
    });
}

function inity() {
	initDrumInfos();
	initBeatSelector();
	init();
}

function init() {
    if (window.webkitAudioContext === undefined) {
        alert("Sorry, this app needs advanced web audio. Your browser doesn't"
            + " support it. Try the latest version of Chrome");
    }
    // Read the URL query string to decide what to do
    var params = {};
    var q = document.URL.split('?')[1];
    if(q != undefined){
        q = q.split('&');
        for(var i = 0; i < q.length; i++){
            var pv = q[i].split('=');
            var p = pv[0];
            var v = pv[1];
            params[p] = v;
        }
    }

	// make upload option available no matter what
	$("#play-remix").hide();
    $("#redirect-url").attr('value', document.URL);

    $("#file").change( 
        function() {
            var filename = $("#file").val();
            if (endsWith(filename.toLowerCase(), ".mp3")) {
                $("#f-filename").attr('value', fixFileName(filename));
                $("#upload").removeAttr('disabled');
            } else {
                alert('Sorry, this app only supports MP3s');
                $("#upload").attr('disabled', 'disabled');
            }
        }
    );
    fetchSignature();
    fetchQinfo();
    

    if ('key' in params) {
        // We just uploaded a track.
        // We need to log the trackID and the URL, and then redirect.
        $("#info").text("Analyzing audio...");
        trackURL = 'http://' + params['bucket'] + '/' + urldecode(params['key']);
		console.log(params);
		tag = urldecode(params['etag']);
		console.log('tag:');
		console.log(tag);

        // analyzeAudio(trackURL, 'tag', function(data) {
	    analyzeAudio(trackURL, tag, function(data) {
            if (data.status === 'done') {
                var newUrl = location.protocol + "//" +  location.host + location.pathname + "?trid=" + data.trid;
                location.href = newUrl;
            }
        });
    } 

    else {
		if ('trid' in params && useParamTRID) {
	        // We were passed a trackID directly in the url
	        // We can remix the track we get back!
			trackID = params['trid'];
			$("#select-drummer option[value='0']").attr("selected","selected");
		} else if (trackID == undefined) {
			setTrack(1);
		}
        $("#play-remix").show();

        var urlXHR = getProfile(trackID, function(data) {
            trackURL = data.url;

            if (data.status == true) {

				// make sliders
				if ($(".slider").length < 1) {
					// $("<p>TURN IT UP</p>").appendTo("#allsliders");
					for (var i=0; i<numSliders; i++) {
						$("<div>", {
							"class": "slider",
							"id": "slider" + i,
							"css": { 
								position: 'inline',
								top: 20 + 'px',
								left: ((30 * i)) + "px", 
								float: 'left',
								border: 'none',
								width: 10 + "px",
								height: 100 + "px",
							}
						}).appendTo("#allsliders");
					}
				}
				
                context = new webkitAudioContext();
                // Only use the filesystem if we have access to it.
                if (window.File && window.FileReader && window.FileList && window.Blob && window.webkitRequestFileSystem) {
                    window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;
                    window.requestFileSystem(window.TEMPORARY, 1024*1024, function(filesystem) {
                        fs = filesystem;
                    }, fileErrorHandler);
                }

                remixer = createJRemixer(context, $, apiKey);
                player = remixer.getPlayer();

                $("#info").text("Loading analysis data...");
                remixer.remixTrackById(trackID, trackURL, function(t, percent) {
                    track = t;

                    $("#info").text(percent + "% of the track loaded...");
                    if (percent == 100) {
                        $("#info").text(percent + "% of the track loaded, preparing...");
                    }

                    if (track.status == 'ok') {
                        $("#info").text("Ready to remix!");
						// This array holds the chunks of audio that we're going to play back
						for (var i=0; i<numSliders; i++) {
							segsToPlay[i] = new Array();
							clusters[i] = new Array();
						}

						// find k-means clusters of segments
						segments = track.analysis.segments;

						// clusterSegments(track, 8, 'cluster', 'pitches');

						var k = 8;
						clusterResults = clusterSegmentsByPitch(segments, k);

						for (var i=0; i<numSliders; i++) {
							for (var j=0; j < clusterResults[i].length; j++) {
								clusters[i].push(clusterResults[i][j][0]);
							}
						}

						computeBarLength(track.analysis.bars);

						$("#info").text("Remix complete!");

						$(".slider").slider({
							orientation: "vertical",
							min: 0,
							max: 1, // after remixing is complete, set this to # of segs in cluster
							// step: 1
							step: 0.1,
							animate: true
						});

						for (var i=0; i<numSliders; i++) {
							sliderValues[i] = 0;
							$("#slider" + i).slider("value", 0);
							// $("#slider" + i).slider({max:clusters[i].length});
						}

						for (var i=0; i<numSliders; i++) {
							// $("#slider" + i).bind("slide", linearSlide);
							$("#slider" + i).bind("slide", exponentialSlide);
						}

                    }
                    else if (track.status == 'error' ) {
                        $("#info").text("Error getting the track URL - please try again, or re-upload the file.");
                    }

                });
            }
            else {
                console.log("Track id error.");
		console.log(data);
                $("#play-remix").hide();
                $("#select-track").show();
                $("#info").text("Error getting the track URL - please try again, or re-upload the file.");
                $("#redirect-url").attr('value', document.URL);

                $("#file").change( 
                    function() {
                        fetchQinfo();
                        var filename = $("#file").val();
                        if (endsWith(filename.toLowerCase(), ".mp3")) {
                            $("#f-filename").attr('value', fixFileName(filename));
                            $("#upload").removeAttr('disabled');
                        } else {
                            alert('Sorry, this app only supports MP3s');
                            $("#upload").attr('disabled', 'disabled');
                        }
                    }
                );
                fetchSignature();
            }
        });
    }
}

function linearSlide(event, ui) {
	// find out which slider this is
	var n = parseInt(event.target.id.substring(6));

	// sliderValues[n] = Math.floor(ui.value * clusters[n].length);
	sliderValues[n] = ui.value;
	updateSegsToPlay(n, sliderValues[n]);	
}

function exponentialSlide(event, ui) {
	// find out which slider this is
	var n = parseInt(event.target.id.substring(6));
	if (ui.value < 0.1) {
		var val = 0;
	} else {
		var scale = Math.log(clusters[n].length) / Math.log(1.03);
		var val = Math.floor(Math.pow(1.03, scale * ui.value));
	}
	sliderValues[n] = val;
	updateSegsToPlay(n, sliderValues[n]);	
}

function logarithmicSlide(event, ui) {
	// find out which slider this is
	var n = parseInt(event.target.id.substring(6));
	if (ui.value < 0.1) {
		var val = 0;
	} else {
		var scale = Math.log(clusters[n].length);
		var val = Math.floor(Math.exp(scale * ui.value));

	}
	sliderValues[n] = val;
	updateSegsToPlay(n, sliderValues[n]);	
}


function clusterSegmentsByPitch(segments, k) {
	var observations = new Array(segments.length);
	var i;
	
	for (i=0; i<segments.length; i++) {
		observations[i] = segments[i].pitches;
	}
	
	results = kmeans(observations, k);
	code_book = results[0];
	distortion = results[1];
	vq_res = vq(observations, code_book);
	indices = vq_res[0];
	distances = vq_res[1];
	clusters = group_clusters(observations, indices, distances, k);

	var clusters = [];
	for (i=0; i<k; i++) {
		clusters[i] = [];
	}
	for (i=0; i<indices.length; i++) {
		clusters[indices[i]].push( [segments[i], distances[i]] );
	}
	
	clusters.sort(function(a, b) {return a[1] - b[1]});
	
	return clusters
}

function computeBarLength(bars) {
	var lengths = new Array();
	
	for (var i=0; i<bars.length; i++) {
		lengths.push(bars[i].duration);
	}
	lengths.sort(function(a,b) {return a-b});
	
	medianBarLength = bars[Math.floor(bars.length/2)].duration;
	medianBarLengthMS = medianBarLength * 1000;
}

function play(){
	
	last_reset = context.currentTime;
	
	for (var i=0; i<numSliders; i++) {
		updateSegsToPlay(i, sliderValues[i]);
	}
	
	var segment;
	var segmentStartTime;
	if (masterSegsToPlay.length<1) {
		segment = clusters[0][0];
		segmentStartTime = 0;
	} else {
		segment = masterSegsToPlay[0][1];
		segmentStartTime = masterSegsToPlay[0][0];
	}
	
	playSegment(segmentStartTime, segment);
	
}

function updateSegsToPlay(n, numSegs) {
	
	// first, update this segs to play
	segsToPlay[n] = [];
	
	for (var i=0; i<numSegs; i++) {
		when = (clusters[n][i].start % (medianBarLength * 1)) * 1000;
		segsToPlay[n].push([when, clusters[n][i]]);
	}
		
	// reconstruct the master list of segs to play
	masterSegsToPlay = [].concat.apply([], segsToPlay);
	
	// sort segs by their relative start times.
	masterSegsToPlay.sort(function(a,b) {return a[0] - b[0]});
	
}

function playSegment(segmentStartTime, segment) {
	if (masterSegsToPlay.length<1) {
		currentTimeInBar = (context.currentTime * 1000) - barStartTime;
		if (currentTimeInBar > medianBarLengthMS) {
			currentTimeInBar = currentTimeInBar % medianBarLengthMS;
		}		
		timeoutId = setTimeout(function() {
			playSegment(segmentStartTime, segment);
		}, 1);
	} else {
		currentTimeInBar = (context.currentTime * 1000) - barStartTime;
		if (currentTimeInBar > medianBarLengthMS) {
			currentTimeInBar = currentTimeInBar % medianBarLengthMS;
		} else if (currentTimeInBar < 0) {
			currentTimeInBar = medianBarLengthMS - currentTimeInBar;
		}
		
		// play this segment
		player.play(0, segment);
		
		// find the next segment
		var foundNext = false;
		var n;
		for (var i=0; i<masterSegsToPlay.length; i++) {
			if (masterSegsToPlay[i][0] > currentTimeInBar && masterSegsToPlay[i][0] > segmentStartTime) {
				n = i;
				foundNext = true;
				break;
			} 
		}
		if (foundNext == false) {
			n = 0;
		}
		
		var prevSegStart = segmentStartTime;
		segmentStartTime = masterSegsToPlay[n][0];
		segment = masterSegsToPlay[n][1];
		
		// figure out how long to wait until the next segment
		if (n > 0) {
			delay = segmentStartTime - currentTimeInBar;
		} else {
			delay = (segmentStartTime + medianBarLengthMS - currentTimeInBar) % medianBarLengthMS;
		}
		
		var c = Math.floor(currentTimeInBar);
		var s = Math.floor(prevSegStart);
		var d = Math.floor(delay);
		var sst = Math.floor(segmentStartTime);
		
		if (n==0) { // start a new bar
			barStartTime = (context.currentTime * 1000) + medianBarLengthMS - currentTimeInBar;
			last_reset = context.currentTime;
		}
		
		// wait and then play next seg
		timeoutId = setTimeout(function() {
			playSegment(segmentStartTime, segment);
		}, delay);
	}
}

function time_since(when) {
	// return the time since 'when' in ms, as an integer
	var delta = context.currentTime - when;
	return Math.floor(delta * 1000);
}

function handleStop() {
    clearTimeout(timeoutId);	
}

function initDrumInfos() {
    for (var i = 0; i < drumInfos.length; i++) {
        drumInfos[i].which = i;
    }
}

function initBeatSelector() {
    for (var i = 0; i < drumInfos.length; i++) {
        var di = drumInfos[i];
        var opt = $("<option>");
        if (i === drumInfo.which) {
            opt.attr("selected", "selected");
        }
        opt.attr("value", i.toString());
        opt.text(di.name);
        //alert(di.name);

        //alert(opt.html());
        $("#choose-drummer #select-drummer").append(opt);
        //alert($("#select-drummer").html());
    }

    $("#select-drummer").on("change",
        function() {
            var val = $("#select-drummer option:selected").attr("value");
            var which = parseInt(val);
			if (which > 0) {
	            setTrack(which);
				handleStop();
				useParamTRID = false;
				init();
			}
        }
    );
    $('#select-drummer').fancySelect();
}

function setTrack(which) {
	trackID = drumInfos[which].id;
	trackURL = drumInfos[which].url;
}

window.onload = inity();

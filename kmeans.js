function kmeans(obs, k) {
	var best_dist = Infinity;
	var i;
	var num = obs.length;
	var iter = 20; // number of iterations to try
	for (i=0; i<iter; i++) {
		var guess = guess_centroids(obs, k);
		var res = kmeans_raw(obs, guess);
		var book = res[0];
		var dist = res[1];
		if ( dist < best_dist ) {
			var best_book = book;
			best_dist = dist;
		}
	}
	var result = [best_book, best_dist];
	return result;
}

function guess_centroids(observations, k) {
	centroids = [];
	for (i=0; i < k; i++) {
		index = Math.floor(Math.random() * observations.length);
		centroids[i] = observations[index];
	}
	return centroids;
}

function kmeans_raw(obs, guess) {
	var code_book = guess.slice(); // copy the guess Array

	var avg_dist = [];
	var thresh = 0.00001;
	var diff = thresh + 1.0;
	while (diff > thresh) {
		var nc = code_book.length;
		// compute membership and distances btw obs and code_book
		var vq_res = vq(obs, code_book);
		var obs_code = vq_res[0]; // the codes that correspond to each obv
		var distort = vq_res[1]; // an array of distances
		avg_dist.push(mean(distort));
		// recalc code_book as centroids of associated obs
		if (diff > thresh) {
			var has_members = [];
			var i;
			for (i=0; i<nc; i++) {
				var cell_members = find_cell_members(obs, obs_code, i);
				if (cell_members.length > 0) {
					code_book[i] = compute_centroid(cell_members);
					has_members.push(i);
				}
			}
			// THIS DIDN'T WORK
			// remove code_books that didn't have any members
			// code_book = members_only(code_book, has_members);
		}
		if (avg_dist.length > 1) { // figure out how much we improved
			diff = avg_dist[-2] - avg_dist[-1];
		}
	}
	return [code_book, avg_dist[avg_dist.length-1]];
}

function vq(obs, code_book) {
	var n, d, i, j;
	n = obs.length; // number of observations
	d = obs[0].length; // number of features
	code = zeros(n);
	min_dist = zeros(n);
	// for each observation, determine which code it's closest too
	// and how far away it is
	for (i=0; i<n; i++) { // i is the observation we're considering
		var distances = new Array(code_book.length);
		for (j=0; j<code_book.length; j++) { // j is the code we're comparing against
			distances[j] = euclidean_distance(obs[i], code_book[j]);
		}
		this_min_dist = Math.min.apply(Math, distances); // fuk u javascript
		code[i] = distances.indexOf(this_min_dist);
		min_dist[i] = distances[code[i]];
	}
	return [code, min_dist];
}

function group_clusters(observations, indices, distances, k) {
	var i;
	var clusters = [];
	for (i=0; i<k; i++) {
		clusters[i] = [];
	}
	for (i=0; i<indices.length; i++) {
		clusters[indices[i]].push(observations[i]);
	}
	return clusters
}

function find_cell_members(obs, obs_code, index) {
	// which observations have code i ?
	var i;
	var cell_members = [];
	for (i=0; i<obs.length; i++) {
		if (obs_code[i]==index) {
			cell_members.push(obs[i]);
		}
	}
	return cell_members;
}

function compute_centroid(cell_members) {
	// for each feature, compute the mean
	var i, f;
	var feature_values = [];
	var centroid = [];
	for (f=0; f<cell_members[0].length; f++) {
		for (i=0; i<cell_members.length; i++) {
			feature_values.push(parseFloat(cell_members[i][f]));
		}
		centroid[f] = mean(feature_values);
		feature_values = [];
	}
	return centroid;
}

function members_only(code_book, has_members) {
	// remove code_books that didn't have any members
	var i;
	var new_code_book = [];
	for (i=0; i<has_members.length; i++) {
		new_code_book.push(has_members[i]);
	}
	return new_code_book;
}

function zeros(length) {
	var i;
	var arr = new Array(length);
	for (i=0; i<length; i++) {
		arr[i] = 0;
	}
	return arr;
}

function euclidean_distance(v1, v2) {
	// assume they have same dimensions ?
	var i;
	var sum = 0;
	for (i=0; i<v1.length; i++) {
		diff = v1[i] - v2[i];
		element_distance = Math.pow(diff, 2);
		sum += element_distance;
	}
	distance = Math.sqrt(sum);
	return distance;
}

function mean(arr) {
	var i;
	var sum = 0.0;
	for (i=0; i<arr.length; i++) {
		sum += arr[i];
	}
	avg = sum / arr.length;
	return avg;
}
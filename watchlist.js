

// Fetch details for a single movie by ID
async function fetchMovieById(movieId) {
    const MOVIE_DETAILS_URL = `${TMDB_BASE_URL}/movie/${movieId}`;

    try {
        const options = {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${TMDB_TOKEN}`,
                'accept': 'application/json'
            }
        };
        const response = await fetch(MOVIE_DETAILS_URL, options);
        if (!response.ok) {
            throw new Error(`HTTP error fetching movie ${movieId}! status: ${response.status}`);
        }
        return response.json();
    } catch (error) {
        console.error(`Could not fetch details for movie ${movieId}:`, error);
        return null;
    }
}


// Main function to render the watchlist
async function renderWatchlist() {
    const grid = document.getElementById('watchlist-grid');
    if (!grid) return;

    // 1. Clear any loading messages
    grid.innerHTML = '';

    // 2. Load the movie IDs from storage
    loadWatchlist(); // Ensure global 'watchlist' array is updated

    if (watchlist.length === 0) {
        grid.innerHTML = '<p class="empty-message">Your watchlist is empty. Go back to the <a href="index.html">Home</a> page to add some movies! 🍿</p>';
        return;
    }

    // 3. Fetch details for all movies concurrently (efficient!)
    const fetchPromises = watchlist.map(movieId => fetchMovieById(movieId));
    const movieDetails = await Promise.all(fetchPromises);

    // 4. Render the results
    const validMovies = movieDetails.filter(movie => movie && movie.title); // Filter out failed fetches

    if (validMovies.length > 0) {
        validMovies.forEach(movie => {
            const cardHTML = createMovieCard(movie); // Use the function from script.js
            grid.insertAdjacentHTML('beforeend', cardHTML);
        });
    } else {
        grid.innerHTML = '<p class="error-message">Could not load movie details. Check your network or API key. 🤕</p>';
    }
}


// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Ensure genres are loaded so createMovieCard can work
    await fetchGenres();

    // 2. Render the actual list
    await renderWatchlist();

    // 3. Setup common interactive features (modal and hamburger)
    setupVideoModal();
    // setupHamburgerMenu(); // Assuming this is defined and called in script.js on DOMContentLoaded
});
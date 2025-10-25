// =================================================================
// 1. CONFIGURATION AND GLOBAL STATE
// =================================================================

// Replace this with your actual TMDb Read Access Token (Bearer Token)
const TMDB_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIyMmU3NDM4NmNhNDM3YTc4M2E4MWM5N2JhZWU5NWEyZSIsIm5iZiI6MTY2MDgyNjk5MS4wNzUsInN1YiI6IjYyZmUzNTZmOTYzODY0MDA4M2VjZDY4MyIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.0M_YlL5R4CPuval3nA4o7pXhvObcRG_TO-mgkVN1-vU'; // NOTE: You should replace this token.
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const YOUTUBE_BASE_URL = 'https://www.youtube.com/embed/';
const WATCHLIST_STORAGE_KEY = 'cineverse_watchlist';

// Endpoints
const POPULAR_MOVIES_URL = `${TMDB_BASE_URL}/movie/popular`;
const NOW_PLAYING_URL = `${TMDB_BASE_URL}/movie/now_playing`;
const SEARCH_MOVIE_URL = `${TMDB_BASE_URL}/search/movie`;
const GENRE_LIST_URL = `${TMDB_BASE_URL}/genre/movie/list`;
const TOP_RATED_MOVIES_URL = `${TMDB_BASE_URL}/movie/top_rated`;
const UPCOMING_MOVIES_URL = `${TMDB_BASE_URL}/movie/upcoming`;


// Image Settings
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/';
const POSTER_SIZE = 'w500';
const BACKDROP_SIZE = 'original';

// Global State for App View
let currentApiUrl = POPULAR_MOVIES_URL; // Initial view is Popular
let watchlist = []; // This will be populated from local storage on init
let currentSearchQuery = '';
let currentPage = 1;
let totalPages = 1;

let genreMap = {}

    ;


// =================================================================
// 2. FETCHING FUNCTIONS
// =================================================================

async function fetchMovies(url, page = 1, query = '') {
    try {
        let urlWithParams = `${url}?page=${page}`;

        if (url === SEARCH_MOVIE_URL && query) {
            urlWithParams += `&query=${encodeURIComponent(query)}`;
        }

        const options = {

            method: 'GET',
            headers: {
                'Authorization': `Bearer ${TMDB_TOKEN}`, 'accept': 'application/json'
            }
        }

            ;

        const response = await fetch(urlWithParams, options);

        if (!response.ok) {
            throw new Error(`HTTP error fetching movies ! status: ${response.status}`);
        }

        const data = await response.json();

        currentPage = data.page;
        totalPages = data.total_pages;

        return data.results;
    }

    catch (error) {
        console.error("Could not fetch movies:", error);
        return [];
    }
}

async function fetchGenres() {
    try {
        const options = {

            /* ... (authorization options) ... */
            method: 'GET',
            headers: { 'Authorization': `Bearer ${TMDB_TOKEN}`, 'accept': 'application/json' }
        };

        const response = await fetch(GENRE_LIST_URL, options);

        if (!response.ok) {
            throw new Error(`HTTP error fetching genres ! status: ${response.status}`);
        }

        const data = await response.json();

        data.genres.forEach(genre => {
            genreMap[genre.id] = genre.name;
        }

        );

    }

    catch (error) {
        console.error("Could not fetch genres:", error);
    }
}

async function fetchMovieTrailer(movieId) {
    const VIDEO_URL = `${TMDB_BASE_URL}/movie/${movieId}/videos`;

    try {
        const options = {

            method: 'GET',
            headers: { 'Authorization': `Bearer ${TMDB_TOKEN}`, 'accept': 'application/json' }
        };

        const response = await fetch(VIDEO_URL, options);

        if (!response.ok) throw new Error(`HTTP error fetching videos ! status: ${response.status}`);
        const data = await response.json();

        const trailer = data.results.find(video => video.site === 'YouTube' && video.type === 'Trailer');

        return trailer ? trailer.key : null;

    }

    catch (error) {
        console.error(`Could not fetch trailer for movie ${movieId}:`, error);
        return null;
    }
}

async function fetchHeroMovie() {
    try {
        const nowPlaying = await fetchMovies(NOW_PLAYING_URL);
        if (nowPlaying.length === 0) return null;

        nowPlaying.sort((a, b) => b.popularity - a.popularity);
        return nowPlaying[0];

    }

    catch (error) {
        console.error("Could not fetch hero movie:", error);
        return null;
    }
}

// =================================================================
// 3. RENDERING FUNCTIONS
// =================================================================

function createMovieCard(movie) {
    const posterPath = movie.poster_path
        ? `${IMAGE_BASE_URL}${POSTER_SIZE}${movie.poster_path}`
        : 'placeholder-image-url.jpg'; // Fallback

    const title = movie.title;
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
    const movieId = movie.id;
    let releaseYear = movie.release_date ? movie.release_date.split('-')[0] : 'N/A';

    // Genre Tag Logic
    const genreIds = movie.genre_ids || [];
    const genres = genreIds.slice(0, 2).map(id => genreMap[id]).filter(name => name);
    const movieIdStr = String(movieId);

    // Check if the movie is currently in the watchlist
    const isAdded = watchlist.includes(movieIdStr);
    const btnClass = isAdded ? 'added' : '';
    const btnIcon = isAdded ? 'fa-check' : 'fa-plus';
    const btnText = isAdded ? ' Added' : '';

    const genreTagsHTML = genres.length > 0
        ? genres.map(genre => `<span class="genre-tag">${genre}</span>`).join('')
        : '<span class="genre-tag">N/A</span>';

    return ` <div class="movie-card" data-movie-id="${movieId}">
    <div class="poster-container">
    <img src="${posterPath}"alt="${title} Poster" class="movie-poster">
    <div class="overlay">
    <button class="overlay-btn play-btn list-trailer-btn" data-movie-id="${movieId}"><i class="fas fa-play"></i></button>
    <button class="overlay-btn add-btn ${btnClass}" data-id="${movieIdStr}">
                        <i class="fas ${btnIcon}"></i>${btnText}
                    </button>
    </div>
    </div>
    <h3 class="movie-title">${title}

    </h3><p class="movie-year">${releaseYear}

    </p><div class="genre-container">${genreTagsHTML}

    </div><p class="movie-rating"><i class="fas fa-star"></i>${rating}</p></div>`;
}

function renderMovies(movies) {
    const movieListContainer = document.querySelector('.movie-grid');

    // NOTE: If you are using .movie-grid, ensure your HTML is updated to use .movie-list-container for the main grid.
    if (!movieListContainer) {
        console.error("Element with class 'movie-list-container' not found.");
        return;
    }

    movieListContainer.innerHTML = '';

    if (movies.length === 0) {
        movieListContainer.innerHTML = '<p class="no-results-message">No results found. Try a different movie title.</p>';
        return;
    }

    movies.forEach(movie => {
        const cardHTML = createMovieCard(movie);
        movieListContainer.insertAdjacentHTML('beforeend', cardHTML);
    }

    );
}

function renderHeroSection(movie) {
    if (!movie) return;

    const heroSection = document.querySelector('.hero-section');
    const heroTitle = document.querySelector('.hero-title');
    const heroDescription = document.querySelector('.hero-description');
    const watchTrailerBtn = document.querySelector('.trailer-trigger');

    // 1. Set Background
    const backdropPath = movie.backdrop_path ? `${IMAGE_BASE_URL}${BACKDROP_SIZE}${movie.backdrop_path}` : '';

    if (heroSection && backdropPath) {
        heroSection.style.backgroundImage = `url('${backdropPath}')`;
    }

    // 2. Set Text
    if (heroTitle) heroTitle.textContent = movie.title || 'Movie Title Not Found';

    if (heroDescription) {
        const synopsis = movie.overview && movie.overview.length > 200 ? movie.overview.substring(0, 200) + '...'
            : movie.overview;
        heroDescription.textContent = synopsis || 'No synopsis available.';
    }

    // 3. Set Trailer ID
    if (watchTrailerBtn) {
        watchTrailerBtn.dataset.movieId = movie.id;
    }
}

function renderPaginator() {
    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');
    const pageNumbersContainer = document.getElementById('page-numbers');

    // 1. Update Prev/Next button states
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= Math.min(totalPages, 500);

    // 2. Clear and determine pages to display
    pageNumbersContainer.innerHTML = '';
    const maxPagesToShow = 5;
    const endLimit = Math.min(totalPages, 500);

    const startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    const endPage = Math.min(endLimit, startPage + maxPagesToShow - 1);

    const finalStartPage = Math.max(1, endPage - maxPagesToShow + 1);

    for (let i = finalStartPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        pageBtn.classList.add('page-number-btn');
        pageBtn.dataset.page = i;

        if (i === currentPage) {
            pageBtn.classList.add('active');
        }

        pageNumbersContainer.appendChild(pageBtn);
    }
}


// =================================================================
// 4. EVENT HANDLERS
// =================================================================

function setupHamburgerMenu() {
    const hamburgerBtn = document.querySelector('.hamburger-menu');
    const mainNav = document.querySelector('.main-nav');
    // Ensure the icon exists before querying its class list
    const hamburgerIcon = hamburgerBtn ? hamburgerBtn.querySelector('i') : null;

    if (hamburgerBtn && mainNav && hamburgerIcon) {
        hamburgerBtn.addEventListener('click', () => {
            mainNav.classList.toggle('active');

            if (mainNav.classList.contains('active')) {
                hamburgerIcon.classList.remove('fa-bars');
                hamburgerIcon.classList.add('fa-times');
            }

            else {
                hamburgerIcon.classList.remove('fa-times');
                hamburgerIcon.classList.add('fa-bars');
            }
        }

        );
    }
}

function setupVideoModal() {
    const modal = document.getElementById('video-modal');
    const closeBtn = document.querySelector('.close-btn');
    const videoPlayer = document.getElementById('video-player');

    // Function to close and clean up the video player
    function closeModal() {
        modal.style.display = 'none';
        videoPlayer.innerHTML = '';
    }

    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    }

    );

    // Event Delegation for Play Buttons
    document.addEventListener('click', async (e) => {
        const triggerBtn = e.target.closest('.trailer-trigger, .list-trailer-btn');

        if (triggerBtn) {
            const movieId = triggerBtn.dataset.movieId;
            if (!movieId) return console.warn("Movie ID not found on trailer button.");

            videoPlayer.innerHTML = '<p style="text-align: center; color: white;">Loading trailer...</p>';
            modal.style.display = 'block';

            const trailerKey = await fetchMovieTrailer(movieId);

            if (trailerKey) {
                const embedUrl = `${YOUTUBE_BASE_URL}${trailerKey}?autoplay=1&rel=0&showinfo=0&modestbranding=1`;
                videoPlayer.innerHTML = `<iframe src="${embedUrl}" frameborder="0"allow="autoplay; encrypted-media"allowfullscreen></iframe>`;
            }

            else {
                videoPlayer.innerHTML = '<p style="text-align: center; color: white;">Trailer not found for this movie.</p>';
            }
        }
    }

    );
}

function handlePaginatorClicks() {
    const paginatorContainer = document.querySelector('.pagination-container');
    if (!paginatorContainer) return; // Exit if the container isn't in the HTML

    paginatorContainer.addEventListener('click', async (e) => {
        let newPage = currentPage;
        let isPageChange = false;

        // Check Previous/Next Buttons
        if (e.target.closest('#prev-page-btn') && currentPage > 1) {
            newPage = currentPage - 1;
            isPageChange = true;
        }

        else if (e.target.closest('#next-page-btn') && currentPage < Math.min(totalPages, 500)) {
            newPage = currentPage + 1;
            isPageChange = true;
        }

        // Check Page Number Buttons
        else {
            const pageNumberBtn = e.target.closest('.page-number-btn');

            if (pageNumberBtn && !pageNumberBtn.classList.contains('active')) {
                newPage = parseInt(pageNumberBtn.dataset.page);
                isPageChange = true;
            }
        }

        if (isPageChange && newPage !== currentPage) {
            const movies = await fetchMovies(currentApiUrl, newPage, currentSearchQuery);

            renderMovies(movies);
            renderPaginator();

            const exploreTitle = document.querySelector('.explore-section h2');

            if (exploreTitle) exploreTitle.scrollIntoView({
                behavior: 'smooth'
            }

            );
        }
    }

    );
}

async function handleSearch(e) {
    e.preventDefault();

    const searchInput = document.getElementById('search-input');
    const query = searchInput.value.trim();
    const exploreTitle = document.querySelector('.explore-section h2');

    if (query === '') {
        currentApiUrl = POPULAR_MOVIES_URL;
        currentSearchQuery = '';
    }

    else {
        currentApiUrl = SEARCH_MOVIE_URL;
        currentSearchQuery = query;
    }

    currentPage = 1;

    const movies = await fetchMovies(currentApiUrl, currentPage, currentSearchQuery);

    // Update the main content area title
    if (exploreTitle) {
        exploreTitle.textContent = currentSearchQuery ? `Search Results for "${currentSearchQuery}"` : 'Explore Popular Movies';
    }

    renderMovies(movies);
    renderPaginator();

    if (movies.length > 0) {
        renderMovies(movies);
    }

    else {
        // FIX: Ensure you are selecting the container where movies are rendered.
        const movieListContainer = document.querySelector('.movie-list-container');
        movieListContainer.innerHTML = '<p class="no-results-message">No results found. Try a different movie title.</p>';
    }

    renderPaginator();

    if (exploreTitle) exploreTitle.scrollIntoView({
        behavior: 'smooth'
    }

    );

}

// =================================================================
// 5. INITIALIZATION
// =================================================================

async function init() {
    loadWatchlist();

    // 1. GENRES: Fetch and populate the Genre Map first
    await fetchGenres();

    // 2. FEATURED MOVIE: Fetch and render the latest movie for the hero section
    const featuredMovie = await fetchHeroMovie();

    if (featuredMovie) {
        renderHeroSection(featuredMovie);
    }
    const popularMovies = await fetchMovies(currentApiUrl, currentPage);

    if (popularMovies.length > 0) {
        renderMovies(popularMovies);
        renderPaginator();
    }
}

// =================================================================
// 6. MAIN EXECUTION
// =================================================================

document.addEventListener('DOMContentLoaded', () => {

    const movieGrid = document.querySelector('.movie-listings'); // Or your movie grid selector
    if (movieGrid) {
        movieGrid.addEventListener('click', (e) => {
            const movieCard = e.target.closest('.movie-card');
            // Ensure the click wasn't on a button inside the overlay
            const isOverlayBtn = e.target.closest('.overlay-btn');

            if (movieCard && !isOverlayBtn) {
                const movieId = movieCard.dataset.movieId;
                if (movieId) {
                    window.location.href = `movie-details.html?id=${movieId}`;
                }
            }
        });
    }
    init();
    const path = window.location.pathname;
    if (path.includes('gemini.html') || path === '/') {
        init();
    } else if (path.includes('movies.html')) {
        initMoviesPage(); // New function call
        setupCategoryFilter();
    }

    // 2. Setup UI components
    setupHamburgerMenu();
    setupVideoModal();

    // 3. Setup interactive handlers
    const searchForm = document.getElementById('search-form');

    if (searchForm) {
        searchForm.addEventListener('submit', handleSearch);
    }

    handlePaginatorClicks();
    setupWatchlistListeners();

    async function initMoviesPage() {
        // 1. GENRES: Fetch and populate the Genre Map
        await fetchGenres();

        // 2. MOVIE LISTS: Fetch and render the initial category (Popular)
        currentApiUrl = POPULAR_MOVIES_URL; // Ensure default is popular
        const popularMovies = await fetchMovies(currentApiUrl, currentPage);

        if (popularMovies.length > 0) {
            renderMovies(popularMovies);
            renderPaginator();
        }
    }
}

);

function loadWatchlist() {
    // Retrieve the watchlist from local storage
    const storedWatchlist = localStorage.getItem(WATCHLIST_STORAGE_KEY);
    // Parse the JSON string or default to an empty array
    watchlist = storedWatchlist ? JSON.parse(storedWatchlist) : [];
    console.log("Watchlist loaded:", watchlist);
}

function saveWatchlist() {
    // Save the current state of the watchlist array to local storage
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist));
    console.log("Watchlist saved:", watchlist);
}

function updateWatchlistButton(movieId, buttonElement) {
    if (!buttonElement) return;

    const isInWatchlist = watchlist.includes(String(movieId));

    if (isInWatchlist) {
        buttonElement.innerHTML = '<i class="fas fa-check"></i> Added';
        buttonElement.classList.add('added');
    } else {
        buttonElement.innerHTML = '<i class="fas fa-plus"></i>';
        buttonElement.classList.remove('added');
    }
}

function handleWatchlistClick(movieId) {
    const movieIdStr = String(movieId);
    const index = watchlist.indexOf(movieIdStr);
    let isRemoval = false;

    if (index > -1) {
        // Movie is already in the list: REMOVE it
        watchlist.splice(index, 1);
        alert(`Movie removed from Watchlist!`);
        isRemoval = true;
    } else {
        // Movie is NOT in the list: ADD it
        watchlist.push(movieIdStr);
        alert(`Movie added to Watchlist!`);
    }

    saveWatchlist();

    if (isRemoval && window.location.pathname.includes('watchlist.html')) {
        const cardToRemove = document.querySelector(`.movie-card[data-movie-id="${movieIdStr}"]`);
        if (cardToRemove) {
            cardToRemove.remove();

            // If the list is now empty, update the message
            if (watchlist.length === 0) {
                const grid = document.getElementById('watchlist-grid');
                if (grid) grid.innerHTML = '<p class="empty-message">Your watchlist is empty. Go back to the <a href="index.html">Home</a> page to add some movies! 🍿</p>';
            }
        }
    }

    document.querySelectorAll(`[data-id="${movieIdStr}"]`).forEach(btn => {
        updateWatchlistButton(movieIdStr, btn);
    });
}

function setupWatchlistListeners() {
    document.addEventListener('click', (e) => {
        const addBtn = e.target.closest('.add-btn');

        // Ensure it's the watchlist button and not the play button
        if (addBtn) {
            e.preventDefault(); // Stop default button action

            // The movie ID is stored in data-id for this button
            const movieId = addBtn.dataset.id;

            if (movieId) {
                handleWatchlistClick(movieId);
            }
        }
    });
}

function setupCategoryFilter() {
    const filterContainer = document.querySelector('.category-filter');
    if (!filterContainer) return; // Exit if not on the movies page

    filterContainer.addEventListener('click', async (e) => {
        const btn = e.target.closest('.filter-btn');
        if (!btn || btn.classList.contains('active')) return;

        // 1. Update Active State
        filterContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // 2. Determine New API URL
        const apiSegment = btn.dataset.apiUrl; // e.g., 'top_rated'
        let newApiUrl;

        switch (apiSegment) {
            case 'top_rated':
                newApiUrl = TOP_RATED_MOVIES_URL;
                break;
            case 'upcoming':
                newApiUrl = UPCOMING_MOVIES_URL;
                break;
            case 'now_playing':
                newApiUrl = NOW_PLAYING_URL;
                break;
            case 'popular':
            default:
                newApiUrl = POPULAR_MOVIES_URL;
                break;
        }

        // 3. Reset State and Fetch
        currentApiUrl = newApiUrl;
        currentSearchQuery = ''; // Clear any previous search state
        currentPage = 1;

        const movies = await fetchMovies(currentApiUrl, currentPage);

        // 4. Update View
        const exploreTitle = document.getElementById('movies-explore-title');
        if (exploreTitle) exploreTitle.textContent = btn.textContent + ' Movies'; // e.g., "Top Rated Movies"

        renderMovies(movies);
        renderPaginator();

        // Scroll to top
        exploreTitle.scrollIntoView({ behavior: 'smooth' });
    });
}
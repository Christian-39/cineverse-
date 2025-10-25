// movie-details.js

// Re-use constants from script.js (make sure script.js is loaded BEFORE this one)
// Or define them again if you want this file to be fully standalone
const TMDB_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIyMmU3NDM4NmNhNDM3YTc4M2E4MWM5N2JhZWU5NWEyZSIsIm5iZiI6MTY2MDgyNjk5MS4wNzUsInN1YiI6IjYyZmUzNTZmOTYzODY0MDA4M2VjZDY4MyIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.0M_YlL5R4CPuval3nA4o7pXhvObcRG_TO-mgkVN1-vU'; // NOTE: You should replace this token.
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/';
const POSTER_SIZE = 'w500';
const BACKDROP_SIZE = 'original';
const YOUTUBE_BASE_URL = 'https://www.youtube.com/embed/';
let genreMap = {}; // Will be populated by fetchGenres

// Helper to fetch data (similar to script.js but for details)
async function fetchData(url) {
    try {
        const options = {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${TMDB_TOKEN}`,
                'accept': 'application/json'
            }
        };
        const response = await fetch(url, options);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
    } catch (error) {
        console.error("Could not fetch data:", error);
        return null;
    }
}

// Fetch genres (needed for the details page too)
async function fetchGenres() {
    const GENRE_LIST_URL = `${TMDB_BASE_URL}/genre/movie/list`;
    const data = await fetchData(GENRE_LIST_URL);
    if (data && data.genres) {
        data.genres.forEach(genre => {
            genreMap[genre.id] = genre.name;
        });
    }
}

// Fetch movie details by ID
async function fetchMovieDetails(movieId) {
    const MOVIE_DETAILS_URL = `${TMDB_BASE_URL}/movie/${movieId}`;
    const data = await fetchData(MOVIE_DETAILS_URL);
    return data;
}

// Fetch movie cast by ID
async function fetchMovieCast(movieId) {
    const MOVIE_CAST_URL = `${TMDB_BASE_URL}/movie/${movieId}/credits`;
    const data = await fetchData(MOVIE_CAST_URL);
    return data ? data.cast : [];
}

// Render movie details
async function renderMovieDetails(movieId) {
    const movie = await fetchMovieDetails(movieId);
    if (!movie) {
        document.getElementById('movie-detail-section').innerHTML = '<p class="error-message">Movie details not found.</p>';
        return;
    }

    const cast = await fetchMovieCast(movieId);

    // --- Set Backdrop Image ---
    const backdropPath = movie.backdrop_path ? `${IMAGE_BASE_URL}${BACKDROP_SIZE}${movie.backdrop_path}` : '';
    const detailSection = document.getElementById('movie-detail-section');
    if (detailSection && backdropPath) {
        detailSection.style.backgroundImage = `url('${backdropPath}')`;
    }

    // --- Populate Elements ---
    document.getElementById('detail-poster').src = movie.poster_path ? `${IMAGE_BASE_URL}${POSTER_SIZE}${movie.poster_path}` : 'placeholder-image.jpg';
    document.getElementById('detail-poster').alt = `${movie.title} Poster`;
    document.getElementById('detail-title').textContent = movie.title;
    document.getElementById('detail-tagline').textContent = movie.tagline || '';
    document.getElementById('detail-overview').textContent = movie.overview || 'No synopsis available.';

    // Meta Info
    const releaseDate = movie.release_date ? new Date(movie.release_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';
    document.getElementById('detail-release-date').innerHTML = `<i class="fas fa-calendar-alt"></i> ${releaseDate}`;

    const genres = movie.genres.map(g => genreMap[g.id] || g.name).join(', ') || 'N/A';
    document.getElementById('detail-genres').innerHTML = `<i class="fas fa-tags"></i> ${genres}`;

    const runtime = movie.runtime ? `${movie.runtime} min` : 'N/A';
    document.getElementById('detail-runtime').innerHTML = `<i class="fas fa-clock"></i> ${runtime}`;

    const language = movie.spoken_languages && movie.spoken_languages.length > 0 ? movie.spoken_languages[0].english_name : 'N/A';
    document.getElementById('detail-language').innerHTML = `<i class="fas fa-language"></i> ${language}`;

    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
    document.getElementById('detail-rating').innerHTML = `<i class="fas fa-star"></i> ${rating}`;

    // Cast Info
    const castList = document.getElementById('detail-cast-list');
    castList.innerHTML = '';
    const topCast = cast.slice(0, 6); // Display top 6 cast members
    topCast.forEach(member => {
        const profilePath = member.profile_path ? `${IMAGE_BASE_URL}w185${member.profile_path}` : 'placeholder-profile.jpg';
        castList.innerHTML += `
            <div class="cast-member">
                <img src="${profilePath}" alt="${member.name}">
                <p>${member.name}</p>
                <p class="character">${member.character}</p>
            </div>
        `;
    });

    // Trailer Button
    const trailerBtn = document.getElementById('detail-trailer-btn');
    if (trailerBtn) {
        trailerBtn.dataset.movieId = movieId;
    }

    // Subtitle (TMDb doesn't directly provide subtitle files. This would be a placeholder.)
    // For now, we'll indicate if original language is English or if subtitles might be needed.
    // This is more conceptual for client-side. Real subtitle handling is complex.
    // document.getElementById('detail-subtitle-info').textContent = `Subtitles available: Depends on platform. Original Language: ${movie.original_language}.`;

    // Download button - placeholder functionality
    const downloadBtn = document.getElementById('detail-download-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            alert('Download functionality is not implemented in this demo.');
            // In a real app, this would link to a download service or API
        });
    }
}

// Function to setup the video modal on this page
// (Copied from script.js, ensures the modal works here too)
function setupVideoModal() {
    const modal = document.getElementById('video-modal');
    const closeBtn = document.querySelector('.close-btn');
    const videoPlayer = document.getElementById('video-player');
    const trailerBtn = document.getElementById('detail-trailer-btn');

    function closeModal() {
        modal.style.display = 'none';
        videoPlayer.innerHTML = '';
    }

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    if (trailerBtn) {
        trailerBtn.addEventListener('click', async (e) => {
            const movieId = e.currentTarget.dataset.movieId;
            if (!movieId) {
                console.warn("Movie ID not found on trailer button.");
                return;
            }

            videoPlayer.innerHTML = '<p style="text-align: center; color: white;">Loading trailer...</p>';
            modal.style.display = 'block';

            const trailerKey = await fetchMovieTrailer(movieId); // Use the fetchMovieTrailer from script.js

            if (trailerKey) {
                const embedUrl = `${YOUTUBE_BASE_URL}${trailerKey}?autoplay=1&rel=0&showinfo=0&modestbranding=1`;
                videoPlayer.innerHTML = `<iframe src="${embedUrl}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
            } else {
                videoPlayer.innerHTML = '<p style="text-align: center; color: white;">Trailer not found for this movie.</p>';
            }
        });
    }
}


// Initialization for the details page
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Get movie ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const movieId = urlParams.get('id');

    if (movieId) {
        await fetchGenres(); // Load genres first
        await renderMovieDetails(movieId);
        setupVideoModal(); // Setup modal for the detail page's trailer button
    } else {
        document.getElementById('movie-detail-section').innerHTML = '<p class="error-message">No movie ID provided.</p>';
    }

    // Setup Hamburger Menu (if you copy the navbar HTML, also need its JS)
    const hamburgerBtn = document.querySelector('.hamburger-menu');
    const mainNav = document.querySelector('.main-nav');
    const hamburgerIcon = hamburgerBtn ? hamburgerBtn.querySelector('i') : null;

    if (hamburgerBtn && mainNav && hamburgerIcon) {
        hamburgerBtn.addEventListener('click', () => {
            mainNav.classList.toggle('active');
            if (mainNav.classList.contains('active')) {
                hamburgerIcon.classList.remove('fa-bars');
                hamburgerIcon.classList.add('fa-times');
            } else {
                hamburgerIcon.classList.remove('fa-times');
                hamburgerIcon.classList.add('fa-bars');
            }
        });
    }
});

// movie-details.js (Add this function)

function setupReturnNavigation() {
    const backBtn = document.getElementById('back-to-explore-btn');

    if (backBtn) {
        backBtn.addEventListener('click', () => {
            // This method tells the browser to navigate back to the last page 
            // the user visited, preserving search state or pagination.
            window.history.back();
        });
    }
}


// movie-details.js (Update the DOMContentLoaded block)

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Get movie ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const movieId = urlParams.get('id');

    if (movieId) {
        await fetchGenres();
        await renderMovieDetails(movieId);
        setupVideoModal();
    } else {
        document.getElementById('movie-detail-section').innerHTML = '<p class="error-message">No movie ID provided.</p>';
    }

    // *** NEW: Setup the back button functionality ***
    setupReturnNavigation();

    // ... rest of the DOMContentLoaded logic (Hamburger Menu) ...
});
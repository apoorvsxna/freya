import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc 
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAeLglpIRWuoZ2jU5C_FZz_FVNSxRVL-A0",
  authDomain: "freya-39050.firebaseapp.com",
  projectId: "freya-39050",
  storageBucket: "freya-39050.firebasestorage.app",
  messagingSenderId: "572009497652",
  appId: "1:572009497652:web:015174737b8631813c7661",
  measurementId: "G-RW0PFV7N5R"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Global State
let currentSong = null;
let playlists = { 'Favorites': [] };
let currentPlaylist = null;
let recentlyPlayed = [];

// DOM Elements for Main App
const mainApp = document.getElementById('mainApp');
const searchInput = document.getElementById('searchInput');
const resultsContainer = document.getElementById('results');
const audioPlayer = document.getElementById('audioPlayer');
const nowPlayingImg = document.getElementById('nowPlayingImg');
const songTitleEl = document.getElementById('songTitle');
const artistNameEl = document.getElementById('artistName');
const likeButton = document.getElementById('likeButton');
const addToPlaylistButton = document.getElementById('addToPlaylistButton');
const createPlaylistButton = document.getElementById('createPlaylistButton');
const navSearch = document.getElementById('navSearch');
const navLibrary = document.getElementById('navLibrary');
const searchSection = document.getElementById('searchSection');
const librarySection = document.getElementById('librarySection');
const playlistsContainer = document.getElementById('playlists');
const playlistSongsContainer = document.getElementById('playlistSongs');
const backToPlaylistsButton = document.getElementById('backToPlaylists');
const progressBar = document.getElementById('progressBar');
const progressContainer = document.querySelector('.progress-container');
const progressIndicator = document.getElementById('progressIndicator');

// DOM Elements for Auth
const authSection = document.getElementById('authSection');
const loginButton = document.getElementById('loginButton');
const signupButton = document.getElementById('signupButton');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const logoutButton = document.getElementById('logoutButton');

// Toast function for notifications
function showToast(message) {
  const toast = document.createElement('div');
  toast.classList.add('toast');
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 300);
  }, 3000);
}

// Firebase Authentication Functions
function signUp(email, password) {
  createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      // Initialize user data in Firestore
      return setDoc(doc(db, "users", userCredential.user.uid), {
        playlists: { 'Favorites': [] },
        recentlyPlayed: []
      });
    })
    .catch(error => {
      console.error("Sign-up Error:", error);
      showToast(error.message);
    });
}

function login(email, password) {
  signInWithEmailAndPassword(auth, email, password)
    .catch(error => {
      console.error("Login Error:", error);
      showToast(error.message);
    });
}

function logout() {
  signOut(auth).catch(error => console.error("Logout Error:", error));
}

// Auth UI event listeners
loginButton.addEventListener("click", () => {
  const email = authEmail.value;
  const password = authPassword.value;
  login(email, password);
});

signupButton.addEventListener("click", () => {
  const email = authEmail.value;
  const password = authPassword.value;
  signUp(email, password);
});

logoutButton.addEventListener("click", () => {
  logout();
});

// Load and Save User Data from Firestore
async function loadUserData(uid) {
  const docRef = doc(db, "users", uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    playlists = data.playlists || { 'Favorites': [] };
    recentlyPlayed = data.recentlyPlayed || [];
    updateFrontPage();
    if (!librarySection.classList.contains('hidden')) {
      renderPlaylists();
    }
  } else {
    // If user document doesn't exist, initialize it.
    await setDoc(doc(db, "users", uid), {
      playlists: { 'Favorites': [] },
      recentlyPlayed: []
    });
  }
}

function saveUserData() {
  if (auth.currentUser) {
    const uid = auth.currentUser.uid;
    updateDoc(doc(db, "users", uid), {
      playlists: playlists,
      recentlyPlayed: recentlyPlayed
    }).catch(error => console.error("Save data error:", error));
  }
}

// Monitor Auth State
onAuthStateChanged(auth, user => {
  if (user) {
    // Show main app, hide auth section
    authSection.style.display = 'none';
    mainApp.style.display = 'block';
    logoutButton.style.display = 'block';
    loadUserData(user.uid);
  } else {
    // Show auth section, hide main app
    authSection.style.display = 'flex';
    mainApp.style.display = 'none';
    logoutButton.style.display = 'none';
  }
});

// Front Page Update (Recently Played)
function updateFrontPage() {
  const frontContainer = document.querySelector('.recently-played');
  frontContainer.innerHTML = '';
  recentlyPlayed.forEach(song => {
    const card = document.createElement('div');
    card.classList.add('song-card');
    card.innerHTML = `
      <img src="${song.img}" alt="${song.name}" loading="lazy">
      <div class="song-details">
        <p class="song-title">${song.name}</p>
        <p class="song-artist">${song.artist || getArtistName(song)}</p>
      </div>
    `;
    card.addEventListener('click', () => {
      playSong(song.id, song.name, song.img, song.artist || getArtistName(song));
    });
    frontContainer.appendChild(card);
  });
}

function addToRecentlyPlayed(song) {
  recentlyPlayed = recentlyPlayed.filter(s => s.id !== song.id);
  recentlyPlayed.unshift(song);
  if (recentlyPlayed.length > 10) recentlyPlayed.pop();
  saveUserData();
  updateFrontPage();
}

// Update Play/Pause Button Icon
function updatePlayPauseButton() {
  playPauseButton.innerHTML = audioPlayer.paused ? '<i class="fas fa-play"></i>' : '<i class="fas fa-pause"></i>';
}

// Media Session Controls
if ('mediaSession' in navigator) {
  navigator.mediaSession.setActionHandler('play', () => {
    audioPlayer.play();
    updatePlayPauseButton();
  });
  navigator.mediaSession.setActionHandler('pause', () => {
    audioPlayer.pause();
    updatePlayPauseButton();
  });
}

// Progress Bar Updates
audioPlayer.addEventListener('timeupdate', () => {
  if (!audioPlayer.duration) return;
  const percent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
  progressBar.style.width = `${percent}%`;
  progressIndicator.style.left = `${percent}%`;
});

// Seek Functionality
function updateAudioTime(e) {
  const rect = progressContainer.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const newTime = (clickX / rect.width) * audioPlayer.duration;
  audioPlayer.currentTime = newTime;
}
progressContainer.addEventListener('click', updateAudioTime);
let isDragging = false;
progressContainer.addEventListener('mousedown', e => {
  isDragging = true;
  updateAudioTime(e);
});
document.addEventListener('mousemove', e => {
  if (isDragging) updateAudioTime(e);
});
document.addEventListener('mouseup', () => {
  isDragging = false;
});

// Play/Pause Button
const playPauseButton = document.getElementById('playPauseButton');
playPauseButton.addEventListener('click', () => {
  audioPlayer.paused ? audioPlayer.play() : audioPlayer.pause();
  updatePlayPauseButton();
});
audioPlayer.addEventListener('play', updatePlayPauseButton);
audioPlayer.addEventListener('pause', updatePlayPauseButton);
audioPlayer.addEventListener('ended', () => {
  playPauseButton.innerHTML = '<i class="fas fa-play"></i>';
});

// Search Functionality & Auto-switch to Search Section
let searchTimeout;
searchInput.addEventListener('input', () => {
  document.getElementById('frontPage').classList.add('hidden');
  document.getElementById('librarySection').classList.add('hidden');
  searchSection.classList.remove('hidden');
  navSearch.classList.add('active');
  navLibrary.classList.remove('active');

  clearTimeout(searchTimeout);
  const query = searchInput.value.trim();
  if (query.length === 0) {
    resultsContainer.innerHTML = '';
    return;
  }
  resultsContainer.innerHTML = '<div class="loading-spinner"><div></div><div></div><div></div><div></div></div>';
  searchTimeout = setTimeout(() => fetchSongs(query), 500);
});

function fetchSongs(query) {
  const url = `https://saavn.dev/api/search/songs?query=${encodeURIComponent(query)}&limit=20`;
  fetch(url)
    .then(res => { if (!res.ok) throw new Error('Network error'); return res.json(); })
    .then(data => {
      if (data.success && data.data && data.data.results && data.data.results.length > 0) {
        displayResults(data.data.results);
      } else {
        resultsContainer.innerHTML = '<div class="no-results">No results found.</div>';
      }
    })
    .catch(err => {
      console.error(err);
      resultsContainer.innerHTML = '<div class="error-message">Error fetching results.</div>';
    });
}

function displayResults(songs) {
  resultsContainer.innerHTML = '';
  songs.forEach(song => {
    const imgUrl = getImageUrl(song);
    const artistName = getArtistName(song);
    const duration = formatDuration(song.duration);
    const card = document.createElement('div');
    card.classList.add('song-card');
    card.innerHTML = `
      <div class="song-info">
        <img src="${imgUrl}" alt="${song.name}" loading="lazy">
        <div class="song-details">
          <p class="song-title">${song.name}</p>
          <p class="song-artist">${artistName}</p>
        </div>
        <div class="song-duration">${duration}</div>
      </div>
    `;
    card.addEventListener('click', () => playSong(song.id, song.name, imgUrl, artistName));
    resultsContainer.appendChild(card);
  });
}

function getImageUrl(song) {
  if (song.image && song.image.length > 1) return song.image[1].url;
  else if (song.image && song.image.length > 0) return song.image[0].url;
  else return 'assets/default-cover.png';
}

function getArtistName(song) {
  let names = [];
  if (song.artists) {
    if (song.artists.primary && song.artists.primary.length > 0)
      names = names.concat(song.artists.primary.map(a => a.name));
    if (song.artists.featured && song.artists.featured.length > 0)
      names = names.concat(song.artists.featured.map(a => a.name));
  }
  return names.join(', ') || 'Unknown Artist';
}

function formatDuration(seconds) {
  if (!seconds) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Play Song Function
function playSong(songId, songName, imgUrl, artistName) {
  songTitleEl.textContent = "Loading...";
  artistNameEl.textContent = "";
  const url = `https://saavn.dev/api/songs/${songId}`;
  fetch(url)
    .then(res => res.json())
    .then(data => {
      if (data.success && data.data && data.data.length > 0) {
        const songData = data.data[0];
        const downloadUrls = songData.downloadUrl;
        let streamUrlObj = downloadUrls.find(u => u.quality === '320kbps') || downloadUrls[downloadUrls.length - 1];
        if (streamUrlObj && streamUrlObj.url) {
          currentSong = { id: songId, name: songName, artist: artistName, img: imgUrl, streamUrl: streamUrlObj.url };
          nowPlayingImg.src = currentSong.img;
          nowPlayingImg.classList.remove('hidden');
          songTitleEl.textContent = currentSong.name;
          artistNameEl.textContent = currentSong.artist;
          if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
              title: currentSong.name,
              artist: currentSong.artist,
              artwork: [{ src: currentSong.img }]
            });
          }
          updateLikeButtonState();
          audioPlayer.src = currentSong.streamUrl;
          audioPlayer.play().catch(e => {
            console.error(e);
            showToast('Playback failed.');
          });
          addToRecentlyPlayed(currentSong);
        } else {
          showToast('Stream URL not available.');
        }
      } else {
        showToast('Failed to fetch song details.');
      }
    })
    .catch(err => {
      console.error(err);
      showToast('Error fetching song details.');
    });
}

function updateLikeButtonState() {
  if (!currentSong) return;
  if (playlists.Favorites && playlists.Favorites.some(s => s.id === currentSong.id)) {
    likeButton.classList.add('active');
    likeButton.innerHTML = '<i class="fas fa-heart"></i>';
  } else {
    likeButton.classList.remove('active');
    likeButton.innerHTML = '<i class="far fa-heart"></i>';
  }
}

likeButton.addEventListener('click', () => {
  if (!currentSong) { showToast('No song playing.'); return; }
  if (playlists.Favorites && playlists.Favorites.some(s => s.id === currentSong.id)) {
    playlists.Favorites = playlists.Favorites.filter(s => s.id !== currentSong.id);
    likeButton.classList.remove('active');
    likeButton.innerHTML = '<i class="far fa-heart"></i>';
    showToast(`Removed "${currentSong.name}" from Favorites.`);
  } else {
    addSongToPlaylist('Favorites', currentSong);
    likeButton.classList.add('active');
    likeButton.innerHTML = '<i class="fas fa-heart"></i>';
    showToast(`Added "${currentSong.name}" to Favorites.`);
  }
  saveUserData();
  if (currentPlaylist === 'Favorites') renderPlaylistSongs('Favorites');
});

// Add to Playlist Modal
addToPlaylistButton.addEventListener('click', () => {
  if (!currentSong) { showToast('No song playing.'); return; }
  const playlistMenu = document.createElement('div');
  playlistMenu.classList.add('playlist-menu');
  const header = document.createElement('div');
  header.classList.add('playlist-menu-header');
  header.textContent = 'Add to Playlist';
  playlistMenu.appendChild(header);
  Object.keys(playlists).forEach(playlistName => {
    const option = document.createElement('div');
    option.classList.add('playlist-menu-item');
    option.textContent = playlistName;
    if (playlists[playlistName].some(s => s.id === currentSong.id)) {
      option.classList.add('already-added');
      option.textContent += ' (Added)';
    }
    option.addEventListener('click', () => {
      if (!playlists[playlistName].some(s => s.id === currentSong.id)) {
        addSongToPlaylist(playlistName, currentSong);
        showToast(`Added "${currentSong.name}" to "${playlistName}"`);
        if (currentPlaylist === playlistName) renderPlaylistSongs(playlistName);
      } else {
        showToast(`Song already in "${playlistName}"`);
      }
      document.body.removeChild(playlistMenu);
    });
    playlistMenu.appendChild(option);
  });
  const createOption = document.createElement('div');
  createOption.classList.add('playlist-menu-item', 'create-new');
  createOption.innerHTML = '<i class="fas fa-plus"></i> Create New Playlist';
  createOption.addEventListener('click', () => {
    document.body.removeChild(playlistMenu);
    promptNewPlaylist();
  });
  playlistMenu.appendChild(createOption);
  document.body.appendChild(playlistMenu);
  const buttonRect = addToPlaylistButton.getBoundingClientRect();
  playlistMenu.style.top = `${buttonRect.bottom + window.scrollY}px`;
  playlistMenu.style.left = `${buttonRect.left + window.scrollX}px`;
  setTimeout(() => {
    document.addEventListener('click', function closeMenu(e) {
      if (!playlistMenu.contains(e.target) && e.target !== addToPlaylistButton) {
        if (document.body.contains(playlistMenu)) {
          document.body.removeChild(playlistMenu);
        }
        document.removeEventListener('click', closeMenu);
      }
    });
  }, 10);
});

// Create New Playlist
createPlaylistButton.addEventListener('click', promptNewPlaylist);
function promptNewPlaylist() {
  const playlistName = prompt('Enter a name for your new playlist:');
  if (playlistName && playlistName.trim() !== '') {
    const trimmed = playlistName.trim();
    if (playlists[trimmed]) {
      showToast(`Playlist "${trimmed}" already exists.`);
      return;
    }
    playlists[trimmed] = [];
    saveUserData();
    showToast(`Created playlist "${trimmed}"`);
    if (!librarySection.classList.contains('hidden')) renderPlaylists();
    if (currentSong && confirm(`Add "${currentSong.name}" to "${trimmed}"?`)) {
      addSongToPlaylist(trimmed, currentSong);
      showToast(`Added "${currentSong.name}" to "${trimmed}"`);
    }
  }
}

function addSongToPlaylist(playlistName, song) {
  if (!playlists[playlistName]) playlists[playlistName] = [];
  if (!playlists[playlistName].find(s => s.id === song.id)) {
    playlists[playlistName].push(song);
    saveUserData();
    return true;
  }
  return false;
}

function renderPlaylists() {
  playlistsContainer.innerHTML = '';
  playlistSongsContainer.innerHTML = '';
  playlistSongsContainer.classList.add('hidden');
  backToPlaylistsButton.classList.add('hidden');
  currentPlaylist = null;
  Object.keys(playlists).forEach(playlistName => {
    const songCount = playlists[playlistName].length;
    const card = document.createElement('div');
    card.classList.add('playlist-card');
    let coverImage = 'assets/default-cover.png';
    if (playlists[playlistName].length > 0 && playlists[playlistName][0].img) {
      coverImage = playlists[playlistName][0].img;
    }
    card.innerHTML = `
      <div class="playlist-image">
        <img src="${coverImage}" alt="${playlistName}">
      </div>
      <div class="playlist-details">
        <h3>${playlistName}</h3>
        <p>${songCount} song${songCount !== 1 ? 's' : ''}</p>
      </div>
      ${playlistName !== 'Favorites' ? `<button class="delete-playlist" data-playlist="${playlistName}"><i class="fas fa-trash"></i></button>` : ''}
    `;
    card.addEventListener('click', (e) => {
      if (!e.target.closest('.delete-playlist')) renderPlaylistSongs(playlistName);
    });
    playlistsContainer.appendChild(card);
  });
  document.querySelectorAll('.delete-playlist').forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const playlistName = button.getAttribute('data-playlist');
      if (confirm(`Delete playlist "${playlistName}"?`)) {
        delete playlists[playlistName];
        saveUserData();
        renderPlaylists();
        showToast(`Deleted "${playlistName}"`);
      }
    });
  });
}

function renderPlaylistSongs(playlistName) {
  const songs = playlists[playlistName];
  currentPlaylist = playlistName;
  document.getElementById('emptyLibrary').classList.add('hidden');
  if (window.innerWidth < 600) {
    document.getElementById('playlistsSidebar').classList.add('hidden');
    backToPlaylistsButton.classList.remove('hidden');
  }
  playlistSongsContainer.classList.remove('hidden');
  playlistSongsContainer.innerHTML = `
    <div class="playlist-header">
      <h2>${playlistName}</h2>
      <p>${songs.length} song${songs.length !== 1 ? 's' : ''}</p>
    </div>
  `;
  if (songs.length === 0) {
    playlistSongsContainer.innerHTML += `
      <div class="empty-playlist">
        <p>No songs in this playlist.</p>
        <p>Search for songs and add them.</p>
      </div>
    `;
    return;
  }
  const songList = document.createElement('div');
  songList.classList.add('song-list');
  songs.forEach((song, index) => {
    const songItem = document.createElement('div');
    songItem.classList.add('song-item');
    if (currentSong && song.id === currentSong.id) songItem.classList.add('now-playing');
    songItem.innerHTML = `
      <div class="song-number">${index + 1}</div>
      <div class="song-info">
        <img src="${song.img}" alt="${song.name}">
        <div class="song-details">
          <p class="song-title">${song.name}</p>
          <p class="song-artist">${song.artist}</p>
        </div>
      </div>
      <button class="remove-song" data-index="${index}"><i class="fas fa-times"></i></button>
    `;
    songItem.addEventListener('click', (e) => {
      if (!e.target.closest('.remove-song')) playSong(song.id, song.name, song.img, song.artist);
    });
    songList.appendChild(songItem);
  });
  playlistSongsContainer.appendChild(songList);
  document.querySelectorAll('.remove-song').forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const index = parseInt(button.getAttribute('data-index'));
      const removedSong = playlists[playlistName].splice(index, 1)[0];
      saveUserData();
      renderPlaylistSongs(playlistName);
      if (playlistName === 'Favorites' && currentSong && removedSong.id === currentSong.id)
        updateLikeButtonState();
      showToast(`Removed "${removedSong.name}" from ${playlistName}`);
    });
  });
}

backToPlaylistsButton.addEventListener('click', () => {
  document.getElementById('playlistsSidebar').classList.remove('hidden');
  backToPlaylistsButton.classList.add('hidden');
  playlistSongsContainer.classList.add('hidden');
  document.getElementById('emptyLibrary').classList.remove('hidden');
});

// Navigation: Toggle Sections
navSearch.addEventListener('click', () => {
  searchSection.classList.remove('hidden');
  librarySection.classList.add('hidden');
  document.getElementById('frontPage').classList.add('hidden');
  navSearch.classList.add('active');
  navLibrary.classList.remove('active');
});
navLibrary.addEventListener('click', () => {
  searchSection.classList.add('hidden');
  librarySection.classList.remove('hidden');
  document.getElementById('frontPage').classList.add('hidden');
  navSearch.classList.remove('active');
  navLibrary.classList.add('active');
  renderPlaylists();
});
// Header Title: Show Front Page
document.querySelector('.app-title h1').addEventListener('click', () => {
  document.getElementById('frontPage').classList.remove('hidden');
  searchSection.classList.add('hidden');
  librarySection.classList.add('hidden');
  navSearch.classList.remove('active');
  navLibrary.classList.remove('active');
});

// Initial view
document.getElementById('frontPage').classList.remove('hidden');
searchSection.classList.add('hidden');
librarySection.classList.add('hidden');
updatePlayPauseButton();

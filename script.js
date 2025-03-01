document.addEventListener('DOMContentLoaded', () => {
    // Toast function for notifications
    function showToast(message) {
      const toast = document.createElement('div');
      toast.classList.add('toast');
      toast.textContent = message;
      document.body.appendChild(toast);
      // Animate in after a short delay
      setTimeout(() => {
        toast.classList.add('show');
      }, 10);
      // Remove after 3 seconds
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
          if (document.body.contains(toast)) {
            document.body.removeChild(toast);
          }
        }, 300);
      }, 3000);
    }
  
    // DOM Elements
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
  
    // Global State
    let currentSong = null;
    let playlists = { 'Favorites': [] };
    let currentPlaylist = null;
    let recentlyPlayed = [];
  
    // Load Playlists & Recently Played from localStorage
    function loadPlaylists() {
      const stored = localStorage.getItem('musicAppPlaylists');
      if (stored) {
        try {
          playlists = JSON.parse(stored);
        } catch (e) {
          console.error('Error parsing playlists:', e);
          playlists = { 'Favorites': [] };
          savePlaylists();
        }
      } else {
        savePlaylists();
      }
    }
    function savePlaylists() {
      localStorage.setItem('musicAppPlaylists', JSON.stringify(playlists));
    }
    function loadRecentlyPlayed() {
      const storedRecent = localStorage.getItem('recentlyPlayed');
      if (storedRecent) {
        recentlyPlayed = JSON.parse(storedRecent);
        updateFrontPage();
      }
    }
    function saveRecentlyPlayed() {
      localStorage.setItem('recentlyPlayed', JSON.stringify(recentlyPlayed));
    }
  
    // Front Page Update (Recently Played)
    function updateFrontPage() {
      const frontContainer = document.querySelector('.recently-played');
      frontContainer.innerHTML = '';
      recentlyPlayed.forEach(song => {
        const card = document.createElement('div');
        card.classList.add('song-card');
        // Use stored artist string if available
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
      saveRecentlyPlayed();
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
      // Auto-switch view
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
      savePlaylists();
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
        savePlaylists();
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
        savePlaylists();
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
        let coverImage = 'assets/default-playlist.png';
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
            savePlaylists();
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
          savePlaylists();
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
  
    // Initial Load
    loadPlaylists();
    loadRecentlyPlayed();
    document.getElementById('frontPage').classList.remove('hidden');
    searchSection.classList.add('hidden');
    librarySection.classList.add('hidden');
    updatePlayPauseButton();
  });
  
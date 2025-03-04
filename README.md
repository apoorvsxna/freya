# Freya: Minimal Music App

Freya is a minimal music streaming web application that allows you to search for songs, play music, and manage playlists. It leverages Firebase for user authentication (email/password) and Firestore for storing user-specific data (playlists and recently played tracks). The app uses the JioSaavn API for music search and streaming.

## Features

- **User Authentication:** Secure login and sign-up with Firebase Authentication.
- **Firestore Integration:** Store and retrieve user playlists and recently played songs.
- **Music Search & Playback:** Search for songs using the Saavn API and stream music.
- **Playlist Management:** Create, update, and delete playlists, and add or remove songs.
- **Responsive Design:** Optimized for both desktop and mobile devices.

## How It Works

1. **Firebase Initialization:**  
   The app initializes Firebase with your configuration. It connects to Firebase Authentication and Firestore to manage user sessions and data.

2. **User Authentication:**  
   When the app loads, users are prompted to log in or sign up via email and password. Once authenticated, the app loads the user's playlists and recently played songs from Firestore.

3. **Data Storage:**  
   User-specific data is stored in a Firestore document identified by the user’s UID. Updates to playlists and recently played tracks are automatically saved to Firestore.

4. **Music Playback:**  
   The Saavn API is used to search for and stream songs. The UI is designed to be responsive and user-friendly.

## Setup and Installation

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/yourusername/freya.git
   cd freya
